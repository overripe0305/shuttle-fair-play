import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EventPlayerStats {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export const useEventPlayerStats = (eventId?: string, playerIds?: string[]) => {
  const [eventPlayerStats, setEventPlayerStats] = useState<EventPlayerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  const loadEventPlayerStats = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      // Get all completed games for this event
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('event_id', eventId)
        .eq('completed', true);

      if (error) throw error;

      // Calculate stats for each player
      const playerStatsMap = new Map<string, EventPlayerStats>();

      games?.forEach(game => {
        const playerIds = [game.player1_id, game.player2_id, game.player3_id, game.player4_id];
        const team1Ids = [game.player1_id, game.player2_id];
        const team2Ids = [game.player3_id, game.player4_id];

        playerIds.forEach(playerId => {
          if (!playerStatsMap.has(playerId)) {
            playerStatsMap.set(playerId, {
              playerId,
              gamesPlayed: 0,
              wins: 0,
              losses: 0
            });
          }

          const stats = playerStatsMap.get(playerId)!;
          stats.gamesPlayed += 1;

          // Determine if this player won or lost
          if (game.winner === 'team1' && team1Ids.includes(playerId)) {
            stats.wins += 1;
          } else if (game.winner === 'team2' && team2Ids.includes(playerId)) {
            stats.wins += 1;
          } else if (game.winner) {
            stats.losses += 1;
          }
        });
      });

      setEventPlayerStats(Array.from(playerStatsMap.values()));
      setUpdateCounter(prev => prev + 1);
      console.log('Event player stats updated:', Array.from(playerStatsMap.values()).length, 'players');
    } catch (error) {
      console.error('Error loading event player stats:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      // Clear old stats and reload when player list changes
      setEventPlayerStats([]);
      loadEventPlayerStats();
      
      // Set up real-time subscription for games table
      const channel = supabase
        .channel(`event-games-${eventId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'games',
          filter: `event_id=eq.${eventId}`
        }, (payload) => {
          console.log('Event game change detected:', payload);
          // Force immediate reload of stats when games change
          // Add a small delay to ensure database consistency
          setTimeout(() => {
            loadEventPlayerStats();
          }, 50);
        })
        .subscribe((status) => {
          console.log('Event stats subscription status:', status);
        });

      return () => {
        console.log('Cleaning up event stats subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [eventId, loadEventPlayerStats, JSON.stringify(playerIds?.sort())]);

  const getPlayerStats = useCallback((playerId: string): EventPlayerStats => {
    return eventPlayerStats.find(stats => stats.playerId === playerId) || {
      playerId,
      gamesPlayed: 0,
      wins: 0,
      losses: 0
    };
  }, [eventPlayerStats]);

  return {
    eventPlayerStats,
    getPlayerStats,
    loading,
    refetch: loadEventPlayerStats,
    updateCounter // Force re-renders when stats change
  };
};