import { useState } from 'react';
import { Game, getLevelDisplay } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, Users, UserX, Search } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onMarkDone: (gameId: string, winner?: 'team1' | 'team2') => void;
  onReplacePlayer?: (gameId: string, oldPlayerId: string, newPlayerId: string) => void;
  availablePlayers?: any[];
}

const levelColors = {
  'Newbie': 'bg-level-newbie text-white',
  'Beginner': 'bg-level-beginner text-white',
  'Intermediate': 'bg-level-intermediate text-white',
  'Advance': 'bg-level-advance text-white',
};

export function GameCard({ game, onMarkDone, onReplacePlayer, availablePlayers = [] }: GameCardProps) {
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    open: boolean;
    playerToReplace?: any;
  }>({ open: false });
  const [searchTerm, setSearchTerm] = useState('');

  const handlePlayerSubstitution = (newPlayerId: string) => {
    if (!substitutionDialog.playerToReplace || !onReplacePlayer) return;
    
    onReplacePlayer(game.id, substitutionDialog.playerToReplace.id, newPlayerId);
    setSubstitutionDialog({ open: false });
    setSearchTerm('');
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
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Game #{game.gameNumber}
          </span>
          <span className="text-sm text-muted-foreground">
            {new Date(game.timestamp).toLocaleTimeString()}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Team 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3 w-3" />
              Team 1 ({game.match.pair1.pairType})
            </div>
            <div className="grid grid-cols-1 gap-1 pl-5">
               {game.match.pair1.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{player.name}</span>
                    <span className="text-xs text-muted-foreground">{player.level.major}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={levelColors[player.level.major]} variant="secondary">
                      Level {player.level.bracket}
                    </Badge>
                    {!game.completed && availablePlayers.length > 0 && (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3 w-3" />
              Team 2 ({game.match.pair2.pairType})
            </div>
            <div className="grid grid-cols-1 gap-1 pl-5">
              {game.match.pair2.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{player.name}</span>
                    <span className="text-xs text-muted-foreground">{player.level.major}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={levelColors[player.level.major]} variant="secondary">
                      Level {player.level.bracket}
                    </Badge>
                    {!game.completed && availablePlayers.length > 0 && (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {!game.completed && (
          <div className="flex gap-2">
            <Button 
              onClick={() => onMarkDone(game.id, 'team1')}
              className="flex-1"
              variant="outline"
            >
              Team 1 Wins
            </Button>
            <Button 
              onClick={() => onMarkDone(game.id, 'team2')}
              className="flex-1"
              variant="outline"
            >
              Team 2 Wins
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Player Substitution Dialog */}
      <Dialog 
        open={substitutionDialog.open} 
        onOpenChange={(open) => {
          setSubstitutionDialog({ open });
          if (!open) setSearchTerm('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Player in Game</DialogTitle>
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
    </Card>
  );
}