import { useState } from 'react';
import { GameMatch, getLevelDisplay } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Zap, UserX, Play } from 'lucide-react';

interface TeamSelectionProps {
  onSelectMatch: () => GameMatch | null;
  onStartGame: (match: GameMatch) => void;
  onReplacePlayer?: (oldPlayerId: string, newPlayerId: string) => void;
  availablePlayers: any[];
  maxCourts?: number;
}

const levelColors = {
  'Newbie': 'bg-level-newbie text-white',
  'Beginner': 'bg-level-beginner text-white',
  'Intermediate': 'bg-level-intermediate text-white',
  'Advance': 'bg-level-advance text-white',
};

export function TeamSelection({ onSelectMatch, onStartGame, onReplacePlayer, availablePlayers, maxCourts = 4 }: TeamSelectionProps) {
  const [selectedMatch, setSelectedMatch] = useState<GameMatch | null>(null);
  const [selectedCourt, setSelectedCourt] = useState(1);
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    open: boolean;
    playerToReplace?: any;
  }>({ open: false });

  const handleSelectMatch = () => {
    const match = onSelectMatch();
    setSelectedMatch(match);
  };

  const handleStartGame = () => {
    if (selectedMatch) {
      onStartGame(selectedMatch);
      setSelectedMatch(null);
    }
  };

  const handlePlayerSubstitution = (newPlayerId: string) => {
    if (!substitutionDialog.playerToReplace || !onReplacePlayer) return;
    
    onReplacePlayer(substitutionDialog.playerToReplace.id, newPlayerId);
    setSubstitutionDialog({ open: false });
    
    // Update the selected match with the new player
    if (selectedMatch) {
      const newPlayer = availablePlayers.find(p => p.id === newPlayerId);
      if (!newPlayer) return;
      
      const updatedMatch = { ...selectedMatch };
      
      // Find and replace in pair1
      const pair1Index = updatedMatch.pair1.players.findIndex(p => p.id === substitutionDialog.playerToReplace.id);
      if (pair1Index !== -1) {
        updatedMatch.pair1.players[pair1Index] = newPlayer;
      } else {
        // Find and replace in pair2
        const pair2Index = updatedMatch.pair2.players.findIndex(p => p.id === substitutionDialog.playerToReplace.id);
        if (pair2Index !== -1) {
          updatedMatch.pair2.players[pair2Index] = newPlayer;
        }
      }
      
      setSelectedMatch(updatedMatch);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Zap className="h-5 w-5" />
            AI Team Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSelectMatch}
            size="lg"
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            Pick Fair Match
          </Button>
          
          {selectedMatch && (
            <div className="space-y-4">
              <h3 className="font-semibold">Selected Match:</h3>
              
              {/* Team 1 */}
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Team 1 ({selectedMatch.pair1.pairType})
                </div>
                <div className="space-y-1">
                  {selectedMatch.pair1.players.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{player.name}</span>
                        <span className="text-xs text-muted-foreground">{player.level.major}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={levelColors[player.level.major]} variant="secondary">
                          Level {player.level.bracket}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSubstitutionDialog({
                            open: true,
                            playerToReplace: player
                          })}
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Team 2 */}
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Team 2 ({selectedMatch.pair2.pairType})
                </div>
                <div className="space-y-1">
                  {selectedMatch.pair2.players.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{player.name}</span>
                        <span className="text-xs text-muted-foreground">{player.level.major}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={levelColors[player.level.major]} variant="secondary">
                          Level {player.level.bracket}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSubstitutionDialog({
                            open: true,
                            playerToReplace: player
                          })}
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="court-select">Select Court</Label>
                <Select value={selectedCourt.toString()} onValueChange={(value) => setSelectedCourt(parseInt(value))}>
                  <SelectTrigger id="court-select">
                    <SelectValue placeholder="Choose court" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxCourts }, (_, i) => i + 1).map((court) => (
                      <SelectItem key={court} value={court.toString()}>
                        Court {court}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleStartGame}
                className="w-full"
                variant="default"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Game on Court {selectedCourt}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Substitution Dialog */}
      <Dialog 
        open={substitutionDialog.open} 
        onOpenChange={(open) => setSubstitutionDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Replace <strong>{substitutionDialog.playerToReplace?.name}</strong> with:
            </p>
            <Select onValueChange={handlePlayerSubstitution}>
              <SelectTrigger>
                <SelectValue placeholder="Select replacement player" />
              </SelectTrigger>
              <SelectContent>
                {availablePlayers
                  .filter(p => p.status === 'Available' && p.eligible)
                  .map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} - {player.level.major} Level {player.level.bracket}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}