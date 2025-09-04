import { useState, useEffect, useCallback } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { GameMatch } from '@/types/player';
import { toast } from '@/hooks/use-toast';

export interface OfflineWaitingMatch {
  id: string;
  eventId: string;
  player1Id: string;
  player2Id: string;
  player3Id: string;
  player4Id: string;
  matchData: GameMatch;
  createdAt: Date;
}

export function useOfflineWaitingMatchManager(eventId?: string) {
  const [waitingMatches, setWaitingMatches] = useState<OfflineWaitingMatch[]>([]);
  const { loadFromLocal, saveToLocal } = useOfflineSync();

  // Load waiting matches from offline storage
  useEffect(() => {
    if (eventId) {
      const offlineMatches = loadFromLocal('waitingMatches') || [];
      const eventMatches = offlineMatches.filter((match: OfflineWaitingMatch) => 
        match.eventId === eventId
      );
      setWaitingMatches(eventMatches);
    }
  }, [eventId, loadFromLocal]);

  const addWaitingMatch = useCallback(async (match: GameMatch, onPlayerStatusUpdate?: (playerId: string, status: string) => void) => {
    if (!eventId) return;

    try {
      const playerIds = [
        match.pair1.players[0].id,
        match.pair1.players[1].id,
        match.pair2.players[0].id,
        match.pair2.players[1].id
      ];

      // Check if any player is already in an active game or waiting match
      const allGames = loadFromLocal('games') || [];
      const activeGames = allGames.filter((game: any) => 
        game.event_id === eventId && !game.completed
      );
      
      const allWaitingMatches = loadFromLocal('waitingMatches') || [];
      const eventWaitingMatches = allWaitingMatches.filter((match: any) => 
        match.eventId === eventId
      );

      // Check if any player is already in active games
      const playersInActiveGames = new Set();
      activeGames.forEach((game: any) => {
        playersInActiveGames.add(game.player1_id);
        playersInActiveGames.add(game.player2_id);
        playersInActiveGames.add(game.player3_id);
        playersInActiveGames.add(game.player4_id);
      });

      // Check if any player is already in waiting matches
      const playersInWaiting = new Set();
      eventWaitingMatches.forEach((match: any) => {
        playersInWaiting.add(match.player1Id);
        playersInWaiting.add(match.player2Id);
        playersInWaiting.add(match.player3Id);
        playersInWaiting.add(match.player4Id);
      });

      const unavailablePlayers = playerIds.filter(id => 
        playersInActiveGames.has(id) || playersInWaiting.has(id)
      );

      if (unavailablePlayers.length > 0) {
        toast({
          title: "Players unavailable",
          description: "Some players are already in queue or playing",
          variant: "destructive"
        });
        return;
      }

      const newMatch: OfflineWaitingMatch = {
        id: `offline-waiting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventId,
        player1Id: match.pair1.players[0].id,
        player2Id: match.pair1.players[1].id,
        player3Id: match.pair2.players[0].id,
        player4Id: match.pair2.players[1].id,
        matchData: match,
        createdAt: new Date()
      };

      const updatedMatches = [...allWaitingMatches, newMatch];
      saveToLocal('waitingMatches', updatedMatches);
      setWaitingMatches(prev => [...prev, newMatch]);

      // Update player statuses in offline storage
      const allOfflinePlayers = loadFromLocal('players') || [];
      const updatedPlayers = allOfflinePlayers.map((player: any) => {
        if (playerIds.includes(player.id)) {
          return { ...player, status: 'waiting' };
        }
        return player;
      });
      saveToLocal('players', updatedPlayers);

      toast({
        title: "Match added to queue",
        description: "Match is waiting for an available court",
      });

    } catch (error) {
      console.error('Error adding offline waiting match:', error);
      toast({
        title: "Error",
        description: "Failed to add match to queue",
        variant: "destructive"
      });
    }
  }, [eventId, loadFromLocal, saveToLocal]);

  const removeWaitingMatch = useCallback(async (matchId: string) => {
    try {
      const allMatches = loadFromLocal('waitingMatches') || [];
      const match = allMatches.find((m: any) => m.id === matchId);
      
      if (match) {
        const playerIds = [match.player1Id, match.player2Id, match.player3Id, match.player4Id];
        
        // Update player statuses back to available
        const allOfflinePlayers = loadFromLocal('players') || [];
        const updatedPlayers = allOfflinePlayers.map((player: any) => {
          if (playerIds.includes(player.id)) {
            return { ...player, status: 'available' };
          }
          return player;
        });
        saveToLocal('players', updatedPlayers);
      }

      const updatedMatches = allMatches.filter((m: any) => m.id !== matchId);
      saveToLocal('waitingMatches', updatedMatches);
      setWaitingMatches(prev => prev.filter(m => m.id !== matchId));

    } catch (error) {
      console.error('Error removing offline waiting match:', error);
    }
  }, [loadFromLocal, saveToLocal]);

  const startWaitingMatch = useCallback(async (matchId: string, courtId: number, onStartGame: (match: GameMatch) => void) => {
    try {
      const match = waitingMatches.find(m => m.id === matchId);
      if (!match) return;

      const playerIds = [match.player1Id, match.player2Id, match.player3Id, match.player4Id];

      // Update player statuses to 'in_progress'
      const allOfflinePlayers = loadFromLocal('players') || [];
      const updatedPlayers = allOfflinePlayers.map((player: any) => {
        if (playerIds.includes(player.id)) {
          return { ...player, status: 'in_progress' };
        }
        return player;
      });
      saveToLocal('players', updatedPlayers);

      // Remove from waiting matches
      const allMatches = loadFromLocal('waitingMatches') || [];
      const updatedMatches = allMatches.filter((m: any) => m.id !== matchId);
      saveToLocal('waitingMatches', updatedMatches);
      setWaitingMatches(prev => prev.filter(m => m.id !== matchId));

      onStartGame(match.matchData);
    } catch (error) {
      console.error('Error starting offline waiting match:', error);
    }
  }, [waitingMatches, loadFromLocal, saveToLocal]);

  return {
    waitingMatches,
    addWaitingMatch,
    removeWaitingMatch,
    startWaitingMatch
  };
}