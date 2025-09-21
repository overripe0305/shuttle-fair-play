import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ActiveGame {
  id: string;
  eventId: string;
  player1Id: string;
  player2Id: string;
  player3Id: string;
  player4Id: string;
  courtId: number;
  startTime: Date;
  completed: boolean;
  winner?: 'team1' | 'team2';
  player1Name?: string;
  player2Name?: string;
  player3Name?: string;
  player4Name?: string;
}

export function useGameManager(eventId?: string) {
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);

  useEffect(() => {
    if (eventId) {
      loadActiveGames();
      
      // Set up real-time subscription with unique channel name
      const channel = supabase
        .channel(`active-games-${eventId}-${Math.random().toString(36).substr(2, 9)}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'games',
          filter: `event_id=eq.${eventId}`
        }, (payload) => {
          console.log('Active games real-time update:', payload);
          // Add a small delay to ensure database is consistent
          setTimeout(() => {
            loadActiveGames();
          }, 50);
        })
        .subscribe((status) => {
          console.log('Active games subscription status:', status);
        });

      // Also subscribe to player status changes to refresh game states
      const playerChannel = supabase
        .channel(`game-player-changes-${eventId}-${Math.random().toString(36).substr(2, 9)}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'players'
        }, (payload) => {
          console.log('Player status update for games:', payload);
          // Small delay to ensure database consistency
          setTimeout(() => {
            loadActiveGames();
          }, 50);
        })
        .subscribe((status) => {
          console.log('Game player subscription status:', status);
        });

      return () => {
        console.log('Cleaning up active games subscriptions');
        supabase.removeChannel(channel);
        supabase.removeChannel(playerChannel);
      };
    }
  }, [eventId]);

  const loadActiveGames = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('event_id', eventId)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const games: ActiveGame[] = data?.map(game => ({
        id: game.id,
        eventId: game.event_id,
        player1Id: game.player1_id,
        player2Id: game.player2_id,
        player3Id: game.player3_id,
        player4Id: game.player4_id,
        courtId: game.court_id,
        startTime: new Date(game.start_time),
        completed: game.completed,
        winner: game.winner as 'team1' | 'team2' | undefined,
        player1Name: undefined,
        player2Name: undefined,
        player3Name: undefined,
        player4Name: undefined,
      })) || [];

      // Fetch player names separately
      if (games.length > 0) {
        const playerIds = games.flatMap(game => [game.player1Id, game.player2Id, game.player3Id, game.player4Id]);
        const { data: playersData } = await supabase
          .from('players')
          .select('id, name')
          .in('id', playerIds);

        // Map player names to games
        games.forEach(game => {
          game.player1Name = playersData?.find(p => p.id === game.player1Id)?.name || 'Unknown';
          game.player2Name = playersData?.find(p => p.id === game.player2Id)?.name || 'Unknown';
          game.player3Name = playersData?.find(p => p.id === game.player3Id)?.name || 'Unknown';
          game.player4Name = playersData?.find(p => p.id === game.player4Id)?.name || 'Unknown';
        });
      }

      // Sort games by duration (longest first)
      games.sort((a, b) => {
        const aDuration = new Date().getTime() - new Date(a.startTime).getTime();
        const bDuration = new Date().getTime() - new Date(b.startTime).getTime();
        return bDuration - aDuration;
      });

      setActiveGames(games);
    } catch (error) {
      console.error('Error loading active games:', error);
    }
  };

  const createGame = useCallback(async (
    player1Id: string,
    player2Id: string,
    player3Id: string,
    player4Id: string,
    courtId: number
  ) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          event_id: eventId,
          player1_id: player1Id,
          player2_id: player2Id,
          player3_id: player3Id,
          player4_id: player4Id,
          court_id: courtId,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      // Update player statuses to 'in_progress'
      const playerIds = [player1Id, player2Id, player3Id, player4Id];
      await supabase
        .from('players')
        .update({ status: 'in_progress' })
        .in('id', playerIds);

      toast({
        title: "Game started!",
        description: `New game created on Court ${courtId}`,
      });

      // Trigger sync after game creation
      const syncEvent = new CustomEvent('triggerDataSync');
      window.dispatchEvent(syncEvent);

      loadActiveGames();
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive"
      });
    }
  }, [eventId]);

  const completeGame = useCallback(async (gameId: string, winner?: 'team1' | 'team2') => {
    try {
      const game = activeGames.find(g => g.id === gameId);
      if (!game) return;

      // Update game status first
      const { error: gameError } = await supabase
        .from('games')
        .update({ 
          completed: true,
          winner: winner 
        })
        .eq('id', gameId);

      if (gameError) throw gameError;

      // Calculate game duration in minutes (max 20 minutes)
      const actualDurationMinutes = Math.floor((new Date().getTime() - new Date(game.startTime).getTime()) / 60000);
      const gameDurationMinutes = Math.min(actualDurationMinutes, 20);
      
      // Update player statuses and increment games played
      const playerIds = [game.player1Id, game.player2Id, game.player3Id, game.player4Id];
      
      // Get current games_played for each player and increment
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, total_minutes_played')
        .in('id', playerIds);

      if (playersError) throw playersError;

      // Update each player individually to increment minutes and set status (but not cumulative stats)
      for (const player of players) {
        await supabase
          .from('players')
          .update({
            status: 'available',
            total_minutes_played: (player.total_minutes_played || 0) + gameDurationMinutes,
          })
          .eq('id', player.id);
      }

      toast({
        title: "Game completed!",
        description: `Game on Court ${game.courtId} has been marked as complete.`,
      });

      // Trigger sync after game completion
      const syncEvent = new CustomEvent('triggerDataSync');
      window.dispatchEvent(syncEvent);

      // Force reload active games to refresh the list immediately
      await loadActiveGames();
      
    } catch (error) {
      console.error('Error completing game:', error);
      toast({
        title: "Error",
        description: "Failed to complete game",
        variant: "destructive"
      });
    }
  }, [activeGames]);

  const updateGameCourt = useCallback(async (gameId: string, courtId: number) => {
    try {
      const { error } = await supabase
        .from('games')
        .update({ court_id: courtId })
        .eq('id', gameId);

      if (error) throw error;

      toast({
        title: "Court updated",
        description: `Game moved to Court ${courtId}`,
      });

      loadActiveGames();
    } catch (error) {
      console.error('Error updating game court:', error);
      toast({
        title: "Error",
        description: "Failed to update court",
        variant: "destructive"
      });
    }
  }, []);

  const replacePlayerInGame = useCallback(async (gameId: string, oldPlayerId: string, newPlayerId: string) => {
    try {
      const game = activeGames.find(g => g.id === gameId);
      if (!game) return;

      // Determine which player position to update
      let updateField = '';
      if (game.player1Id === oldPlayerId) updateField = 'player1_id';
      else if (game.player2Id === oldPlayerId) updateField = 'player2_id';
      else if (game.player3Id === oldPlayerId) updateField = 'player3_id';
      else if (game.player4Id === oldPlayerId) updateField = 'player4_id';

      if (!updateField) return;

      // Update the game
      const { error: gameError } = await supabase
        .from('games')
        .update({ [updateField]: newPlayerId })
        .eq('id', gameId);

      if (gameError) throw gameError;

      // Update player statuses - preserve idle time for returning player
      await supabase
        .from('players')
        .update({ status: 'available' })
        .eq('id', oldPlayerId);

      // Preserve idle start time for substituted player (don't reset)
      const storedIdleTime = localStorage.getItem(`idle_start_${oldPlayerId}`);
      if (!storedIdleTime) {
        localStorage.setItem(`idle_start_${oldPlayerId}`, Date.now().toString());
      }

      await supabase
        .from('players')
        .update({ status: 'in_progress' })
        .eq('id', newPlayerId);

      toast({
        title: "Player substituted",
        description: "Player has been replaced in the game.",
      });

      loadActiveGames();
    } catch (error) {
      console.error('Error replacing player:', error);
      toast({
        title: "Error",
        description: "Failed to replace player",
        variant: "destructive"
      });
    }
  }, [activeGames]);

  const teamTradeInActiveGame = useCallback(async (gameId: string, player1Id: string, player2Id: string) => {
    try {
      const game = activeGames.find(g => g.id === gameId);
      if (!game) return;

      // Create update object for swapping players
      const updates: any = {};
      
      // Determine which positions the players are in and swap them
      if (game.player1Id === player1Id && game.player3Id === player2Id) {
        updates.player1_id = player2Id;
        updates.player3_id = player1Id;
      } else if (game.player1Id === player1Id && game.player4Id === player2Id) {
        updates.player1_id = player2Id;
        updates.player4_id = player1Id;
      } else if (game.player2Id === player1Id && game.player3Id === player2Id) {
        updates.player2_id = player2Id;
        updates.player3_id = player1Id;
      } else if (game.player2Id === player1Id && game.player4Id === player2Id) {
        updates.player2_id = player2Id;
        updates.player4_id = player1Id;
      } else if (game.player3Id === player1Id && game.player1Id === player2Id) {
        updates.player3_id = player2Id;
        updates.player1_id = player1Id;
      } else if (game.player3Id === player1Id && game.player2Id === player2Id) {
        updates.player3_id = player2Id;
        updates.player2_id = player1Id;
      } else if (game.player4Id === player1Id && game.player1Id === player2Id) {
        updates.player4_id = player2Id;
        updates.player1_id = player1Id;
      } else if (game.player4Id === player1Id && game.player2Id === player2Id) {
        updates.player4_id = player2Id;
        updates.player2_id = player1Id;
      }

      const { error } = await supabase
        .from('games')
        .update(updates)
        .eq('id', gameId);

      if (error) throw error;

      toast({
        title: "Players traded",
        description: "Players have been successfully traded between teams",
      });

      loadActiveGames();
    } catch (error) {
      console.error('Error trading players in active game:', error);
      toast({
        title: "Error",
        description: "Failed to trade players",
        variant: "destructive"
      });
    }
  }, [activeGames, loadActiveGames]);

  const cancelGame = useCallback(async (gameId: string) => {
    try {
      const game = activeGames.find(g => g.id === gameId);
      if (!game) return;

      // Delete the game without recording it
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      // Update player statuses back to available but preserve idle times for cancellations
      const playerIds = [game.player1Id, game.player2Id, game.player3Id, game.player4Id];
      await supabase
        .from('players')
        .update({ status: 'available' })
        .in('id', playerIds);

      // Don't reset idle time for cancelled games - preserve existing idle time
      playerIds.forEach(playerId => {
        const storedIdleTime = localStorage.getItem(`idle_start_${playerId}`);
        if (!storedIdleTime) {
          localStorage.setItem(`idle_start_${playerId}`, Date.now().toString());
        }
      });

      toast({
        title: "Game cancelled",
        description: `Game on Court ${game.courtId} has been cancelled without recording.`,
      });

      loadActiveGames();
    } catch (error) {
      console.error('Error cancelling game:', error);
      toast({
        title: "Error",
        description: "Failed to cancel game",
        variant: "destructive"
      });
    }
  }, [activeGames]);

  return {
    activeGames,
    createGame,
    completeGame,
    cancelGame,
    updateGameCourt,
    replacePlayerInGame: replacePlayerInGame,
    teamTradeInActiveGame,
    loadActiveGames
  };
}