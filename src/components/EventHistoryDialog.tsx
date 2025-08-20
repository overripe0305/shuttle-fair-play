import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Target } from 'lucide-react';

interface EventHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  players: Array<{
    id: string;
    name: string;
    gamesPlayed: number;
    wins?: number;
    losses?: number;
    level: {
      major: string;
      sub?: string;
    };
  }>;
}

export const EventHistoryDialog: React.FC<EventHistoryDialogProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  players
}) => {
  // Sort players by: highest games played → highest wins → lowest losses → alphabetical
  const sortedPlayers = [...players].sort((a, b) => {
    // Highest games played first
    const gamesResult = b.gamesPlayed - a.gamesPlayed;
    if (gamesResult !== 0) return gamesResult;
    
    // Then highest wins
    const aWins = a.wins || 0;
    const bWins = b.wins || 0;
    const winsResult = bWins - aWins;
    if (winsResult !== 0) return winsResult;
    
    // Then lowest losses
    const aLosses = a.losses || 0;
    const bLosses = b.losses || 0;
    const lossesResult = aLosses - bLosses;
    if (lossesResult !== 0) return lossesResult;
    
    // Finally alphabetical
    return a.name.localeCompare(b.name);
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1: return <Medal className="h-4 w-4 text-gray-400" />;
      case 2: return <Medal className="h-4 w-4 text-amber-600" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Event History - {eventTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{players.length}</div>
                <div className="text-sm text-muted-foreground">Total Players</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {Math.floor(players.reduce((total, player) => total + player.gamesPlayed, 0) / 4)}
                </div>
                <div className="text-sm text-muted-foreground">Total Games</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {players.reduce((total, player) => total + (player.wins || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Wins</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Player Rankings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sorted by: Games Played → Wins → Losses → Name
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedPlayers.map((player, index) => {
                  const wins = player.wins || 0;
                  const losses = player.losses || 0;
                  const winRate = getWinRate(wins, losses);
                  
                  return (
                    <div 
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-8">
                          {getRankIcon(index)}
                          <span className="text-sm font-medium">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.level.major} {player.level.sub && `(${player.level.sub})`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold">{player.gamesPlayed}</div>
                          <div className="text-xs text-muted-foreground">Games</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{wins}</div>
                          <div className="text-xs text-muted-foreground">Wins</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">{losses}</div>
                          <div className="text-xs text-muted-foreground">Losses</div>
                        </div>
                        
                        <Badge variant={winRate >= 70 ? 'default' : winRate >= 50 ? 'secondary' : 'outline'}>
                          {winRate}% WR
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                
                {sortedPlayers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No player data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};