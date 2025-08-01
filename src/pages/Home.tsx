import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEventManager } from "@/hooks/useEventManager";
import { useEnhancedPlayerManager } from "@/hooks/useEnhancedPlayerManager";
import { 
  Play,
  Users,
  Calendar,
  Trophy,
  BarChart3,
  Plus,
  ArrowRight,
  Target,
  Award,
  TrendingUp,
  Receipt,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import badmintonLogo from '@/assets/badminton-logo.png';

const Home = () => {
  const { events } = useEventManager();
  const { players } = useEnhancedPlayerManager();

  const upcomingEvents = events.filter(event => event.status === 'upcoming').slice(0, 3);
  const activeEvents = events.filter(event => event.status === 'active');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={badmintonLogo} alt="BadmintonPro" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">BadmintonPro</h1>
                <p className="text-sm text-muted-foreground">Club Management Hub</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{players.length} Players</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{events.length} Events</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>{activeEvents.length} Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <Button asChild>
                <Link to="/players">
                  <Users className="h-4 w-4 mr-2" />
                  Player Management
                </Link>
              </Button>
              
              <Button asChild variant="outline">
                <Link to="/view-events">
                  <Calendar className="h-4 w-4 mr-2" />
                  View All Events
                </Link>
              </Button>
              
              <Button asChild variant="outline">
                <Link to="/billing">
                  <Receipt className="h-4 w-4 mr-2" />
                  Billing
                </Link>
              </Button>
              </CardContent>
            </Card>
          </div>

          {/* Active Events */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Active Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active events</p>
                    <Link to="/create-event">
                      <Button className="mt-4">Create Your First Event</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeEvents.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{event.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(event.date, 'PPP')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.selectedPlayerIds.length} players
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="default">Active</Badge>
                            <Link to={`/event/${event.id}/play`}>
                              <Button size="sm">
                                Enter Game
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No upcoming events scheduled</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge variant="secondary">Upcoming</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {format(event.date, 'PPP')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {event.selectedPlayerIds.length} players registered
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link to={`/event/${event.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        <Link to={`/event/${event.id}/play`} className="flex-1">
                          <Button size="sm" className="w-full">
                            Start Event
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{players.length}</div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{activeEvents.length}</div>
              <div className="text-sm text-muted-foreground">Active Events</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{upcomingEvents.length}</div>
              <div className="text-sm text-muted-foreground">Upcoming Events</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;