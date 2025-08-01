import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CumulativePlayerStats {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export const useCumulativePlayerStats = () => {
  const [playerStats, setPlayerStats] = useState<CumulativePlayerStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCumulativeStats();
    
    // Set up real-time subscription for games table
    const channel = supabase
      .channel('cumulative-games-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'games'
      }, () => {
        loadCumulativeStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCumulativeStats = async () => {
    setLoading(true);
    try {
      // Get all completed games across all events
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('completed', true);

      if (error) throw error;

      // Calculate cumulative stats for each player
      const playerStatsMap = new Map<string, CumulativePlayerStats>();

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

      setPlayerStats(Array.from(playerStatsMap.values()));
    } catch (error) {
      console.error('Error loading cumulative player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerStats = (playerId: string): CumulativePlayerStats => {
    return playerStats.find(stats => stats.playerId === playerId) || {
      playerId,
      gamesPlayed: 0,
      wins: 0,
      losses: 0
    };
  };

  return {
    playerStats,
    getPlayerStats,
    loading,
    refetch: loadCumulativeStats
  };
};