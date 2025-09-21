import { useState, useEffect } from 'react';
import { BadmintonEvent } from '@/types/event';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { supabase } from '@/integrations/supabase/client';

export const useEventManager = (clubId?: string) => {
  const [events, setEvents] = useState<BadmintonEvent[]>([]);

  // Load events from Supabase on mount
  useEffect(() => {
    if (clubId) {
      loadEvents();
      
      // Subscribe to real-time updates for both events and event_players tables
      const channel = supabase
        .channel('events-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
          console.log('Events table changed, reloading...');
          loadEvents();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_players' }, () => {
          console.log('Event players table changed, reloading...');
          loadEvents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clubId]);

  const loadEvents = async () => {
    if (!clubId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_players(player_id, order_index, created_at)
        `)
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const badmintonEvents: BadmintonEvent[] = data?.map(event => ({
        id: event.id,
        title: event.title,
        date: new Date(event.date),
        selectedPlayerIds: event.event_players?.map(ep => ep.player_id) || [],
        playerOrder: event.event_players?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(ep => ep.player_id) || [],
        createdAt: new Date(event.created_at),
        status: event.status as 'upcoming' | 'active' | 'completed',
        courtCount: event.court_count || 4,
        queueFee: event.queue_fee || 0,
        eventType: event.event_type as 'regular' | 'tournament' || 'regular',
        tournamentConfig: event.tournament_config
      })) || [];

      setEvents(badmintonEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const createEvent = async (eventData: Omit<BadmintonEvent, 'id' | 'createdAt' | 'status'>) => {
    if (!clubId) throw new Error('Club ID is required');
    
    try {
      // First, create the event
      const { data: eventDbData, error: eventError } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          date: eventData.date.toISOString(),
          status: 'upcoming',
          club_id: clubId
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Then, create the event-player associations
      if (eventData.selectedPlayerIds.length > 0) {
        const { error: playersError } = await supabase
          .from('event_players')
          .insert(
            eventData.selectedPlayerIds.map(playerId => ({
              event_id: eventDbData.id,
              player_id: playerId
            }))
          );

        if (playersError) throw playersError;
      }

      const newEvent: BadmintonEvent = {
        id: eventDbData.id,
        title: eventDbData.title,
        date: new Date(eventDbData.date),
        selectedPlayerIds: eventData.selectedPlayerIds,
        createdAt: new Date(eventDbData.created_at),
        status: 'upcoming'
      };
      
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  const updateEventStatus = async (eventId: string, status: BadmintonEvent['status']) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => 
        prev.map(event => 
          event.id === eventId ? { ...event, status } : event
        )
      );
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  const updateEvent = async (eventId: string, updates: { title?: string; date?: Date; courtCount?: number; queueFee?: number }) => {
    try {
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.date !== undefined) dbUpdates.date = updates.date.toISOString();
      if (updates.courtCount !== undefined) dbUpdates.court_count = updates.courtCount;
      if (updates.queueFee !== undefined) dbUpdates.queue_fee = updates.queueFee;

      const { error } = await supabase
        .from('events')
        .update(dbUpdates)
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => 
        prev.map(event => 
          event.id === eventId ? { 
            ...event, 
            ...(updates.title && { title: updates.title }),
            ...(updates.date && { date: updates.date }),
            ...(updates.courtCount && { courtCount: updates.courtCount }),
            ...(updates.queueFee !== undefined && { queueFee: updates.queueFee })
          } : event
        )
      );
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const updateEventCourtCount = async (eventId: string, courtCount: number) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ court_count: courtCount })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => 
        prev.map(event => 
          event.id === eventId ? { ...event, courtCount } : event
        )
      );
    } catch (error) {
      console.error('Error updating event court count:', error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      // First delete all games associated with this event
      const { error: gamesError } = await supabase
        .from('games')
        .delete()
        .eq('event_id', eventId);

      if (gamesError) throw gamesError;

      // Delete all waiting matches associated with this event
      const { error: waitingMatchesError } = await supabase
        .from('waiting_matches')
        .delete()
        .eq('event_id', eventId);

      if (waitingMatchesError) throw waitingMatchesError;

      // Delete all event-player associations
      const { error: eventPlayersError } = await supabase
        .from('event_players')
        .delete()
        .eq('event_id', eventId);

      if (eventPlayersError) throw eventPlayersError;

      // Delete all event payments
      const { error: paymentsError } = await supabase
        .from('event_payments')
        .delete()
        .eq('event_id', eventId);

      if (paymentsError) throw paymentsError;

      // Check if this is a tournament event and delete tournament data
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (tournamentData) {
        // Delete tournament matches
        const { error: tournamentMatchesError } = await supabase
          .from('tournament_matches')
          .delete()
          .eq('tournament_id', tournamentData.id);

        if (tournamentMatchesError) throw tournamentMatchesError;

        // Delete tournament participants
        const { error: tournamentParticipantsError } = await supabase
          .from('tournament_participants')
          .delete()
          .eq('tournament_id', tournamentData.id);

        if (tournamentParticipantsError) throw tournamentParticipantsError;

        // Delete the tournament
        const { error: tournamentError } = await supabase
          .from('tournaments')
          .delete()
          .eq('id', tournamentData.id);

        if (tournamentError) throw tournamentError;
      }

      // Finally delete the event itself
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const addPlayerToEvent = async (eventId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('event_players')
        .insert({
          event_id: eventId,
          player_id: playerId
        });

      if (error) throw error;

      // Update local state
      setEvents(prev => 
        prev.map(event => 
          event.id === eventId 
            ? { ...event, selectedPlayerIds: [...event.selectedPlayerIds, playerId] }
            : event
        )
      );
    } catch (error) {
      console.error('Error adding player to event:', error);
      throw error;
    }
  };

  const removePlayerFromEvent = async (eventId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('event_players')
        .delete()
        .eq('event_id', eventId)
        .eq('player_id', playerId);

      if (error) throw error;

      setEvents(prev => 
        prev.map(event => 
          event.id === eventId 
            ? { ...event, selectedPlayerIds: event.selectedPlayerIds.filter(id => id !== playerId) }
            : event
        )
      );
    } catch (error) {
      console.error('Error removing player from event:', error);
      throw error;
    }
  };

  return {
    events,
    createEvent,
    updateEvent,
    updateEventStatus,
    updateEventCourtCount,
    deleteEvent,
    addPlayerToEvent,
    removePlayerFromEvent
  };
};