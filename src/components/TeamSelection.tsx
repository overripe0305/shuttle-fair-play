import { useState } from 'react';
import { GameMatch, getLevelDisplay } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Zap, UserX, Play, Clock, Search } from 'lucide-react';
import { useWaitingMatchManager } from '@/hooks/useWaitingMatchManager';

interface TeamSelectionProps {
  onSelectMatch: () => GameMatch | null;
  onStartGame: (match: GameMatch) => void;
  onReplacePlayer?: (oldPlayerId: string, newPlayerId: string) => void;
  onPlayerStatusUpdate?: (playerId: string, status: string) => void;
  availablePlayers: any[];
  maxCourts?: number;
  eventId?: string;
  activeGamesCount?: number;
}

const levelColors = {
  'Newbie': 'bg-level-newbie text-white',
  'Beginner': 'bg-level-beginner text-white',
  'Intermediate': 'bg-level-intermediate text-white',
  'Advance': 'bg-level-advance text-white',
};

export function TeamSelection({ onSelectMatch, onStartGame, onReplacePlayer, onPlayerStatusUpdate, availablePlayers, maxCourts = 4, eventId, activeGamesCount = 0 }: TeamSelectionProps) {
  const [selectedMatch, setSelectedMatch] = useState<GameMatch | null>(null);
  const [selectedCourt, setSelectedCourt] = useState(1);
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    open: boolean;
    playerToReplace?: any;
  }>({ open: false });
  const [searchTerm, setSearchTerm] = useState('');
  
  const { waitingMatches, addWaitingMatch, startWaitingMatch } = useWaitingMatchManager(eventId);

  const handleSelectMatch = () => {
    const match = onSelectMatch();
    if (match) {
      setSelectedMatch(match);
    }
  };

  const handleQuickMatch = () => {
    const match = onSelectMatch();
    if (match) {
      // If there are available courts, start immediately, otherwise add to queue
      const availableCourts = maxCourts - activeGamesCount;
      if (availableCourts > 0) {
        onStartGame(match);
      } else {
        // Add to waiting queue directly
        addWaitingMatch(match, onPlayerStatusUpdate);
      }
    }
  };

  const handleStartGame = () => {
    if (selectedMatch) {
      const availableCourts = maxCourts - activeGamesCount;
      if (availableCourts > 0) {
        onStartGame(selectedMatch);
        setSelectedMatch(null);
      } else {
        // Add to waiting queue
        addWaitingMatch(selectedMatch, onPlayerStatusUpdate);
        setSelectedMatch(null);
      }
    }
  };

  const handlePlayerSubstitution = (newPlayerId: string) => {
    if (!substitutionDialog.playerToReplace || !onReplacePlayer) return;
    
    onReplacePlayer(substitutionDialog.playerToReplace.id, newPlayerId);
    setSubstitutionDialog({ open: false });
    setSearchTerm('');
    
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

  // Filter players based on search term
  const filteredPlayers = availablePlayers
    .filter(p => p.status === 'Available' && p.eligible)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
          <div className="text-center space-y-3">
            <div className="flex gap-2">
              <Button 
                onClick={handleQuickMatch}
                size="lg"
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Quick Match
              </Button>
              
              <Button 
                onClick={handleSelectMatch}
                size="lg"
                variant="outline"
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Review Match
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Available courts: {Math.max(0, maxCourts - activeGamesCount)} | 
              Queued matches: {waitingMatches.length}
            </div>
          </div>
          
          {selectedMatch && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Review Selected Match:</h3>
              
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
                          onClick={() => {
                            setSubstitutionDialog({
                              open: true,
                              playerToReplace: player
                            });
                            setSearchTerm('');
                          }}
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
                          onClick={() => {
                            setSubstitutionDialog({
                              open: true,
                              playerToReplace: player
                            });
                            setSearchTerm('');
                          }}
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
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleStartGame}
                  className="flex-1"
                  variant="default"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {maxCourts - activeGamesCount > 0 ? `Start Game` : 'Add to Queue'}
                </Button>
                
                <Button 
                  onClick={() => setSelectedMatch(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiting Matches Queue */}
      {waitingMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Waiting Queue ({waitingMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitingMatches.map((waitingMatch) => (
              <div key={waitingMatch.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {waitingMatch.matchData.pair1.players.map(p => p.name).join(' & ')} vs{' '}
                      {waitingMatch.matchData.pair2.players.map(p => p.name).join(' & ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Waiting for {Math.floor((new Date().getTime() - waitingMatch.createdAt.getTime()) / 60000)} minutes
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => startWaitingMatch(waitingMatch.id, 1, onStartGame, onPlayerStatusUpdate)}
                    disabled={maxCourts - activeGamesCount <= 0}
                  >
                    Start Now
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player Substitution Dialog with Search */}
      <Dialog 
        open={substitutionDialog.open} 
        onOpenChange={(open) => {
          setSubstitutionDialog({ open });
          if (!open) setSearchTerm('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Replace <strong>{substitutionDialog.playerToReplace?.name}</strong> with:
            </p>
            
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="player-search">Search Players</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="player-search"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select onValueChange={handlePlayerSubstitution}>
              <SelectTrigger>
                <SelectValue placeholder="Select replacement player" />
              </SelectTrigger>
              <SelectContent>
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} - {player.level.major} Level {player.level.bracket}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No players found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}