import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Users, FileText } from 'lucide-react';
import { EventReportDialog } from '@/components/EventReportDialog';
import badmintonLogo from '@/assets/badminton-logo.png';

const EventPreview = () => {
  const { eventId } = useParams();
  const [isEventReportOpen, setIsEventReportOpen] = useState(false);
  const { events } = useEventManager();
  const { players: allPlayers } = useEnhancedPlayerManager();
  
  const currentEvent = eventId ? events.find(e => e.id === eventId) : null;
  
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist.</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventPlayers = allPlayers.filter(player => 
    currentEvent.selectedPlayerIds?.includes(player.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <img 
                  src={badmintonLogo} 
                  alt="Badminton Logo" 
                  className="h-8 w-8 object-contain"
                />
                <div>
                  <h1 className="text-xl font-semibold">{currentEvent.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    Event Preview • {new Date(currentEvent.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEventReportOpen(true)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Event Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Event Name</label>
                  <p className="text-lg">{currentEvent.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="text-lg">{new Date(currentEvent.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={currentEvent.status === 'active' ? 'default' : 'secondary'}>
                    {currentEvent.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Courts</label>
                  <p className="text-lg">{currentEvent.courtCount || 4}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{eventPlayers.length}</div>
                <div className="text-sm text-muted-foreground">Total Players</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <div className="text-2xl font-bold">{currentEvent.courtCount || 4}</div>
                <div className="text-sm text-muted-foreground">Available Courts</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Players List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participating Players ({eventPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{player.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Level {player.level?.bracket || 0}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {player.level?.major || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Report Dialog */}
      <EventReportDialog
        open={isEventReportOpen}
        onOpenChange={setIsEventReportOpen}
        eventId={eventId || ''}
        eventTitle={currentEvent.title}
        players={eventPlayers.map(p => ({
          id: p.id,
          name: p.name,
          gamesPlayed: 0,
          level: p.level || { major: 'Unknown', bracket: 0 }
        }))}
      />
    </div>
  );
};

export default EventPreview;