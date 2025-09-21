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

  // Enhanced function to generate single elimination bracket with proper pairing
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

    // Find the next lower power of 2 for the main bracket
    let targetSize = 2;
    while (targetSize * 2 <= numParticipants) {
      targetSize *= 2;
    }

    // Calculate excess participants that need pre-matches
    const excessParticipants = numParticipants - targetSize;
    const preMatchCount = excessParticipants;
    const participantsInPreMatches = excessParticipants * 2;

    let roundNumber = 1;

    // 1) Pre-rounds for excess participants (highest numbered participants compete)
    if (excessParticipants > 0) {
      // Get the participants that will compete in pre-matches
      const preMatchParticipants = participantIds.slice(-participantsInPreMatches);
      
      for (let match = 1; match <= preMatchCount; match++) {
        // Apply the correct pairing: first half vs second half
        const participant1Index = match - 1;
        const participant2Index = participant1Index + preMatchCount;
        
        matches.push({
          round: roundNumber,
          matchNumber: match,
          participant1Id: preMatchParticipants[participant1Index] || null,
          participant2Id: preMatchParticipants[participant2Index] || null,
          isPreRound: true,
        });
      }
      roundNumber++;
    }

    // 2) Main bracket using the correct pairing pattern
    const safeParticipants = participantIds.slice(0, targetSize - excessParticipants);
    
    // First main round with proper pairing pattern
    const matchesInFirstRound = targetSize / 2;
    for (let match = 1; match <= matchesInFirstRound; match++) {
      let participant1Id: string | null = null;
      let participant2Id: string | null = null;

      // Apply pairing pattern: participant i with participant (i + n/2)
      const idx1 = match - 1;
      const idx2 = idx1 + matchesInFirstRound;

      if (idx1 < safeParticipants.length) {
        participant1Id = safeParticipants[idx1];
      }
      
      if (idx2 < safeParticipants.length) {
        participant2Id = safeParticipants[idx2];
      } else {
        // This is a TBD slot - will be filled by pre-match winner
        participant2Id = null;
      }

      matches.push({
        round: roundNumber,
        matchNumber: match,
        participant1Id,
        participant2Id,
      });
    }

    // 3) Subsequent rounds (all TBD until winners advance)
    roundNumber++;
    let currentParticipants = matchesInFirstRound;
    while (currentParticipants > 1) {
      const matchesInRound = Math.floor(currentParticipants / 2);
      for (let match = 1; match <= matchesInRound; match++) {
        matches.push({
          round: roundNumber,
          matchNumber: match,
          participant1Id: null,
          participant2Id: null,
        });
      }
      currentParticipants = Math.floor(currentParticipants / 2);
      roundNumber++;
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
      const tournamentId = completedMatch.tournament_id;
      const nextRound = currentRound + 1;

      // Get all matches of the next round
      const { data: nextRoundMatches, error: nextErr } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round_number', nextRound)
        .order('match_number', { ascending: true });

      if (nextErr || !nextRoundMatches || nextRoundMatches.length === 0) return;

      let targetMatch: any = null;
      let updateField: 'participant1_id' | 'participant2_id' = 'participant1_id';

      // Pre-round if we're in round 1 and next round has TBD slots
      const hasTbdInNextRound = nextRoundMatches.some((m) => !m.participant1_id || !m.participant2_id);
      const isPreRound = currentRound === 1 && hasTbdInNextRound;

      if (isPreRound) {
        // Find all TBD slots in the next round and assign pre-match winners based on seeding
        const tbdSlots = nextRoundMatches
          .filter((m) => !m.participant1_id || !m.participant2_id)
          .sort((a, b) => a.match_number - b.match_number);
        
        if (tbdSlots.length > 0 && currentMatchNumber <= tbdSlots.length) {
          // Pre-match winners advance to TBD slots in order based on their seeding
          // Pre-match 1 (highest seed) gets first TBD slot, etc.
          targetMatch = tbdSlots[currentMatchNumber - 1];
          if (targetMatch) {
            updateField = !targetMatch.participant1_id ? 'participant1_id' : 'participant2_id';
          }
        }
      } else {
        // Regular advancement mapping
        const nextMatchNumber = Math.ceil(currentMatchNumber / 2);
        targetMatch = nextRoundMatches.find((m) => m.match_number === nextMatchNumber);
        if (!targetMatch) return;

        const preferredField: 'participant1_id' | 'participant2_id' =
          currentMatchNumber % 2 === 1 ? 'participant1_id' : 'participant2_id';

        if (!targetMatch[preferredField]) {
          updateField = preferredField;
        } else if (!targetMatch[preferredField === 'participant1_id' ? 'participant2_id' : 'participant1_id']) {
          updateField = preferredField === 'participant1_id' ? 'participant2_id' : 'participant1_id';
        } else {
          // Both slots already filled
          return;
        }
      }

      if (!targetMatch) return;

      const updateData: any = { [updateField]: winnerId };

      // If both participants are now set, mark as scheduled
      const afterP1 = updateField === 'participant1_id' ? winnerId : targetMatch.participant1_id;
      const afterP2 = updateField === 'participant2_id' ? winnerId : targetMatch.participant2_id;
      if (afterP1 && afterP2) updateData.status = 'scheduled';

      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', targetMatch.id);

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
        
        // Auto-regenerate brackets if they were already generated
        if (tournament?.currentStage === 'elimination_stage') {
          await regenerateBracket(tournamentId);
        }
      }
    } catch (error) {
      console.error('Error adding more participants:', error);
      throw error;
    }
  };

  const removeParticipants = async (tournamentId: string, participantIds: string[]) => {
    try {
      // Remove participants from tournament
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .in('id', participantIds);

      if (error) throw error;

      // Reload tournament data
      if (tournament?.eventId) {
        await loadTournament(tournament.eventId);
        
        // Auto-regenerate brackets if they were already generated
        if (tournament?.currentStage === 'elimination_stage') {
          await regenerateBracket(tournamentId);
        }
      }

      toast.success(`${participantIds.length} participants removed successfully!`);
    } catch (error) {
      console.error('Error removing participants:', error);
      toast.error('Failed to remove participants');
      throw error;
    }
  };

  const editMatchResult = async (matchId: string, participant1Score: number, participant2Score: number, winnerId: string) => {
    try {
      // Get the match details before updating
      const { data: match, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !match) throw matchError;

      const oldWinnerId = match.winner_id;

      // Update the match result
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

      // If winner changed, handle advancement properly
      if (oldWinnerId !== winnerId) {
        // Remove old winner from next round and reset dependent matches
        await removeOldWinnerAndResetMatches(matchId, oldWinnerId);
        
        // Advance new winner to next round
        await advanceWinnerToNextRound(matchId, winnerId);
      }

      await loadTournament(tournament?.eventId || '');
      toast.success('Match result updated successfully!');
    } catch (error) {
      console.error('Error editing match result:', error);
      toast.error('Failed to edit match result');
      throw error;
    }
  };

  const removeOldWinnerAndResetMatches = async (matchId: string, oldWinnerId: string | null) => {
    try {
      if (!oldWinnerId) return;

      // Get the completed match details
      const { data: completedMatch, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !completedMatch) return;

      const tournamentId = completedMatch.tournament_id;
      const currentRound = completedMatch.round_number;
      const currentMatchNumber = completedMatch.match_number;

      // Find the next round match where the old winner was placed
      const { data: nextRoundMatches, error: nextErr } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round_number', currentRound + 1)
        .order('match_number', { ascending: true });

      if (nextErr || !nextRoundMatches) return;

      // Find which match contains the old winner
      const affectedMatch = nextRoundMatches.find(m => 
        m.participant1_id === oldWinnerId || m.participant2_id === oldWinnerId
      );

      if (affectedMatch) {
        // Remove the old winner from the next round match
        const updateData: any = {};
        if (affectedMatch.participant1_id === oldWinnerId) {
          updateData.participant1_id = null;
        }
        if (affectedMatch.participant2_id === oldWinnerId) {
          updateData.participant2_id = null;
        }

        // If the match was completed, reset it
        if (affectedMatch.status === 'completed') {
          updateData.participant1_score = null;
          updateData.participant2_score = null;
          updateData.winner_id = null;
          updateData.completed_time = null;
        }

        // Update status based on remaining participants
        const remainingP1 = updateData.participant1_id !== null ? updateData.participant1_id : 
          (affectedMatch.participant1_id !== oldWinnerId ? affectedMatch.participant1_id : null);
        const remainingP2 = updateData.participant2_id !== null ? updateData.participant2_id : 
          (affectedMatch.participant2_id !== oldWinnerId ? affectedMatch.participant2_id : null);

        if (!remainingP1 && !remainingP2) {
          updateData.status = 'awaiting';
        } else if (remainingP1 && remainingP2) {
          updateData.status = 'scheduled';
        } else {
          updateData.status = 'awaiting';
        }

        await supabase
          .from('tournament_matches')
          .update(updateData)
          .eq('id', affectedMatch.id);

        // If the affected match was completed, reset all subsequent matches
        if (affectedMatch.status === 'completed') {
          await supabase
            .from('tournament_matches')
            .update({
              participant1_id: null,
              participant2_id: null,
              participant1_score: null,
              participant2_score: null,
              winner_id: null,
              status: 'awaiting',
              completed_time: null
            })
            .eq('tournament_id', tournamentId)
            .gt('round_number', currentRound + 1);
        }
      }
    } catch (error) {
      console.error('Error removing old winner and resetting matches:', error);
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

  const reorderParticipants = async (tournamentId: string, newOrder: TournamentParticipant[]) => {
    try {
      // Update seed numbers based on new order
      const updates = newOrder.map((participant, index) => 
        supabase
          .from('tournament_participants')
          .update({ seed_number: index + 1 })
          .eq('id', participant.id)
      );

      await Promise.all(updates);
      
      // Reload tournament data
      if (tournament?.eventId) {
        await loadTournament(tournament.eventId);
      }
      
      toast.success('Participants reordered successfully');
    } catch (error) {
      console.error('Error reordering participants:', error);
      toast.error('Failed to reorder participants');
      throw error;
    }
  };

  const regenerateBracket = async (tournamentId: string) => {
    try {
      // Delete existing matches
      await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      // Generate new bracket with current participant order
      await generateTournamentBracket(tournamentId);
      
      toast.success('Tournament bracket regenerated');
    } catch (error) {
      console.error('Error regenerating bracket:', error);
      toast.error('Failed to regenerate bracket');
      throw error;
    }
  };

  return {
    tournament,
    matches,
    participants,
    loading,
    createTournament,
    updateMatchResult,
    editMatchResult,
    addMoreParticipants,
    removeParticipants,
    generateTournamentBracket,
    reorderParticipants,
    regenerateBracket,
    refetch: loadTournament
  };
};