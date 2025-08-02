import { useState, useEffect } from 'react';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Trophy, Search, Camera } from 'lucide-react';
import { getLevelDisplay } from '@/types/player';
import { useCumulativePlayerStats } from '@/hooks/useCumulativePlayerStats';
import { supabase } from '@/integrations/supabase/client';

interface PlayerComparisonProps {
  currentPlayer: EnhancedPlayer;
  allPlayers: EnhancedPlayer[];
}

export function PlayerComparison({ currentPlayer, allPlayers }: PlayerComparisonProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<EnhancedPlayer | null>(null);
  const [headToHeadData, setHeadToHeadData] = useState<any>(null);
  const { getPlayerStats } = useCumulativePlayerStats();

  const availablePlayers = allPlayers.filter(p => 
    p.id !== currentPlayer.id && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get actual player stats from the cumulative stats hook
  const currentStats = getPlayerStats(currentPlayer.id);
  const selectedStats = selectedPlayer ? getPlayerStats(selectedPlayer.id) : null;

  // Calculate head-to-head statistics when a player is selected
  useEffect(() => {
    if (selectedPlayer) {
      calculateHeadToHeadStats(currentPlayer.id, selectedPlayer.id);
    }
  }, [selectedPlayer, currentPlayer.id]);

  const calculateHeadToHeadStats = async (player1Id: string, player2Id: string) => {
    try {
      // Get all completed games where both players participated
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('completed', true);

      if (error) throw error;

      let winsAgainst = 0;
      let winsTogether = 0;
      let totalGamesAgainst = 0;
      let totalGamesTogether = 0;

      // Filter games where both players participated
      const relevantGames = games?.filter(game => {
        const allPlayers = [game.player1_id, game.player2_id, game.player3_id, game.player4_id];
        return allPlayers.includes(player1Id) && allPlayers.includes(player2Id);
      }) || [];

      relevantGames.forEach(game => {
        const team1 = [game.player1_id, game.player2_id];
        const team2 = [game.player3_id, game.player4_id];
        
        const player1InTeam1 = team1.includes(player1Id);
        const player2InTeam1 = team1.includes(player2Id);
        
        if (player1InTeam1 === player2InTeam1) {
          // Same team (teammates)
          totalGamesTogether++;
          if ((player1InTeam1 && game.winner === 'team1') || (!player1InTeam1 && game.winner === 'team2')) {
            winsTogether++;
          }
        } else {
          // Opposite teams (opponents)
          totalGamesAgainst++;
          if ((player1InTeam1 && game.winner === 'team1') || (!player1InTeam1 && game.winner === 'team2')) {
            winsAgainst++;
          }
        }
      });

      setHeadToHeadData({
        winsAgainst,
        winsTogether,
        totalGamesAgainst,
        totalGamesTogether
      });
    } catch (error) {
      console.error('Error calculating head-to-head stats:', error);
      setHeadToHeadData({
        winsAgainst: 0,
        winsTogether: 0,
        totalGamesAgainst: 0,
        totalGamesTogether: 0
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Users className="h-4 w-4 mr-2" />
          Compare with Other Players
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Player Comparison</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Player Selection */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players to compare..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {searchTerm && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {availablePlayers.map(player => (
                  <div
                    key={player.id}
                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.photo} alt={player.name} />
                        <AvatarFallback>
                          <Camera className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getLevelDisplay(player.level)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {availablePlayers.length === 0 && (
                  <div className="p-3 text-center text-muted-foreground">
                    No players found
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedPlayer && (
            <div className="space-y-6">
              {/* Player Info Comparison */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-2">
                      <AvatarImage src={currentPlayer.photo} alt={currentPlayer.name} />
                      <AvatarFallback>
                        <Camera className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle>{currentPlayer.name}</CardTitle>
                    <Badge>{getLevelDisplay(currentPlayer.level)}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentStats.gamesPlayed}</div>
                      <div className="text-sm text-muted-foreground">Games Played</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{currentStats.wins}</div>
                      <div className="text-sm text-muted-foreground">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{currentStats.losses}</div>
                      <div className="text-sm text-muted-foreground">Losses</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-2">
                      <AvatarImage src={selectedPlayer.photo} alt={selectedPlayer.name} />
                      <AvatarFallback>
                        <Camera className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle>{selectedPlayer.name}</CardTitle>
                    <Badge>{getLevelDisplay(selectedPlayer.level)}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedStats!.gamesPlayed}</div>
                      <div className="text-sm text-muted-foreground">Games Played</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{selectedStats!.wins}</div>
                      <div className="text-sm text-muted-foreground">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{selectedStats!.losses}</div>
                      <div className="text-sm text-muted-foreground">Losses</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Head-to-Head Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Head-to-Head Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-lg font-semibold">As Opponents</div>
                      <div className="mt-2 space-y-1">
                        <div className="text-2xl font-bold">{headToHeadData?.winsAgainst || 0}</div>
                        <div className="text-sm text-muted-foreground">
                          Wins against {selectedPlayer.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          out of {headToHeadData?.totalGamesAgainst || 0} games
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold">As Teammates</div>
                      <div className="mt-2 space-y-1">
                        <div className="text-2xl font-bold">{headToHeadData?.winsTogether || 0}</div>
                        <div className="text-sm text-muted-foreground">
                          Wins together
                        </div>
                        <div className="text-xs text-muted-foreground">
                          out of {headToHeadData?.totalGamesTogether || 0} games
                        </div>
                      </div>
                    </div>
                  </div>

                  {(!headToHeadData || (headToHeadData.totalGamesAgainst === 0 && headToHeadData.totalGamesTogether === 0)) && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No games played together yet</p>
                      <p className="text-sm">Statistics will appear after playing games</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedPlayer && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Search and select a player to compare statistics</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}