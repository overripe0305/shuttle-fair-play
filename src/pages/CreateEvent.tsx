import { useState } from 'react';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowLeft,
  Calendar,
  Users,
  Camera,
  Check
} from 'lucide-react';
import { MajorLevel, SubLevel, getLevelDisplay } from '@/types/player';
import { toast } from 'sonner';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { createEvent } = useEventManager();
  const { players, addPlayer } = useEnhancedPlayerManager();
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);

  // Add player form state
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    majorLevel: '' as MajorLevel,
    subLevel: undefined as SubLevel | undefined,
  });

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleAddNewPlayer = () => {
    if (!newPlayer.name || !newPlayer.majorLevel) return;
    
    const player = addPlayer({
      name: newPlayer.name,
      majorLevel: newPlayer.majorLevel,
      subLevel: newPlayer.subLevel,
    });

    // Auto-select the newly added player
    setSelectedPlayerIds(prev => [...prev, player.id]);

    setNewPlayer({
      name: '',
      majorLevel: '' as MajorLevel,
      subLevel: undefined,
    });
    setIsAddPlayerDialogOpen(false);
    toast.success(`${player.name} added and selected for the event`);
  };

  const handleCreateEvent = () => {
    if (!eventTitle || !eventDate || selectedPlayerIds.length === 0) {
      toast.error('Please fill in all required fields and select at least one player');
      return;
    }

    createEvent({
      title: eventTitle,
      date: new Date(eventDate),
      selectedPlayerIds
    });

    toast.success('Event created successfully!');
    navigate('/');
  };

  const needsSubLevel = (major: MajorLevel) => {
    return major === 'Beginner' || major === 'Intermediate' || major === 'Advance';
  };

  const selectedPlayers = players.filter(player => selectedPlayerIds.includes(player.id));

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
                <h1 className="text-2xl font-bold">Create Event</h1>
                <p className="text-sm text-muted-foreground">Set up a new badminton event</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Event Title *</Label>
                <Input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Weekend Tournament"
                />
              </div>
              
              <div>
                <Label>Event Date *</Label>
                <Input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <h3 className="font-semibold mb-2">Selected Players ({selectedPlayers.length})</h3>
                {selectedPlayers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No players selected</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedPlayers.map(player => (
                      <div key={player.id} className="flex items-center gap-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={player.photo} alt={player.name} />
                          <AvatarFallback className="text-xs">
                            {player.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{player.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {getLevelDisplay(player.level)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleCreateEvent} 
                className="w-full mt-6"
                disabled={!eventTitle || !eventDate || selectedPlayerIds.length === 0}
              >
                Create Event
              </Button>
            </CardContent>
          </Card>

          {/* Player Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Players
                </div>
                <Dialog open={isAddPlayerDialogOpen} onOpenChange={setIsAddPlayerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Player</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newPlayer.name}
                          onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                          placeholder="Player name"
                        />
                      </div>
                      
                      <div>
                        <Label>Major Level</Label>
                        <Select 
                          value={newPlayer.majorLevel} 
                          onValueChange={(value: MajorLevel) => setNewPlayer({...newPlayer, majorLevel: value, subLevel: undefined})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select major level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Newbie">Newbie</SelectItem>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advance">Advance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {needsSubLevel(newPlayer.majorLevel) && (
                        <div>
                          <Label>Sub Level</Label>
                          <Select 
                            value={newPlayer.subLevel || ''} 
                            onValueChange={(value: SubLevel) => setNewPlayer({...newPlayer, subLevel: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select sub level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Mid">Mid</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button onClick={handleAddNewPlayer} disabled={!newPlayer.name || !newPlayer.majorLevel}>
                        Add Player
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {players.map((player) => (
                  <div 
                    key={player.id} 
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => handlePlayerToggle(player.id)}
                  >
                    <Checkbox 
                      checked={selectedPlayerIds.includes(player.id)}
                      onChange={() => handlePlayerToggle(player.id)}
                    />
                    
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.photo} alt={player.name} />
                      <AvatarFallback>
                        <Camera className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {getLevelDisplay(player.level)} • {player.gamesPlayed} games
                      </div>
                    </div>

                    {selectedPlayerIds.includes(player.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
                
                {players.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No players available</p>
                    <Button 
                      className="mt-2" 
                      onClick={() => setIsAddPlayerDialogOpen(true)}
                    >
                      Add First Player
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;