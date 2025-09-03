import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { MajorLevel, SubLevel, getBracketFromMajorSub, PlayerStatus } from '@/types/player';
import { toast } from 'sonner';

interface OfflineData {
  players: EnhancedPlayer[];
  events: any[];
  games: any[];
  waitingMatches: any[];
  lastSync: string;
}

export const useOfflineSync = (clubId?: string) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  const getStorageKey = (key: string) => `offline_${clubId}_${key}`;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load last sync time
  useEffect(() => {
    const lastSync = localStorage.getItem(getStorageKey('lastSync'));
    if (lastSync) {
      setLastSyncTime(new Date(lastSync));
    }
  }, [clubId]);

  // Save data to local storage
  const saveToLocal = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(getStorageKey(key), JSON.stringify(data));
      localStorage.setItem(getStorageKey('hasChanges'), 'true');
      setHasLocalChanges(true);
    } catch (error) {
      console.error('Error saving to local storage:', error);
      toast.error('Failed to save data locally');
    }
  }, [clubId]);

  // Load data from local storage
  const loadFromLocal = useCallback((key: string) => {
    try {
      const data = localStorage.getItem(getStorageKey(key));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading from local storage:', error);
      return null;
    }
  }, [clubId]);

  // Download data from server
  const downloadData = useCallback(async () => {
    if (!clubId || !isOnline) {
      console.log('Download data: Missing clubId or offline:', { clubId, isOnline });
      toast.error('Unable to sync: Missing club ID or offline');
      return null;
    }

    try {
      setIsSyncing(true);
      console.log('Starting data download for club:', clubId);
      
      // Fetch all necessary data with better error handling
      const [playersResponse, eventsResponse, gamesResponse, waitingMatchesResponse] = await Promise.all([
        supabase.from('players').select('*').eq('club_id', clubId),
        supabase.from('events').select('*').eq('club_id', clubId),
        supabase.from('games').select('*'),
        supabase.from('waiting_matches').select('*')
      ]);

      console.log('Download responses:', {
        players: playersResponse.data?.length || 0,
        events: eventsResponse.data?.length || 0,
        games: gamesResponse.data?.length || 0,
        waitingMatches: waitingMatchesResponse.data?.length || 0,
        playersError: playersResponse.error,
        eventsError: eventsResponse.error,
        gamesError: gamesResponse.error,
        waitingMatchesError: waitingMatchesResponse.error
      });

      if (playersResponse.error) {
        console.error('Players query error:', playersResponse.error);
        toast.error(`Failed to download players: ${playersResponse.error.message}`);
        throw playersResponse.error;
      }
      if (eventsResponse.error) {
        console.error('Events query error:', eventsResponse.error);
        toast.error(`Failed to download events: ${eventsResponse.error.message}`);
        throw eventsResponse.error;
      }
      if (gamesResponse.error) {
        console.error('Games query error:', gamesResponse.error);
        toast.error(`Failed to download games: ${gamesResponse.error.message}`);
        throw gamesResponse.error;
      }
      if (waitingMatchesResponse.error) {
        console.error('Waiting matches query error:', waitingMatchesResponse.error);
        toast.error(`Failed to download waiting matches: ${waitingMatchesResponse.error.message}`);
        throw waitingMatchesResponse.error;
      }

      // Transform players data to EnhancedPlayer format
      const enhancedPlayers: EnhancedPlayer[] = playersResponse.data?.map(player => ({
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
      })) || [];

      const offlineData: OfflineData = {
        players: enhancedPlayers,
        events: eventsResponse.data || [],
        games: gamesResponse.data || [],
        waitingMatches: waitingMatchesResponse.data || [],
        lastSync: new Date().toISOString()
      };

      // Save to local storage
      Object.entries(offlineData).forEach(([key, value]) => {
        localStorage.setItem(getStorageKey(key), JSON.stringify(value));
      });

      setLastSyncTime(new Date());
      setHasLocalChanges(false);
      localStorage.removeItem(getStorageKey('hasChanges'));
      
      toast.success('Data downloaded successfully');
      return offlineData;
    } catch (error) {
      console.error('Error downloading data:', error);
      toast.error('Failed to download data');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [clubId, isOnline]);

  // Upload local changes to server
  const uploadChanges = useCallback(async () => {
    if (!clubId || !isOnline) return false;

    try {
      setIsSyncing(true);
      
      const localPlayers = loadFromLocal('players');
      const localGames = loadFromLocal('games');
      const localWaitingMatches = loadFromLocal('waitingMatches');

      // Upload players
      if (localPlayers && localPlayers.length > 0) {
        for (const player of localPlayers) {
          const { error } = await supabase
            .from('players')
            .upsert({
              id: player.id,
              name: player.name,
              major_level: player.level.major,
              sub_level: player.level.sub,
              birthday: player.birthday?.toISOString().split('T')[0],
              photo: player.photo,
              games_played: player.gamesPlayed,
              penalty_bonus: player.gamePenaltyBonus,
              status: player.status,
              club_id: clubId
            });
          
          if (error) throw error;
        }
      }

      // Upload games
      if (localGames && localGames.length > 0) {
        for (const game of localGames) {
          const { error } = await supabase
            .from('games')
            .upsert(game);
          
          if (error) throw error;
        }
      }

      // Upload waiting matches
      if (localWaitingMatches && localWaitingMatches.length > 0) {
        for (const match of localWaitingMatches) {
          const { error } = await supabase
            .from('waiting_matches')
            .upsert(match);
          
          if (error) throw error;
        }
      }

      setLastSyncTime(new Date());
      setHasLocalChanges(false);
      localStorage.setItem(getStorageKey('lastSync'), new Date().toISOString());
      localStorage.removeItem(getStorageKey('hasChanges'));
      
      toast.success('Changes uploaded successfully');
      return true;
    } catch (error) {
      console.error('Error uploading changes:', error);
      toast.error('Failed to upload changes');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [clubId, isOnline, loadFromLocal]);

  // Full sync (download + upload)
  const fullSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return false;
    }

    // First upload any local changes, then download fresh data
    const uploadSuccess = await uploadChanges();
    if (uploadSuccess) {
      await downloadData();
    }
    
    return uploadSuccess;
  }, [isOnline, uploadChanges, downloadData]);

  // Clear local data
  const clearLocalData = useCallback(() => {
    const keys = ['players', 'events', 'games', 'waitingMatches', 'lastSync', 'hasChanges'];
    keys.forEach(key => {
      localStorage.removeItem(getStorageKey(key));
    });
    setLastSyncTime(null);
    setHasLocalChanges(false);
    toast.success('Local data cleared');
  }, [clubId]);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    hasLocalChanges,
    saveToLocal,
    loadFromLocal,
    downloadData,
    uploadChanges,
    fullSync,
    clearLocalData
  };
};