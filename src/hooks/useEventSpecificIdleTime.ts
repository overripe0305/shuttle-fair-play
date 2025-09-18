import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEventSpecificIdleTime = () => {
  const setIdleStartTime = useCallback(async (playerId: string, eventId: string) => {
    if (!eventId) return;
    
    // Check if player has any completed games in this event
    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('event_id', eventId)
      .eq('completed', true)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId},player3_id.eq.${playerId},player4_id.eq.${playerId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    let idleStartTime: number;
    
    if (games && games.length > 0) {
      // Use the end time of their last completed game in this event
      const lastGame = games[0];
      // Estimate game end time (start + 15 minutes default)
      const gameStartTime = new Date(lastGame.start_time || lastGame.created_at).getTime();
      idleStartTime = gameStartTime + (15 * 60 * 1000); // Add 15 minutes
    } else {
      // Check when player was added to the event
      const { data: eventPlayer } = await supabase
        .from('event_players')
        .select('created_at')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .single();
      
      if (eventPlayer) {
        idleStartTime = new Date(eventPlayer.created_at).getTime();
      } else {
        // Fallback to current time
        idleStartTime = Date.now();
      }
    }
    
    // Store event-specific idle time
    localStorage.setItem(`idle_start_${playerId}_${eventId}`, idleStartTime.toString());
    
    return idleStartTime;
  }, []);

  const getIdleStartTime = useCallback((playerId: string, eventId: string) => {
    if (!eventId) return Date.now();
    
    const storedTime = localStorage.getItem(`idle_start_${playerId}_${eventId}`);
    if (storedTime) {
      return parseInt(storedTime);
    }
    
    // If no stored time, we'll need to calculate it
    return null;
  }, []);

  const clearIdleStartTime = useCallback((playerId: string, eventId: string) => {
    if (!eventId) return;
    localStorage.removeItem(`idle_start_${playerId}_${eventId}`);
  }, []);

  return {
    setIdleStartTime,
    getIdleStartTime,
    clearIdleStartTime
  };
};