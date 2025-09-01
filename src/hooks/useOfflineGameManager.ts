import { useState, useEffect, useCallback } from 'react';
import { useOfflineSync } from './useOfflineSync';

interface OfflineGame {
  id: string;
  player1_id: string;
  player2_id: string;
  player3_id: string;
  player4_id: string;
  courtId: number;
  completed: boolean;
  winner?: 'team1' | 'team2';
  start_time: string;
  event_id?: string;
  created_at: string;
  updated_at: string;
}

export const useOfflineGameManager = (eventId?: string) => {
  const [activeGames, setActiveGames] = useState<OfflineGame[]>([]);
  const { loadFromLocal, saveToLocal, isOnline } = useOfflineSync();

  // Load games from offline storage
  useEffect(() => {
    if (eventId) {
      const offlineGames = loadFromLocal('games') || [];
      const eventGames = offlineGames.filter((game: OfflineGame) => 
        game.event_id === eventId && !game.completed
      );
      setActiveGames(eventGames);
    }
  }, [eventId, loadFromLocal]);

  const createGame = useCallback(async (
    player1Id: string,
    player2Id: string, 
    player3Id: string,
    player4Id: string,
    courtId: number
  ) => {
    const newGame: OfflineGame = {
      id: `offline-game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      player1_id: player1Id,
      player2_id: player2Id,
      player3_id: player3Id,
      player4_id: player4Id,
      courtId,
      completed: false,
      start_time: new Date().toISOString(),
      event_id: eventId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const allGames = loadFromLocal('games') || [];
    const updatedGames = [...allGames, newGame];
    saveToLocal('games', updatedGames);
    
    setActiveGames(prev => [...prev, newGame]);
    return newGame;
  }, [eventId, loadFromLocal, saveToLocal]);

  const completeGame = useCallback(async (gameId: string, winner?: 'team1' | 'team2') => {
    const allGames = loadFromLocal('games') || [];
    const updatedGames = allGames.map((game: OfflineGame) =>
      game.id === gameId 
        ? { ...game, completed: true, winner, updated_at: new Date().toISOString() }
        : game
    );
    
    saveToLocal('games', updatedGames);
    setActiveGames(prev => prev.filter(game => game.id !== gameId));
  }, [loadFromLocal, saveToLocal]);

  const cancelGame = useCallback(async (gameId: string) => {
    const allGames = loadFromLocal('games') || [];
    const updatedGames = allGames.filter((game: OfflineGame) => game.id !== gameId);
    
    saveToLocal('games', updatedGames);
    setActiveGames(prev => prev.filter(game => game.id !== gameId));
  }, [loadFromLocal, saveToLocal]);

  const updateGameCourt = useCallback(async (gameId: string, courtId: number) => {
    const allGames = loadFromLocal('games') || [];
    const updatedGames = allGames.map((game: OfflineGame) =>
      game.id === gameId 
        ? { ...game, courtId, updated_at: new Date().toISOString() }
        : game
    );
    
    saveToLocal('games', updatedGames);
    setActiveGames(prev => prev.map(game => 
      game.id === gameId ? { ...game, courtId } : game
    ));
  }, [loadFromLocal, saveToLocal]);

  const replacePlayerInGame = useCallback(async (
    gameId: string, 
    oldPlayerId: string, 
    newPlayerId: string
  ) => {
    const allGames = loadFromLocal('games') || [];
    const updatedGames = allGames.map((game: OfflineGame) => {
      if (game.id !== gameId) return game;
      
      const updatedGame = { ...game, updated_at: new Date().toISOString() };
      if (game.player1_id === oldPlayerId) updatedGame.player1_id = newPlayerId;
      else if (game.player2_id === oldPlayerId) updatedGame.player2_id = newPlayerId;
      else if (game.player3_id === oldPlayerId) updatedGame.player3_id = newPlayerId;
      else if (game.player4_id === oldPlayerId) updatedGame.player4_id = newPlayerId;
      
      return updatedGame;
    });
    
    saveToLocal('games', updatedGames);
    setActiveGames(prev => prev.map(game => {
      if (game.id !== gameId) return game;
      
      const updatedGame = { ...game };
      if (game.player1_id === oldPlayerId) updatedGame.player1_id = newPlayerId;
      else if (game.player2_id === oldPlayerId) updatedGame.player2_id = newPlayerId;
      else if (game.player3_id === oldPlayerId) updatedGame.player3_id = newPlayerId;
      else if (game.player4_id === oldPlayerId) updatedGame.player4_id = newPlayerId;
      
      return updatedGame;
    }));
  }, [loadFromLocal, saveToLocal]);

  return {
    activeGames,
    createGame,
    completeGame,
    cancelGame,
    updateGameCourt,
    replacePlayerInGame
  };
};