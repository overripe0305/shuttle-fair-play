import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TournamentConfig, Tournament, TournamentMatch, TournamentParticipant, TournamentPair } from '@/types/tournament';
import { toast } from 'sonner';

export const useTournamentManager = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTournament = useCallback(async (eventId: string) => {
    if (!eventId) return;

    setLoading(true);
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (tournamentError) throw tournamentError;

      if (tournamentData) {
        setTournament({
          id: tournamentData.id,
          eventId: tournamentData.event_id,
          tournamentType: tournamentData.tournament_type as any,
          stageConfig: (tournamentData.stage_config as any) || {},
          currentStage: tournamentData.current_stage as any,
          participants: [],
          brackets: (tournamentData.brackets as any) || {},
          createdAt: new Date(tournamentData.created_at),
          updatedAt: new Date(tournamentData.updated_at)
        });

        // Load participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('tournament_participants')
          .select(`
            *,
            players(name)
          `)
          .eq('tournament_id', tournamentData.id)
          .order('seed_number', { ascending: true });

        if (participantsError) throw participantsError;

        const tournamentParticipants = participantsData?.map(p => ({
          id: p.id,
          tournamentId: p.tournament_id,
          playerId: p.player_id,
          playerName: (p.players as any)?.name || 'Unknown Player',
          seedNumber: p.seed_number,
          groupId: p.group_id,
          eliminatedAt: p.eliminated_at ? new Date(p.eliminated_at) : undefined,
          finalPosition: p.final_position,
          wins: p.wins,
          losses: p.losses,
          pointsFor: p.points_for,
          pointsAgainst: p.points_against
        })) || [];

        setParticipants(tournamentParticipants);

        // Load matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentData.id)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true });

        if (matchesError) throw matchesError;

        const tournamentMatches = matchesData?.map(m => {
          const participant1 = tournamentParticipants.find(p => p.id === m.participant1_id);
          const participant2 = tournamentParticipants.find(p => p.id === m.participant2_id);
          
          return {
            id: m.id,
            tournamentId: m.tournament_id,
            stage: m.stage as any,
            roundNumber: m.round_number,
            matchNumber: m.match_number,
            participant1Id: m.participant1_id,
            participant2Id: m.participant2_id,
            participant1Score: m.participant1_score,
            participant2Score: m.participant2_score,
            winnerId: m.winner_id,
            status: m.status as any,
            scheduledTime: m.scheduled_time ? new Date(m.scheduled_time) : undefined,
            completedTime: m.completed_time ? new Date(m.completed_time) : undefined,
            groupId: m.group_id,
            bracketPosition: m.bracket_position,
            participant1Name: participant1?.playerName,
            participant2Name: participant2?.playerName
          };
        }) || [];

        setMatches(tournamentMatches);
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTournament = async (eventId: string, config: TournamentConfig, playerIds: string[], pairs?: TournamentPair[]) => {
    if (!eventId) throw new Error('Event ID is required');

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          event_id: eventId,
          tournament_type: config.tournamentType,
          stage_config: config as any,
          current_stage: 'setup'
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants to the tournament
      if (config.playFormat === 'doubles' && pairs) {
        await addPairsToTournament(data.id, pairs);
      } else {
        await addParticipants(data.id, playerIds);
      }

      // Also update the event to mark it as tournament type
      await supabase
        .from('events')
        .update({
          event_type: 'tournament',
          tournament_config: config as any
        })
        .eq('id', eventId);

      await loadTournament(eventId);
      toast.success('Tournament created successfully!');
      return data;
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament');
      throw error;
    }
  };

  const addParticipants = async (tournamentId: string, playerIds: string[]) => {
    try {
      const participantsToAdd = playerIds.map((playerId, index) => ({
        tournament_id: tournamentId,
        player_id: playerId,
        seed_number: index + 1
      }));

      const { error } = await supabase
        .from('tournament_participants')
        .insert(participantsToAdd);

      if (error) throw error;

      toast.success(`${playerIds.length} participants added successfully!`);
    } catch (error) {
      console.error('Error adding participants:', error);
      toast.error('Failed to add participants');
      throw error;
    }
  };

  const addPairsToTournament = async (tournamentId: string, pairs: TournamentPair[]) => {
    try {
      const participantsToAdd = pairs.flatMap((pair, pairIndex) => [
        {
          tournament_id: tournamentId,
          player_id: pair.player1Id,
          seed_number: pairIndex * 2 + 1,
          group_id: `pair_${pair.id}`
        },
        {
          tournament_id: tournamentId,
          player_id: pair.player2Id,
          seed_number: pairIndex * 2 + 2,
          group_id: `pair_${pair.id}`
        }
      ]);

      const { error } = await supabase
        .from('tournament_participants')
        .insert(participantsToAdd);

      if (error) throw error;

      toast.success(`${pairs.length} pairs added successfully!`);
    } catch (error) {
      console.error('Error adding pairs:', error);
      toast.error('Failed to add pairs');
      throw error;
    }
  };

  const generateBrackets = async (tournamentId: string, participantIds: string[]) => {
    try {
      // Generate complete single elimination bracket structure
      const allMatches = generateCompleteSingleEliminationBracket(participantIds);
      
      // Insert all matches into database
      const matchesToInsert = allMatches.map((match) => ({
        tournament_id: tournamentId,
        stage: 'elimination_stage' as const,
        round_number: match.round,
        match_number: match.matchNumber,
        participant1_id: match.participant1Id || null,
        participant2_id: match.participant2Id || null,
        status: 'scheduled' as const,
        bracket_position: `R${match.round}M${match.matchNumber}`
      }));

      if (matchesToInsert.length > 0) {
        const { error: matchError } = await supabase
          .from('tournament_matches')
          .insert(matchesToInsert);

        if (matchError) throw matchError;
      }

      // Update tournament stage
      const { error } = await supabase
        .from('tournaments')
        .update({
          current_stage: 'elimination_stage'
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast.success('Tournament bracket created successfully!');
    } catch (error) {
      console.error('Error generating brackets:', error);
      toast.error('Failed to generate brackets');
      throw error;
    }
  };

  // Enhanced function to generate single elimination bracket with pre-rounds
  const generateCompleteSingleEliminationBracket = (participantIds: string[]) => {
    const matches: Array<{
      round: number;
      matchNumber: number;
      participant1Id: string | null;
      participant2Id: string | null;
      isPreRound?: boolean;
    }> = [];

    const numParticipants = participantIds.length;
    if (numParticipants < 2) return matches;

    // Define target sizes for each stage
    const targetSizes = [64, 32, 16, 8, 4, 2];
    let targetIndex = targetSizes.findIndex(size => size <= numParticipants);
    if (targetIndex === -1) targetIndex = targetSizes.length - 1;

    let currentParticipants = numParticipants;
    let roundNumber = 1;
    let availableParticipants = [...participantIds];

    while (currentParticipants > 1) {
      const targetSize = targetSizes[targetIndex] || 1;
      
      if (currentParticipants > targetSize) {
        // Generate pre-round matches
        const excessParticipants = currentParticipants - targetSize;
        const preRoundMatches = excessParticipants;
        
        for (let match = 1; match <= preRoundMatches; match++) {
          // Take participants from the end (lower seeds) for pre-rounds
          const participant1 = availableParticipants[availableParticipants.length - 2] || null;
          const participant2 = availableParticipants[availableParticipants.length - 1] || null;
          
          if (participant1 && participant2) {
            matches.push({
              round: roundNumber,
              matchNumber: match,
              participant1Id: participant1,
              participant2Id: participant2,
              isPreRound: true
            });
            
            // Remove the two participants and add back the "winner slot"
            availableParticipants.splice(availableParticipants.length - 2, 2);
          }
        }
        
        currentParticipants = targetSize;
        roundNumber++;
      }
      
      // Generate regular round matches
      if (currentParticipants > 1) {
        const matchesInRound = Math.floor(currentParticipants / 2);
        
        for (let match = 1; match <= matchesInRound; match++) {
          if (roundNumber === 1 || (roundNumber > 1 && availableParticipants.length >= 2)) {
            // First round or subsequent rounds with available participants
            const participant1Index = (match - 1) * 2;
            const participant2Index = participant1Index + 1;
            
            const participant1 = availableParticipants[participant1Index] || null;
            const participant2 = availableParticipants[participant2Index] || null;

            matches.push({
              round: roundNumber,
              matchNumber: match,
              participant1Id: participant1,
              participant2Id: participant2
            });
          } else {
            // Empty matches for subsequent rounds
            matches.push({
              round: roundNumber,
              matchNumber: match,
              participant1Id: null,
              participant2Id: null
            });
          }
        }
        
        currentParticipants = Math.floor(currentParticipants / 2);
        if (roundNumber === 1) {
          // For subsequent rounds, we'll have winners advancing
          availableParticipants = [];
        }
      }
      
      roundNumber++;
      targetIndex++;
    }

    return matches;
  };

  const updateMatchResult = async (matchId: string, participant1Score: number, participant2Score: number, winnerId: string) => {
    try {
      // Update the completed match
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          participant1_score: participant1Score,
          participant2_score: participant2Score,
          winner_id: winnerId,
          status: 'completed',
          completed_time: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;

      // Advance winner to next round
      await advanceWinnerToNextRound(matchId, winnerId);

      await loadTournament(tournament?.eventId || '');
      toast.success('Match result updated successfully!');
    } catch (error) {
      console.error('Error updating match result:', error);
      toast.error('Failed to update match result');
      throw error;
    }
  };

  const advanceWinnerToNextRound = async (completedMatchId: string, winnerId: string) => {
    try {
      // Get the completed match details
      const { data: completedMatch, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', completedMatchId)
        .single();

      if (matchError || !completedMatch) return;

      const currentRound = completedMatch.round_number;
      const currentMatchNumber = completedMatch.match_number;
      const nextRound = currentRound + 1;
      
      // Calculate which match in the next round this winner should advance to
      const nextMatchNumber = Math.ceil(currentMatchNumber / 2);

      // Find the next round match
      const { data: nextMatches, error: nextMatchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', completedMatch.tournament_id)
        .eq('round_number', nextRound)
        .eq('match_number', nextMatchNumber);

      if (nextMatchError || !nextMatches || nextMatches.length === 0) return;

      const nextMatch = nextMatches[0];
      
      // Determine if winner goes to participant1 or participant2 slot
      const isOddMatch = currentMatchNumber % 2 === 1;
      const updateField = isOddMatch ? 'participant1_id' : 'participant2_id';
      
      // Update the next round match with the winner
      const updateData: any = { [updateField]: winnerId };
      
      // If both participants are now set, change status to scheduled
      if ((updateField === 'participant1_id' && nextMatch.participant2_id) || 
          (updateField === 'participant2_id' && nextMatch.participant1_id)) {
        updateData.status = 'scheduled';
      }

      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', nextMatch.id);

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Error advancing winner:', error);
    }
  };

  const addMoreParticipants = async (tournamentId: string, playerIds: string[]) => {
    try {
      await addParticipants(tournamentId, playerIds);
      
      // Reload tournament data
      if (tournament?.eventId) {
        await loadTournament(tournament.eventId);
      }
    } catch (error) {
      console.error('Error adding more participants:', error);
      throw error;
    }
  };

  const generateTournamentBracket = async (tournamentId: string, customOrder?: string[] | TournamentPair[]) => {
    if (!tournament) throw new Error('No tournament found');
    
    try {
      let participantIds: string[];
      
      if (customOrder) {
        if (typeof customOrder[0] === 'string') {
          // Singles tournament with custom order
          participantIds = customOrder as string[];
        } else {
          // Doubles tournament - need to get participant IDs for pairs
          const pairs = customOrder as TournamentPair[];
          const allParticipantIds: string[] = [];
          
          for (const pair of pairs) {
            const pairParticipants = participants.filter(p => 
              p.playerId === pair.player1Id || p.playerId === pair.player2Id
            );
            allParticipantIds.push(...pairParticipants.map(p => p.id));
          }
          
          participantIds = allParticipantIds;
        }
      } else {
        // Use existing order
        participantIds = participants.map(p => p.id);
      }
      
      if (participantIds.length < 2) {
        throw new Error('At least 2 participants are required to generate brackets');
      }
      
      // Generate brackets using existing function
      await generateBrackets(tournamentId, participantIds);
      
      // Update tournament stage to indicate brackets are generated
      await supabase
        .from('tournaments')
        .update({ current_stage: 'elimination_stage' })
        .eq('id', tournamentId);
      
      // Reload tournament data to reflect changes
      await loadTournament(tournament.eventId);
      
      toast.success('Tournament bracket generated successfully!');
    } catch (error) {
      console.error('Error generating bracket:', error);
      toast.error('Failed to generate tournament bracket');
      throw error;
    }
  };

  // Remove the useEffect that automatically loads on mount
  // Tournament will be loaded when createTournament is called

  return {
    tournament,
    matches,
    participants,
    loading,
    createTournament,
    updateMatchResult,
    addMoreParticipants,
    generateTournamentBracket,
    refetch: loadTournament
  };
};