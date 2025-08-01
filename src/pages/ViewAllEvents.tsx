import { Link } from 'react-router-dom';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Calendar,
  Users,
  Play,
  Eye,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const ViewAllEvents = () => {
  const { events } = useEventManager();
  const { players } = useEnhancedPlayerManager();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'upcoming': return 'outline';
      default: return 'secondary';
    }
  };

  const getEventPlayers = (eventPlayerIds: string[]) => {
    return players.filter(player => eventPlayerIds.includes(player.id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">All Events</h1>
                <p className="text-sm text-muted-foreground">View and manage all events</p>
              </div>
            </div>
            
            <Link to="/create-event">
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Events Yet</h2>
            <p className="text-muted-foreground mb-6">Get started by creating your first event</p>
            <Link to="/create-event">
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Create First Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const eventPlayers = getEventPlayers(event.selectedPlayerIds);
              
              return (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getStatusVariant(event.status)}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(event.date, 'PPP p')}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {eventPlayers.length} players registered
                      </div>
                    </div>

                    {/* Player avatars preview */}
                    {eventPlayers.length > 0 && (
                      <div className="flex -space-x-2">
                        {eventPlayers.slice(0, 4).map((player, index) => (
                          <div 
                            key={player.id}
                            className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium"
                            title={player.name}
                          >
                            {player.name.charAt(0)}
                          </div>
                        ))}
                        {eventPlayers.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                            +{eventPlayers.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link to={`/event/${event.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      
                      {event.status === 'upcoming' || event.status === 'active' ? (
                        <Link to={`/event/${event.id}/play`} className="flex-1">
                          <Button size="sm" className="w-full">
                            <Play className="h-4 w-4 mr-2" />
                            {event.status === 'upcoming' ? 'Start' : 'Enter'}
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="secondary" className="flex-1" disabled>
                          Completed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllEvents;