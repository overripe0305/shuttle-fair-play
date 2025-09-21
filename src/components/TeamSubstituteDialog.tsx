import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeftRight, Users, UserPlus } from 'lucide-react';
import { Player } from '@/types/player';

interface TeamSubstituteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlayer: Player | null;
  team1Players: Player[];
  team2Players: Player[];
  availablePlayers: Player[];
  onSubstitute: (oldPlayerId: string, newPlayerId: string) => void;
  onTeamTrade: (player1Id: string, player2Id: string) => void;
}

export function TeamSubstituteDialog({
  open,
  onOpenChange,
  selectedPlayer,
  team1Players,
  team2Players,
  availablePlayers,
  onSubstitute,
  onTeamTrade
}: TeamSubstituteDialogProps) {
  const [selectedAction, setSelectedAction] = useState<'substitute' | 'trade' | null>(null);
  const [selectedNewPlayer, setSelectedNewPlayer] = useState<string | null>(null);
  const [selectedTradePlayer, setSelectedTradePlayer] = useState<string | null>(null);

  if (!selectedPlayer) return null;

  const isTeam1Player = team1Players.some(p => p.id === selectedPlayer.id);
  const otherTeamPlayers = isTeam1Player ? team2Players : team1Players;

  const handleSubstitute = () => {
    if (selectedNewPlayer) {
      onSubstitute(selectedPlayer.id, selectedNewPlayer);
      handleClose();
    }
  };

  const handleTrade = () => {
    if (selectedTradePlayer) {
      onTeamTrade(selectedPlayer.id, selectedTradePlayer);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedAction(null);
    setSelectedNewPlayer(null);
    setSelectedTradePlayer(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Substitute {selectedPlayer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Player Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{selectedPlayer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedPlayer.level.major} Level {selectedPlayer.level.bracket}
                </div>
              </div>
              <Badge variant="outline" className={isTeam1Player ? 'text-blue-700 border-blue-200' : 'text-red-700 border-red-200'}>
                {isTeam1Player ? 'Team 1' : 'Team 2'}
              </Badge>
            </div>
          </div>

          {/* Action Selection */}
          {!selectedAction && (
            <div className="space-y-3">
              <Label>Choose an action:</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAction('substitute')}
                  className="h-20 flex flex-col gap-2"
                >
                  <UserPlus className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Substitute</div>
                    <div className="text-xs text-muted-foreground">Replace with available player</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedAction('trade')}
                  className="h-20 flex flex-col gap-2"
                  disabled={otherTeamPlayers.length === 0}
                >
                  <ArrowLeftRight className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Trade Teams</div>
                    <div className="text-xs text-muted-foreground">Swap with other team</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Substitute with Available Player */}
          {selectedAction === 'substitute' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedAction(null)}>
                  ← Back
                </Button>
                <Label>Select replacement player:</Label>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {availablePlayers
                  .filter(p => p.status === 'available')
                  .sort((a, b) => (a.gamesPlayed || 0) - (b.gamesPlayed || 0))
                  .map((player) => (
                  <Button
                    key={player.id}
                    variant={selectedNewPlayer === player.id ? "default" : "outline"}
                    onClick={() => setSelectedNewPlayer(player.id)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {player.level.major} Level {player.level.bracket} • {player.gamesPlayed || 0} games
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
              {availablePlayers.filter(p => p.status === 'available').length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No available players for substitution
                </div>
              )}
            </div>
          )}

          {/* Trade with Other Team */}
          {selectedAction === 'trade' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedAction(null)}>
                  ← Back
                </Button>
                <Label>Select player to trade with from {isTeam1Player ? 'Team 2' : 'Team 1'}:</Label>
              </div>
              <div className="space-y-2">
                {otherTeamPlayers.map((player) => (
                  <Button
                    key={player.id}
                    variant={selectedTradePlayer === player.id ? "default" : "outline"}
                    onClick={() => setSelectedTradePlayer(player.id)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {player.level.major} Level {player.level.bracket} • {player.gamesPlayed} games
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            {selectedAction === 'substitute' && (
              <Button 
                onClick={handleSubstitute}
                disabled={!selectedNewPlayer}
                className="flex-1"
              >
                Substitute Player
              </Button>
            )}
            {selectedAction === 'trade' && (
              <Button 
                onClick={handleTrade}
                disabled={!selectedTradePlayer}
                className="flex-1"
              >
                Trade Players
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}