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
  
  const { waitingMatches, addWaitingMatch, startWaitingMatch, removeWaitingMatch } = useWaitingMatchManager(eventId);

  const handleSelectMatch = () => {
    const match = onSelectMatch();
    if (match) {
      setSelectedMatch(match);
    }
  };

  const handleQuickMatch = () => {
    const match = onSelectMatch();
    if (match) {
      // Always add to waiting queue first, let waiting queue manager handle court availability
      addWaitingMatch(match, onPlayerStatusUpdate);
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
    .filter(p => {
      const statusMatch = p.status === 'Available' || p.status === 'available';
      const eligibleMatch = p.eligible !== false; // Allow if eligible is undefined or true
      const nameMatch = searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && eligibleMatch && nameMatch;
    });

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
                Queue
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Available courts: {Math.max(0, maxCourts - activeGamesCount)} | 
              Queued matches: {waitingMatches.length}
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* Waiting Matches Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Queue ({waitingMatches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {waitingMatches.length > 0 ? (
            waitingMatches.map((waitingMatch) => (
              <div key={waitingMatch.id} className="border rounded-lg p-4">
                {/* Team 1 */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-center">
                    Team 1 ({waitingMatch.matchData.pair1.pairType}) vs Team 2 ({waitingMatch.matchData.pair2.pairType})
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Team 1 Players */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Team 1</div>
                      {waitingMatch.matchData.pair1.players.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{player.name}</span>
                            <span className="text-xs text-muted-foreground">{player.level.major}</span>
                          </div>
                          <Badge className={levelColors[player.level.major]} variant="secondary">
                            L{player.level.bracket}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    
                    {/* Team 2 Players */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Team 2</div>
                      {waitingMatch.matchData.pair2.players.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{player.name}</span>
                            <span className="text-xs text-muted-foreground">{player.level.major}</span>
                          </div>
                          <Badge className={levelColors[player.level.major]} variant="secondary">
                            L{player.level.bracket}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Waiting for {Math.floor((new Date().getTime() - waitingMatch.createdAt.getTime()) / 60000)} minutes
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => startWaitingMatch(waitingMatch.id, 1, onStartGame, onPlayerStatusUpdate)}
                        disabled={maxCourts - activeGamesCount <= 0}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start Now
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => removeWaitingMatch(waitingMatch.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No matches in queue
            </div>
          )}
        </CardContent>
      </Card>

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
              <Label htmlFor="player-search">Search and Select Player</Label>
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
            
            {/* Direct selection interface */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {searchTerm && filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <Button
                    key={player.id}
                    variant="outline"
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => handlePlayerSubstitution(player.id)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {player.level.major} Level {player.level.bracket}
                      </span>
                    </div>
                  </Button>
                ))
              ) : searchTerm ? (
                <div className="text-center py-4 text-muted-foreground">
                  No players found matching "{searchTerm}"
                </div>
              ) : (
                 <div className="text-center py-4 text-muted-foreground">
                   Start typing to search for players
                 </div>
               )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}