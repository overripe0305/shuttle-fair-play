import { useState, useEffect } from 'react';
import { BadmintonEvent } from '@/types/event';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { supabase } from '@/integrations/supabase/client';

export const useEventManager = () => {
  const [events, setEvents] = useState<BadmintonEvent[]>([]);

  // Load events from Supabase on mount
  useEffect(() => {
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
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_players(player_id, order_index, created_at)
        `)
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
        queueFee: event.queue_fee || 0
      })) || [];

      setEvents(badmintonEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const createEvent = async (eventData: Omit<BadmintonEvent, 'id' | 'createdAt' | 'status'>) => {
    try {
      // First, create the event
      const { data: eventDbData, error: eventError } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          date: eventData.date.toISOString(),
          status: 'upcoming'
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
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
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
    updateEventStatus,
    updateEventCourtCount,
    deleteEvent,
    addPlayerToEvent,
    removePlayerFromEvent
  };
};