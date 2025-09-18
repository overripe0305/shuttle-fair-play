import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Users, X, UserPlus } from 'lucide-react';
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
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);

  const filteredPlayers = useMemo(() => {
    const allSelectedPlayers = [...team1Players, ...team2Players];
    return availablePlayers.filter(player =>
      player.status === 'available' &&
      player.eligible !== false &&
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !allSelectedPlayers.find(sp => sp.id === player.id)
    );
  }, [availablePlayers, searchTerm, team1Players, team2Players]);

  const handlePlayerSelect = (player: Player, team: 1 | 2) => {
    if (team === 1 && team1Players.length < 2) {
      setTeam1Players([...team1Players, player]);
    } else if (team === 2 && team2Players.length < 2) {
      setTeam2Players([...team2Players, player]);
    }
  };

  const handlePlayerRemove = (playerId: string, team: 1 | 2) => {
    if (team === 1) {
      setTeam1Players(team1Players.filter(p => p.id !== playerId));
    } else {
      setTeam2Players(team2Players.filter(p => p.id !== playerId));
    }
  };

  const handleConfirm = () => {
    const totalPlayers = team1Players.length + team2Players.length;
    if (totalPlayers === 4) {
      const allPlayers = [...team1Players, ...team2Players];
      onPlayersSelected(allPlayers);
      setTeam1Players([]);
      setTeam2Players([]);
      setSearchTerm('');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setTeam1Players([]);
    setTeam2Players([]);
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
          {/* Team Selection Areas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team 1 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-blue-500" />
                Team 1 ({team1Players.length}/2)
              </Label>
              <div className="min-h-[80px] p-3 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/50">
                {team1Players.length > 0 ? (
                  <div className="space-y-2">
                    {team1Players.map((player) => (
                      <Badge
                        key={player.id}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 border-blue-200"
                      >
                        {player.name}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white"
                          onClick={() => handlePlayerRemove(player.id, 1)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-blue-500/70 text-sm">
                    Select 2 players for Team 1
                  </div>
                )}
              </div>
            </div>

            {/* Team 2 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-red-500" />
                Team 2 ({team2Players.length}/2)
              </Label>
              <div className="min-h-[80px] p-3 border-2 border-dashed border-red-200 rounded-lg bg-red-50/50">
                {team2Players.length > 0 ? (
                  <div className="space-y-2">
                    {team2Players.map((player) => (
                      <Badge
                        key={player.id}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 border-red-200"
                      >
                        {player.name}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white"
                          onClick={() => handlePlayerRemove(player.id, 2)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-red-500/70 text-sm">
                    Select 2 players for Team 2
                  </div>
                )}
              </div>
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
            <div className="mt-2 h-full max-h-[250px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <div key={player.id} className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 justify-start p-3 h-auto"
                      onClick={() => handlePlayerSelect(player, 1)}
                      disabled={team1Players.length >= 2}
                    >
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-blue-500" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{player.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {player.level.major} Level {player.level.bracket} • Add to Team 1
                          </span>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start p-3 h-auto"
                      onClick={() => handlePlayerSelect(player, 2)}
                      disabled={team2Players.length >= 2}
                    >
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-red-500" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{player.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {player.level.major} Level {player.level.bracket} • Add to Team 2
                          </span>
                        </div>
                      </div>
                    </Button>
                  </div>
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
              disabled={team1Players.length !== 2 || team2Players.length !== 2}
              className="flex-1"
            >
              Create Match (Team 1: {team1Players.length}/2, Team 2: {team2Players.length}/2)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}