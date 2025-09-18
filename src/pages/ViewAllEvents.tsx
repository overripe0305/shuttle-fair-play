import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEventManager } from '@/hooks/useEventManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft,
  Calendar,
  Users,
  Trophy,
  Search,
  Plus,
  Eye,
  Play,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'upcoming' | 'active' | 'completed';

const ViewAllEvents = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { events, deleteEvent } = useEventManager(clubId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500 text-white';
      case 'active':
        return 'bg-green-500 text-white';
      case 'completed':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getEventStats = (event: any) => {
    return {
      totalPlayers: event.selectedPlayerIds?.length || 0,
      totalGames: 0, // TODO: Calculate from actual games data
      activeCourts: event.courtCount || 4
    };
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      try {
        await deleteEvent(eventId);
        toast.success('Event deleted successfully');
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={clubId ? `/club/${clubId}/dashboard` : "/"}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {clubId ? 'Back to Dashboard' : 'Back to Home'}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">All Events</h1>
                <p className="text-sm text-muted-foreground">Manage and view all badminton events</p>
              </div>
            </div>
            
            <Link to={clubId ? `/club/${clubId}/create-event` : "/create-event"}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const stats = getEventStats(event);
            
            return (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(event.date, 'PPP')}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(event.status)}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Event Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="text-sm font-medium">{stats.totalPlayers}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Players</div>
                    </div>
                    
                    <div className="p-2 bg-muted rounded">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="h-3 w-3" />
                        <span className="text-sm font-medium">{stats.totalGames}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Games</div>
                    </div>
                    
                    <div className="p-2 bg-muted rounded">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm font-medium">{stats.activeCourts}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Courts</div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link to={clubId ? `/club/${clubId}/event/${event.id}` : `/event/${event.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </Link>
                    
                    {event.status === 'active' ? (
                      <Link to={clubId ? `/club/${clubId}/event/${event.id}/play` : `/event/${event.id}/play`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Play className="h-3 w-3 mr-1" />
                          Enter Game
                        </Button>
                      </Link>
                    ) : event.status === 'upcoming' ? (
                      <>
                        <Link to="/" className="flex-1">
                          <Button size="sm" className="w-full">
                            <Play className="h-3 w-3 mr-1" />
                            Start Event
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteEvent(event.id, event.title)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1" disabled>
                        Completed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {statusFilter === 'all' 
                ? 'No events found' 
                : `No ${statusFilter} events found`}
            </div>
            <Link to={clubId ? `/club/${clubId}/create-event` : "/create-event"}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllEvents;