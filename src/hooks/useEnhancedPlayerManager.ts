import { useState } from 'react';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { PlayerLevel, MajorLevel, SubLevel, getBracketFromMajorSub } from '@/types/player';

export const useEnhancedPlayerManager = () => {
  const [players, setPlayers] = useState<EnhancedPlayer[]>([]);

  const addPlayer = (playerData: {
    name: string;
    majorLevel: MajorLevel;
    subLevel?: SubLevel;
    birthday?: Date;
    photo?: string;
  }) => {
    const level: PlayerLevel = {
      major: playerData.majorLevel,
      sub: playerData.subLevel,
      bracket: getBracketFromMajorSub(playerData.majorLevel, playerData.subLevel)
    };

    const newPlayer: EnhancedPlayer = {
      id: crypto.randomUUID(),
      name: playerData.name,
      level,
      birthday: playerData.birthday,
      photo: playerData.photo,
      eligible: true,
      gamesPlayed: 0,
      gamePenaltyBonus: 0,
      status: 'Available',
      matchHistory: [],
      createdAt: new Date()
    };

    setPlayers(prev => [...prev, newPlayer]);
    return newPlayer;
  };

  const updatePlayer = (playerId: string, updates: Partial<EnhancedPlayer>) => {
    setPlayers(prev =>
      prev.map(player =>
        player.id === playerId ? { ...player, ...updates } : player
      )
    );
  };

  const deletePlayer = (playerId: string) => {
    setPlayers(prev => prev.filter(player => player.id !== playerId));
  };

  const bulkAddPlayers = (playersData: Array<{
    name: string;
    majorLevel: MajorLevel;
    subLevel?: SubLevel;
    birthday?: Date;
  }>) => {
    const newPlayers = playersData.map(playerData => {
      const level: PlayerLevel = {
        major: playerData.majorLevel,
        sub: playerData.subLevel,
        bracket: getBracketFromMajorSub(playerData.majorLevel, playerData.subLevel)
      };

      return {
        id: crypto.randomUUID(),
        name: playerData.name,
        level,
        birthday: playerData.birthday,
        eligible: true,
        gamesPlayed: 0,
        gamePenaltyBonus: 0,
        status: 'Available' as const,
        matchHistory: [],
        createdAt: new Date()
      };
    });

    setPlayers(prev => [...prev, ...newPlayers]);
    return newPlayers;
  };

  return {
    players,
    addPlayer,
    updatePlayer,
    deletePlayer,
    bulkAddPlayers
  };
};