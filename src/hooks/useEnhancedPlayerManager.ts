import { useState, useEffect } from 'react';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { PlayerLevel, MajorLevel, SubLevel, PlayerStatus, getBracketFromMajorSub } from '@/types/player';
import { supabase } from '@/integrations/supabase/client';

export const useEnhancedPlayerManager = () => {
  const [players, setPlayers] = useState<EnhancedPlayer[]>([]);

  // Load players from Supabase on mount
  useEffect(() => {
    loadPlayers();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        loadPlayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enhancedPlayers: EnhancedPlayer[] = data?.map(player => ({
        id: player.id,
        name: player.name,
        level: {
          major: player.major_level as MajorLevel,
          sub: player.sub_level as SubLevel,
          bracket: getBracketFromMajorSub(player.major_level as MajorLevel, player.sub_level as SubLevel)
        },
        birthday: player.birthday ? new Date(player.birthday) : undefined,
        photo: player.photo,
        eligible: true, // Default since column doesn't exist yet
        gamesPlayed: player.games_played,
        gamePenaltyBonus: player.penalty_bonus,
        status: player.status as PlayerStatus,
        matchHistory: [],
        createdAt: new Date(player.created_at)
      })) || [];

      setPlayers(enhancedPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const addPlayer = async (playerData: {
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

    try {
      const { data, error } = await supabase
        .from('players')
        .insert({
          name: playerData.name,
          major_level: playerData.majorLevel,
          sub_level: playerData.subLevel,
          birthday: playerData.birthday?.toISOString().split('T')[0],
          photo: playerData.photo,
          games_played: 0,
          penalty_bonus: 0,
          status: 'available'
        })
        .select()
        .single();

      if (error) throw error;

      const level: PlayerLevel = {
        major: playerData.majorLevel,
        sub: playerData.subLevel,
        bracket: getBracketFromMajorSub(playerData.majorLevel, playerData.subLevel)
      };

      const newPlayer: EnhancedPlayer = {
        id: data.id,
        name: data.name,
        level,
        birthday: data.birthday ? new Date(data.birthday) : undefined,
        photo: data.photo,
        eligible: true, // Default since column doesn't exist yet
        gamesPlayed: data.games_played,
        gamePenaltyBonus: data.penalty_bonus,
        status: data.status as PlayerStatus,
        matchHistory: [],
        createdAt: new Date(data.created_at)
      };

      setPlayers(prev => [...prev, newPlayer]);
      return newPlayer;
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  };

  const updatePlayer = async (playerId: string, updates: Partial<EnhancedPlayer>) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({
          name: updates.name,
          major_level: updates.level?.major,
          sub_level: updates.level?.sub,
          birthday: updates.birthday?.toISOString().split('T')[0],
          photo: updates.photo,
          games_played: updates.gamesPlayed,
          penalty_bonus: updates.gamePenaltyBonus,
          status: updates.status
        })
        .eq('id', playerId);

      if (error) throw error;

      setPlayers(prev =>
        prev.map(player =>
          player.id === playerId ? { ...player, ...updates } : player
        )
      );
    } catch (error) {
      console.error('Error updating player:', error);
    }
  };

  const deletePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      setPlayers(prev => prev.filter(player => player.id !== playerId));
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const bulkAddPlayers = async (playersData: Array<{
    name: string;
    majorLevel: MajorLevel;
    subLevel?: SubLevel;
    birthday?: Date;
  }>) => {
    try {
      const insertData = playersData.map(playerData => ({
        name: playerData.name,
        major_level: playerData.majorLevel,
        sub_level: playerData.subLevel,
        birthday: playerData.birthday?.toISOString().split('T')[0],
        games_played: 0,
        penalty_bonus: 0,
        status: 'available'
      }));

      const { data, error } = await supabase
        .from('players')
        .insert(insertData)
        .select();

      if (error) throw error;

      // Convert to EnhancedPlayer format
      const newPlayers = data.map(player => ({
        id: player.id,
        name: player.name,
        level: {
          major: player.major_level as MajorLevel,
          sub: player.sub_level as SubLevel,
          bracket: getBracketFromMajorSub(player.major_level as MajorLevel, player.sub_level as SubLevel)
        },
        birthday: player.birthday ? new Date(player.birthday) : undefined,
        photo: player.photo,
        eligible: true,
        gamesPlayed: player.games_played,
        gamePenaltyBonus: player.penalty_bonus,
        status: player.status as PlayerStatus,
        matchHistory: [],
        createdAt: new Date(player.created_at)
      }));

      setPlayers(prev => [...prev, ...newPlayers]);
      return newPlayers;
    } catch (error) {
      console.error('Error bulk adding players:', error);
      throw error;
    }
  };

  return {
    players,
    addPlayer,
    updatePlayer,
    deletePlayer,
    bulkAddPlayers
  };
};