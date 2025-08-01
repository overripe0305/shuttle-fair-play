import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GameMatch } from '@/types/player';

export interface WaitingMatch {
  id: string;
  eventId: string;
  player1Id: string;
  player2Id: string;
  player3Id: string;
  player4Id: string;
  matchData: GameMatch;
  createdAt: Date;
}

export function useWaitingMatchManager(eventId?: string) {
  const [waitingMatches, setWaitingMatches] = useState<WaitingMatch[]>([]);

  useEffect(() => {
    if (eventId) {
      loadWaitingMatches();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('waiting-matches-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'waiting_matches' }, () => {
          loadWaitingMatches();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [eventId]);

  const loadWaitingMatches = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('waiting_matches')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const matches: WaitingMatch[] = data?.map(match => ({
        id: match.id,
        eventId: match.event_id,
        player1Id: match.player1_id,
        player2Id: match.player2_id,
        player3Id: match.player3_id,
        player4Id: match.player4_id,
        matchData: match.match_data as unknown as GameMatch,
        createdAt: new Date(match.created_at),
      })) || [];

      setWaitingMatches(matches);
    } catch (error) {
      console.error('Error loading waiting matches:', error);
    }
  };

  const addWaitingMatch = useCallback(async (match: GameMatch) => {
    if (!eventId) return;

    try {
      const { error } = await supabase
        .from('waiting_matches')
        .insert({
          event_id: eventId,
          player1_id: match.pair1.players[0].id,
          player2_id: match.pair1.players[1].id,
          player3_id: match.pair2.players[0].id,
          player4_id: match.pair2.players[1].id,
          match_data: match as unknown as any
        });

      if (error) throw error;

      toast({
        title: "Match added to queue",
        description: "Match is waiting for an available court",
      });

      loadWaitingMatches();
    } catch (error) {
      console.error('Error adding waiting match:', error);
      toast({
        title: "Error",
        description: "Failed to add match to queue",
        variant: "destructive"
      });
    }
  }, [eventId]);

  const removeWaitingMatch = useCallback(async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('waiting_matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      loadWaitingMatches();
    } catch (error) {
      console.error('Error removing waiting match:', error);
    }
  }, []);

  const startWaitingMatch = useCallback(async (matchId: string, courtId: number, onStartGame: (match: GameMatch) => void) => {
    try {
      const match = waitingMatches.find(m => m.id === matchId);
      if (!match) return;

      await removeWaitingMatch(matchId);
      onStartGame(match.matchData);
    } catch (error) {
      console.error('Error starting waiting match:', error);
    }
  }, [waitingMatches, removeWaitingMatch]);

  return {
    waitingMatches,
    addWaitingMatch,
    removeWaitingMatch,
    startWaitingMatch,
    loadWaitingMatches
  };
}