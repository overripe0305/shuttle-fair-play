import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useEventManager } from '@/hooks/useEventManager';
import Index from '@/pages/Index';
import TournamentView from '@/pages/TournamentView';
import { Button } from '@/components/ui/button';

const PlaySwitch: React.FC = () => {
  const { clubId, eventId } = useParams<{ clubId: string; eventId: string }>();
  const { events } = useEventManager(clubId);

  const event = events.find(e => e.id === eventId);

  if (!eventId) return <Navigate to={clubId ? `/club/${clubId}/dashboard` : '/'} replace />;

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading event...</p>
        </div>
      </div>
    );
  }

  // If tournament, render the tournament UI; otherwise render the queue UI
  if (event.eventType === 'tournament') {
    return <TournamentView />;
  }

  return <Index />;
};

export default PlaySwitch;
