import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { PlayerStatus, MajorLevel, SubLevel, getBracketFromMajorSub } from '@/types/player';
import { toast } from 'sonner';
import { useEventSpecificIdleTime } from './useEventSpecificIdleTime';

interface SyncResult {
  playersFixed: number;
  gamesFixed: number;
  waitingMatchesFixed: number;
  conflicts: string[];
}

export const useDataSync = (eventId?: string, clubId?: string) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { setIdleStartTime } = useEventSpecificIdleTime();

  const syncData = async (): Promise<SyncResult> => {
    if (!eventId || !clubId) {
      throw new Error('Event ID and Club ID are required for sync');
    }

    setIsSyncing(true);
    const result: SyncResult = {
      playersFixed: 0,
      gamesFixed: 0,
      waitingMatchesFixed: 0,
      conflicts: []
    };

    try {
      // Fetch fresh data from database
      const [playersResponse, gamesResponse, waitingMatchesResponse] = await Promise.all([
        supabase
          .from('players')
          .select('*')
          .eq('club_id', clubId),
        supabase
          .from('games')
          .select('*')
          .eq('event_id', eventId),
        supabase
          .from('waiting_matches')
          .select('*')
          .eq('event_id', eventId)
      ]);

      if (playersResponse.error) throw playersResponse.error;
      if (gamesResponse.error) throw gamesResponse.error;
      if (waitingMatchesResponse.error) throw waitingMatchesResponse.error;

      const dbPlayers = playersResponse.data || [];
      const dbGames = gamesResponse.data || [];
      const dbWaitingMatches = waitingMatchesResponse.data || [];

      // Check player status consistency
      const playerStatusFixes: Array<{id: string, correctStatus: PlayerStatus}> = [];
      
      for (const player of dbPlayers) {
        let expectedStatus: PlayerStatus = 'available';
        
        // Check if player is in any active game
        const inActiveGame = dbGames.some(game => 
          !game.completed && 
          [game.player1_id, game.player2_id, game.player3_id, game.player4_id].includes(player.id)
        );
        
        // Check if player is in any waiting match
        const inWaitingMatch = dbWaitingMatches.some(match =>
          [match.player1_id, match.player2_id, match.player3_id, match.player4_id].includes(player.id)
        );

        if (inActiveGame) {
          expectedStatus = 'in_progress';
        } else if (inWaitingMatch) {
          expectedStatus = 'queued';
        } else if (player.status === 'paused') {
          // Keep paused status - don't change it to available
          expectedStatus = 'paused';
        } else {
          expectedStatus = 'available';
        }

        if (player.status !== expectedStatus) {
          playerStatusFixes.push({
            id: player.id,
            correctStatus: expectedStatus
          });
          result.conflicts.push(`Player ${player.name}: status was ${player.status}, should be ${expectedStatus}`);
        }
      }

      // Apply player status fixes
      if (playerStatusFixes.length > 0) {
        for (const fix of playerStatusFixes) {
          const { error } = await supabase
            .from('players')
            .update({ status: fix.correctStatus })
            .eq('id', fix.id);
          
          if (error) {
            console.error('Error fixing player status:', error);
            result.conflicts.push(`Failed to fix player status for ID ${fix.id}: ${error.message}`);
          } else {
            result.playersFixed++;
          }
        }
      }

      // Check for orphaned waiting matches (players not available)
      const orphanedWaitingMatches: string[] = [];
      for (const match of dbWaitingMatches) {
        const playerIds = [match.player1_id, match.player2_id, match.player3_id, match.player4_id];
        const playersInMatch = dbPlayers.filter(p => playerIds.includes(p.id));
        
        // If any player is not available or doesn't exist, remove the waiting match
        const hasUnavailablePlayers = playerIds.some(playerId => {
          const player = playersInMatch.find(p => p.id === playerId);
          return !player || (player.status !== 'queued' && player.status !== 'available');
        });

        if (hasUnavailablePlayers) {
          orphanedWaitingMatches.push(match.id);
          result.conflicts.push(`Waiting match removed: contains unavailable players`);
        }
      }

      // Remove orphaned waiting matches
      if (orphanedWaitingMatches.length > 0) {
        const { error } = await supabase
          .from('waiting_matches')
          .delete()
          .in('id', orphanedWaitingMatches);
        
        if (error) {
          console.error('Error removing orphaned waiting matches:', error);
          result.conflicts.push(`Failed to remove orphaned waiting matches: ${error.message}`);
        } else {
          result.waitingMatchesFixed = orphanedWaitingMatches.length;
        }
      }

      // Check for games with incorrect player statuses
      const gameStatusFixes: string[] = [];
      for (const game of dbGames) {
        if (!game.completed) {
          const gamePlayerIds = [game.player1_id, game.player2_id, game.player3_id, game.player4_id];
          const gamePlayersWithWrongStatus = dbPlayers.filter(p => 
            gamePlayerIds.includes(p.id) && p.status !== 'in_progress'
          );

          if (gamePlayersWithWrongStatus.length > 0) {
            result.conflicts.push(`Game ${game.id}: ${gamePlayersWithWrongStatus.length} players had incorrect status`);
            gameStatusFixes.push(game.id);
          }
        }
      }

      result.gamesFixed = gameStatusFixes.length;

      return result;

    } catch (error) {
      console.error('Error during sync:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const performSync = async () => {
    try {
      const result = await syncData();
      
      // Sync idle time for all players in the event
      if (eventId && clubId) {
        const { data: eventPlayers } = await supabase
          .from('event_players')
          .select('player_id')
          .eq('event_id', eventId);
        
        if (eventPlayers) {
          await Promise.all(
            eventPlayers.map(ep => setIdleStartTime(ep.player_id, eventId))
          );
        }
      }
      
      if (result.playersFixed === 0 && result.gamesFixed === 0 && result.waitingMatchesFixed === 0) {
        toast.success('Data sync complete - no issues found, idle times updated');
      } else {
        const fixedItems = [];
        if (result.playersFixed > 0) fixedItems.push(`${result.playersFixed} player status(es)`);
        if (result.gamesFixed > 0) fixedItems.push(`${result.gamesFixed} game(s)`);
        if (result.waitingMatchesFixed > 0) fixedItems.push(`${result.waitingMatchesFixed} waiting match(es)`);
        
        toast.success(`Data sync complete - fixed: ${fixedItems.join(', ')}, idle times updated`);
      }

      if (result.conflicts.length > 0) {
        console.log('Sync conflicts resolved:', result.conflicts);
      }

    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Data sync failed. Please try again.');
    }
  };

  return {
    performSync,
    isSyncing
  };
};