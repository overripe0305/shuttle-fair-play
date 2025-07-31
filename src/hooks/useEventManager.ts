import { useState } from 'react';
import { BadmintonEvent } from '@/types/event';
import { EnhancedPlayer } from '@/types/enhancedPlayer';

export const useEventManager = () => {
  const [events, setEvents] = useState<BadmintonEvent[]>([]);

  const createEvent = (eventData: Omit<BadmintonEvent, 'id' | 'createdAt' | 'status'>) => {
    const newEvent: BadmintonEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      status: 'upcoming'
    };
    
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  };

  const updateEventStatus = (eventId: string, status: BadmintonEvent['status']) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === eventId ? { ...event, status } : event
      )
    );
  };

  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
  };

  return {
    events,
    createEvent,
    updateEventStatus,
    deleteEvent
  };
};