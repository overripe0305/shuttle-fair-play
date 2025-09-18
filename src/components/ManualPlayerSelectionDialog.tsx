import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Users, X } from 'lucide-react';
import { Player } from '@/types/player';

interface ManualPlayerSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availablePlayers: Player[];
  onPlayersSelected: (players: Player[]) => void;
}

export function ManualPlayerSelectionDialog({
  open,
  onOpenChange,
  availablePlayers,
  onPlayersSelected
}: ManualPlayerSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

  const filteredPlayers = useMemo(() => {
    return availablePlayers.filter(player =>
      player.status === 'available' &&
      player.eligible !== false &&
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedPlayers.find(sp => sp.id === player.id)
    );
  }, [availablePlayers, searchTerm, selectedPlayers]);

  const handlePlayerSelect = (player: Player) => {
    if (selectedPlayers.length < 4) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handlePlayerRemove = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
  };

  const handleConfirm = () => {
    if (selectedPlayers.length === 4) {
      onPlayersSelected(selectedPlayers);
      setSelectedPlayers([]);
      setSearchTerm('');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedPlayers([]);
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select 4 Players for Manual Match
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Selected Players */}
          <div className="space-y-2">
            <Label>Selected Players ({selectedPlayers.length}/4)</Label>
            <div className="min-h-[60px] p-3 border border-dashed border-muted-foreground/30 rounded-lg">
              {selectedPlayers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((player) => (
                    <Badge
                      key={player.id}
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {player.name}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handlePlayerRemove(player.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  Select players from the list below
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="player-search">Search Available Players</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="player-search"
                placeholder="Type player name to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Available Players List */}
          <div className="flex-1 overflow-hidden">
            <Label>Available Players ({filteredPlayers.length})</Label>
            <div className="mt-2 h-full max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <Button
                    key={player.id}
                    variant="outline"
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => handlePlayerSelect(player)}
                    disabled={selectedPlayers.length >= 4}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {player.level.major} Level {player.level.bracket} • {player.gamesPlayed} games
                      </span>
                    </div>
                  </Button>
                ))
              ) : searchTerm ? (
                <div className="text-center py-8 text-muted-foreground">
                  No players found matching "{searchTerm}"
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No available players
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedPlayers.length !== 4}
              className="flex-1"
            >
              Create Match ({selectedPlayers.length}/4)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}