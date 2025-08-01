import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, Users, UserX, MapPin } from 'lucide-react';
import { ActiveGame } from '@/hooks/useGameManager';

interface EnhancedGameCardProps {
  game: ActiveGame;
  onComplete: (gameId: string, winner?: 'team1' | 'team2') => void;
  onReplacePlayer?: (gameId: string, oldPlayerId: string, newPlayerId: string) => void;
  onUpdateCourt?: (gameId: string, courtId: number) => void;
  availablePlayers?: any[];
  maxCourts?: number;
}

export function EnhancedGameCard({ 
  game, 
  onComplete, 
  onReplacePlayer, 
  onUpdateCourt,
  availablePlayers = [],
  maxCourts = 4
}: EnhancedGameCardProps) {
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    open: boolean;
    playerToReplace?: { id: string; name: string };
  }>({ open: false });
  
  const [gameDuration, setGameDuration] = useState('00:00');

  // Update game duration every second for real-time display
  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      const start = new Date(game.startTime);
      const diff = now.getTime() - start.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours > 0) {
        setGameDuration(`${hours}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setGameDuration(`${mins}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000); // Update every second

    return () => clearInterval(interval);
  }, [game.startTime]);

  const handlePlayerSubstitution = (newPlayerId: string) => {
    if (!substitutionDialog.playerToReplace || !onReplacePlayer) return;
    
    onReplacePlayer(game.id, substitutionDialog.playerToReplace.id, newPlayerId);
    setSubstitutionDialog({ open: false });
  };

  const handleCourtChange = (courtId: string) => {
    if (onUpdateCourt) {
      onUpdateCourt(game.id, parseInt(courtId));
    }
  };

  const team1Players = [
    { id: game.player1Id, name: game.player1Name || 'Player 1' },
    { id: game.player2Id, name: game.player2Name || 'Player 2' }
  ];

  const team2Players = [
    { id: game.player3Id, name: game.player3Name || 'Player 3' },
    { id: game.player4Id, name: game.player4Name || 'Player 4' }
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Court {game.courtId}
            </span>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`text-white ${
                  (new Date().getTime() - new Date(game.startTime).getTime()) >= 15 * 60 * 1000 
                    ? 'bg-red-600' 
                    : 'bg-status-in-progress'
                }`}
              >
                {gameDuration}
              </Badge>
            {onUpdateCourt && (
              <Select value={game.courtId.toString()} onValueChange={handleCourtChange}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxCourts }, (_, i) => i + 1).map((court) => (
                    <SelectItem key={court} value={court.toString()}>
                      {court}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Team 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3 w-3" />
              Team 1
            </div>
            <div className="grid grid-cols-1 gap-1 pl-5">
              {team1Players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="font-medium truncate">{player.name}</span>
                  {!game.completed && availablePlayers.length > 0 && onReplacePlayer && (
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
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3 w-3" />
              Team 2
            </div>
            <div className="grid grid-cols-1 gap-1 pl-5">
              {team2Players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="font-medium truncate">{player.name}</span>
                  {!game.completed && availablePlayers.length > 0 && onReplacePlayer && (
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
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {!game.completed && (
          <div className="flex gap-2">
            <Button 
              onClick={() => onComplete(game.id, 'team1')}
              className="flex-1"
              variant="outline"
            >
              Team 1 Wins
            </Button>
            <Button 
              onClick={() => onComplete(game.id, 'team2')}
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
        onOpenChange={(open) => setSubstitutionDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Player in Game</DialogTitle>
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
    </Card>
  );
}