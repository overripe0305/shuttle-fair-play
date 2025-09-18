import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Search, Plus } from 'lucide-react';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { MajorLevel, SubLevel, getLevelDisplay } from '@/types/player';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddPlayerToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availablePlayers: EnhancedPlayer[];
  onAddExistingPlayer: (playerId: string) => Promise<void>;
  onAddNewPlayer: (playerData: { name: string; majorLevel: MajorLevel; subLevel?: SubLevel }) => Promise<void>;
  allowMultiple?: boolean;
  pairMode?: boolean; // New prop for tournament pair mode
}

export function AddPlayerToEventDialog({ 
  open, 
  onOpenChange, 
  availablePlayers, 
  onAddExistingPlayer,
  onAddNewPlayer,
  allowMultiple = false,
  pairMode = false
}: AddPlayerToEventDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    majorLevel: '' as MajorLevel,
    subLevel: undefined as SubLevel | undefined,
  });

  const filteredPlayers = availablePlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const needsSubLevel = (major: MajorLevel) => {
    return major === 'Beginner' || major === 'Intermediate' || major === 'Advance';
  };

  const handleAddNewPlayer = () => {
    if (!newPlayer.name || !newPlayer.majorLevel) return;
    
    onAddNewPlayer({
      name: newPlayer.name,
      majorLevel: newPlayer.majorLevel,
      subLevel: newPlayer.subLevel,
    });

    setNewPlayer({
      name: '',
      majorLevel: '' as MajorLevel,
      subLevel: undefined,
    });
    setShowNewPlayerForm(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearchTerm('');
    setShowNewPlayerForm(false);
    setSelectedPlayers(new Set());
    setNewPlayer({
      name: '',
      majorLevel: '' as MajorLevel,
      subLevel: undefined,
    });
    onOpenChange(false);
  };

  const handlePlayerToggle = (playerId: string) => {
    if (allowMultiple || pairMode) {
      const newSelected = new Set(selectedPlayers);
      if (newSelected.has(playerId)) {
        newSelected.delete(playerId);
      } else {
        // For pair mode, limit to 2 selections
        if (pairMode && newSelected.size >= 2) {
          return; // Don't allow more than 2 selections in pair mode
        }
        newSelected.add(playerId);
      }
      setSelectedPlayers(newSelected);
    } else {
      onAddExistingPlayer(playerId);
      handleClose();
    }
  };

  const handleAddSelectedPlayers = async () => {
    for (const playerId of selectedPlayers) {
      await onAddExistingPlayer(playerId);
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pairMode ? 'Add Player Pair to Tournament' : 'Add Player to Event'}
          </DialogTitle>
          {pairMode && (
            <p className="text-sm text-muted-foreground">
              Select exactly 2 players to form a pair for the tournament
            </p>
          )}
        </DialogHeader>
        
        {!showNewPlayerForm ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search existing players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                    (allowMultiple || pairMode) && selectedPlayers.has(player.id) ? 'bg-primary/10 border-primary' : ''
                  }`}
                  onClick={() => handlePlayerToggle(player.id)}
                >
                  {(allowMultiple || pairMode) && (
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.id)}
                      onChange={() => handlePlayerToggle(player.id)}
                      className="rounded"
                    />
                  )}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={player.photo} alt={player.name} />
                    <AvatarFallback>
                      <Camera className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.level.major}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredPlayers.length === 0 && searchTerm && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No players found matching "{searchTerm}"</p>
                </div>
              )}
            </div>

            {((allowMultiple && selectedPlayers.size > 0) || (pairMode && selectedPlayers.size === 2)) && (
              <Button onClick={handleAddSelectedPlayers} className="w-full">
                {pairMode 
                  ? `Add Pair (${selectedPlayers.size}/2)` 
                  : `Add ${selectedPlayers.size} Player${selectedPlayers.size > 1 ? 's' : ''}`
                }
              </Button>
            )}

            {pairMode && selectedPlayers.size > 0 && selectedPlayers.size < 2 && (
              <div className="text-center text-sm text-muted-foreground">
                Select {2 - selectedPlayers.size} more player{2 - selectedPlayers.size > 1 ? 's' : ''} to form a pair
              </div>
            )}
            
            <Button 
              onClick={() => setShowNewPlayerForm(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Player
            </Button>
          </div>
        ) : (
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

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNewPlayerForm(false)} 
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleAddNewPlayer} 
                disabled={!newPlayer.name || !newPlayer.majorLevel}
                className="flex-1"
              >
                Add Player
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}