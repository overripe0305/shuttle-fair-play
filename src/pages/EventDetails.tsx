import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { useOfflinePlayerManager } from '@/hooks/useOfflinePlayerManager';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useClubManager } from '@/hooks/useClubManager';
import { useEventPlayerStats } from '@/hooks/useEventPlayerStats';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AddPlayerToEventDialog } from '@/components/AddPlayerToEventDialog';
import { PlayerEditDialog } from '@/components/PlayerEditDialog';
import { 
  ArrowLeft,
  Calendar,
  Users,
  Play,
  Camera,
  Plus,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { getLevelDisplay, MajorLevel, SubLevel } from '@/types/player';
import { toast } from 'sonner';

const EventDetails = () => {
  const { eventId, clubId } = useParams();
  const navigate = useNavigate();
  const { events, updateEventStatus, addPlayerToEvent } = useEventManager();
  
  // Get clubs to determine sync clubId when none is selected
  const { clubs } = useClubManager();
  const syncClubId = clubId || (clubs && clubs.length > 0 ? clubs[0]?.id : undefined);
  
  // Use offline-aware player management
  const { players: onlinePlayers, addPlayer: addOnlinePlayer, updatePlayer: updateOnlinePlayer } = useEnhancedPlayerManager(clubId);
  const { players: offlinePlayers, addPlayer: addOfflinePlayer, updatePlayer: updateOfflinePlayer } = useOfflinePlayerManager(syncClubId);
  const { isOnline } = useOfflineSync(syncClubId);
  
  // Switch between online and offline data based on connection
  const players = isOnline ? onlinePlayers : offlinePlayers;
  const addPlayer = isOnline ? addOnlinePlayer : addOfflinePlayer;
  const updatePlayer = isOnline ? updateOnlinePlayer : updateOfflinePlayer;
  
  const { getPlayerStats } = useEventPlayerStats(eventId);
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState<{[key: string]: number}>({});

  const event = events.find(e => e.id === eventId);
  
  const eventPlayers = event ? players.filter(player => 
    event.selectedPlayerIds.includes(player.id)
  ) : [];

  const availablePlayersForEvent = players.filter(player => 
    !event?.selectedPlayerIds.includes(player.id)
  );
  
  // Update games played for each player when they change
  useEffect(() => {
    if (!event || !eventPlayers.length) return;
    
    const newGamesPlayed: {[key: string]: number} = {};
    eventPlayers.forEach(player => {
      const stats = getPlayerStats(player.id);
      newGamesPlayed[player.id] = stats.gamesPlayed;
    });
    setGamesPlayed(newGamesPlayed);
  }, [event, eventPlayers, getPlayerStats]);

  // Set up real-time sync for games
  useEffect(() => {
    if (!eventId || !event) return;

    const channel = supabase
      .channel('event-details-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          // Update games played when games change
          if (eventPlayers.length > 0) {
            const newGamesPlayed: {[key: string]: number} = {};
            eventPlayers.forEach(player => {
              const stats = getPlayerStats(player.id);
              newGamesPlayed[player.id] = stats.gamesPlayed;
            });
            setGamesPlayed(newGamesPlayed);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, event?.id]); // Only depend on eventId and event.id, not the full eventPlayers array

  const editingPlayerData = editingPlayer ? eventPlayers.find(p => p.id === editingPlayer) : null;

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleStartEvent = () => {
    updateEventStatus(event.id, 'active');
    navigate(`/event/${event.id}/play`);
  };

  const handleAddExistingPlayer = async (playerId: string) => {
    try {
      await addPlayerToEvent(event.id, playerId);
      toast.success('Player added to event');
    } catch (error) {
      toast.error('Failed to add player to event');
    }
  };

  const handleAddNewPlayer = async (playerData: { name: string; majorLevel: MajorLevel; subLevel?: SubLevel }) => {
    try {
      const newPlayer = await addPlayer(playerData);
      await addPlayerToEvent(event.id, newPlayer.id);
      toast.success(`${newPlayer.name} created and added to event`);
    } catch (error) {
      toast.error('Failed to create and add player');
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: { name?: string; majorLevel?: MajorLevel; subLevel?: SubLevel }) => {
    try {
      await updatePlayer(playerId, updates);
      toast.success('Player updated successfully');
    } catch (error) {
      toast.error('Failed to update player');
    }
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
                <h1 className="text-2xl font-bold">{event.title}</h1>
                <p className="text-sm text-muted-foreground">Event Details</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Badge 
                variant={event.status === 'active' ? 'default' : 'secondary'}
              >
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
              {event.status === 'upcoming' && (
                <Button onClick={handleStartEvent}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Event
                </Button>
              )}
              {event.status === 'active' && (
                <Link to={`/event/${event.id}/play`}>
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Enter Game
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Event Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="text-lg">{event.title}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Date & Time</Label>
                <p>{format(event.date, 'PPP p')}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge 
                    variant={event.status === 'active' ? 'default' : 'secondary'}
                  >
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Participants</Label>
                <p className="text-2xl font-bold">{eventPlayers.length}</p>
                <p className="text-sm text-muted-foreground">Players registered</p>
              </div>
            </CardContent>
          </Card>

          {/* Player List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Registered Players ({eventPlayers.length})
                </div>
                {event.status === 'upcoming' && (
                  <Button size="sm" onClick={() => setIsAddPlayerDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Player
                  </Button>
                )}
              </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eventPlayers.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditingPlayer(player.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.photo} alt={player.name} />
                        <AvatarFallback>
                          <Camera className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.level.major}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm">
                          <div className="font-medium">{gamesPlayed[player.id] || 0}</div>
                          <div className="text-muted-foreground">games</div>
                        </div>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
                
                {eventPlayers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No players registered for this event</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AddPlayerToEventDialog
        open={isAddPlayerDialogOpen}
        onOpenChange={setIsAddPlayerDialogOpen}
        availablePlayers={availablePlayersForEvent}
        onAddExistingPlayer={handleAddExistingPlayer}
        onAddNewPlayer={handleAddNewPlayer}
      />

      {editingPlayerData && (
        <PlayerEditDialog
          player={editingPlayerData}
          open={!!editingPlayer}
          onOpenChange={(open) => !open && setEditingPlayer(null)}
          onSave={handleUpdatePlayer}
        />
      )}
    </div>
  );
};

const Label = ({ className, children, ...props }: any) => (
  <label className={`text-sm font-medium ${className || ''}`} {...props}>
    {children}
  </label>
);

export default EventDetails;