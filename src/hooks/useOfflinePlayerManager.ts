import { useState, useEffect, useCallback } from 'react';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { MajorLevel, SubLevel, getBracketFromMajorSub, PlayerStatus } from '@/types/player';
import { useOfflineSync } from './useOfflineSync';

export const useOfflinePlayerManager = (clubId?: string) => {
  const [players, setPlayers] = useState<EnhancedPlayer[]>([]);
  const { loadFromLocal, saveToLocal, isOnline } = useOfflineSync(clubId);

  // Load players from offline storage
  useEffect(() => {
    if (clubId) {
      const offlinePlayers = loadFromLocal('players');
      if (offlinePlayers) {
        setPlayers(offlinePlayers);
      }
    }
  }, [clubId, loadFromLocal]);

  const addPlayer = useCallback(async (playerData: {
    name: string;
    majorLevel: MajorLevel;
    subLevel?: SubLevel;
    birthday?: Date;
    photo?: string;
  }) => {
    // Check for duplicate names
    const existingPlayer = players.find(p => p.name.toLowerCase() === playerData.name.toLowerCase());
    if (existingPlayer) {
      throw new Error('A player with this name already exists');
    }

    const level = {
      major: playerData.majorLevel,
      sub: playerData.subLevel,
      bracket: getBracketFromMajorSub(playerData.majorLevel, playerData.subLevel)
    };

    const newPlayer: EnhancedPlayer = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: playerData.name,
      level,
      birthday: playerData.birthday,
      photo: playerData.photo,
      eligible: true,
      gamesPlayed: 0,
      gamePenaltyBonus: 0,
      status: 'available' as PlayerStatus,
      matchHistory: [],
      createdAt: new Date()
    };

    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    saveToLocal('players', updatedPlayers);
    
    return newPlayer;
  }, [players, saveToLocal]);

  const updatePlayer = useCallback(async (playerId: string, updates: Partial<EnhancedPlayer>) => {
    const updatedPlayers = players.map(player =>
      player.id === playerId ? { ...player, ...updates } : player
    );
    setPlayers(updatedPlayers);
    saveToLocal('players', updatedPlayers);
  }, [players, saveToLocal]);

  const deletePlayer = useCallback(async (playerId: string) => {
    const updatedPlayers = players.filter(player => player.id !== playerId);
    setPlayers(updatedPlayers);
    saveToLocal('players', updatedPlayers);
  }, [players, saveToLocal]);

  return {
    players,
    addPlayer,
    updatePlayer,
    deletePlayer
  };
};