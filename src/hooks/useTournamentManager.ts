import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tournament, TournamentConfig, TournamentMatch, TournamentParticipant } from '@/types/tournament';
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

  const createTournament = async (eventId: string, config: TournamentConfig) => {
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

  const addParticipants = async (playerIds: string[]) => {
    if (!tournament) throw new Error('Tournament not found');

    try {
      const participantsToAdd = playerIds.map((playerId, index) => ({
        tournament_id: tournament.id,
        player_id: playerId,
        seed_number: index + 1
      }));

      const { error } = await supabase
        .from('tournament_participants')
        .insert(participantsToAdd);

      if (error) throw error;

      await loadTournament(tournament.eventId);
      toast.success(`${playerIds.length} participants added successfully!`);
    } catch (error) {
      console.error('Error adding participants:', error);
      toast.error('Failed to add participants');
      throw error;
    }
  };

  const generateBrackets = async () => {
    if (!tournament) throw new Error('Tournament not found');

    try {
      // This would contain the bracket generation logic
      // For now, we'll just update the stage
      const { error } = await supabase
        .from('tournaments')
        .update({
          current_stage: tournament.stageConfig.tournamentType === 'double_stage' ? 'group_stage' : 'elimination_stage'
        })
        .eq('id', tournament.id);

      if (error) throw error;

      await loadTournament(tournament.eventId);
      toast.success('Brackets generated successfully!');
    } catch (error) {
      console.error('Error generating brackets:', error);
      toast.error('Failed to generate brackets');
      throw error;
    }
  };

  const updateMatchResult = async (matchId: string, participant1Score: number, participant2Score: number, winnerId: string) => {
    try {
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

      await loadTournament(tournament?.eventId || '');
      toast.success('Match result updated successfully!');
    } catch (error) {
      console.error('Error updating match result:', error);
      toast.error('Failed to update match result');
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
    addParticipants,
    generateBrackets,
    updateMatchResult,
    refetch: loadTournament
  };
};