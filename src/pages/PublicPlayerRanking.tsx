import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Target, Calendar, BarChart3, Share2 } from 'lucide-react';
import { useEventPlayerStats } from '@/hooks/useEventPlayerStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import badmintonLogo from '@/assets/badminton-logo.png';

interface PublicEvent {
  id: string;
  title: string;
  date: string;
  status: string;
}

interface PublicPlayer {
  id: string;
  name: string;
  level: {
    major: string;
    sub?: string;
    bracket: number;
  };
  wins: number;
  losses: number;
  gamesPlayed: number;
}

interface GameReport {
  id: string;
  player1Name: string;
  player2Name: string;
  player3Name: string;
  player4Name: string;
  startTime: Date;
  completed: boolean;
  winner?: 'team1' | 'team2';
  courtId: number;
}

export const PublicPlayerRanking: React.FC = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState<{ playerId: string; playerName: string } | null>(null);
  const [playerGameReports, setPlayerGameReports] = useState<GameReport[]>([]);
  
  const { getPlayerStats } = useEventPlayerStats(eventId);

  useEffect(() => {
    if (eventId) {
      loadPublicEventData();
    }
  }, [eventId]);

  const loadPublicEventData = async () => {
    try {
      setLoading(true);

      // Load event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, status')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Load players for this event
      const { data: eventPlayers, error: eventPlayersError } = await supabase
        .from('event_players')
        .select('player_id')
        .eq('event_id', eventId);

      if (eventPlayersError) throw eventPlayersError;

      if (eventPlayers && eventPlayers.length > 0) {
        const playerIds = eventPlayers.map(ep => ep.player_id);
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name, major_level, sub_level')
          .in('id', playerIds);

        if (playersError) throw playersError;

        // Get player stats and create player objects
        const playersWithStats = await Promise.all(
          (playersData || []).map(async (player) => {
            const stats = getPlayerStats(player.id);
            return {
              id: player.id,
              name: player.name,
              level: {
                major: player.major_level,
                sub: player.sub_level,
                bracket: 1 // Will be calculated properly based on level
              },
              wins: stats?.wins || 0,
              losses: stats?.losses || 0,
              gamesPlayed: stats?.gamesPlayed || 0
            };
          })
        );

        setPlayers(playersWithStats);
      }
    } catch (error) {
      console.error('Error loading public event data:', error);
      toast({
        title: "Error",
        description: "Failed to load event data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankedPlayers = () => {
    const playersWithRanking = players.map(player => {
      const wins = player.wins || 0;
      const losses = player.losses || 0;
      const total = wins + losses;
      const winRate = total > 0 ? wins / total : 0;
      
      return {
        ...player,
        winRate,
        displayWinRate: total > 0 ? Math.round(winRate * 100) : 0
      };
    });

    // Sort by: Most Wins → Highest Win Rate → Highest Level → Least Losses
    playersWithRanking.sort((a, b) => {
      const winsA = a.wins || 0;
      const winsB = b.wins || 0;
      
      if (winsA !== winsB) {
        return winsB - winsA; // Highest wins first
      }
      
      // If wins are equal, sort by win rate (highest first)
      if (a.winRate !== b.winRate) {
        return b.winRate - a.winRate;
      }
      
      // If win rate is equal, sort by level (highest first) 
      if (a.level.bracket !== b.level.bracket) {
        return b.level.bracket - a.level.bracket;
      }
      
      // If level is equal, sort by losses (lowest first)
      const lossesA = a.losses || 0;
      const lossesB = b.losses || 0;
      return lossesA - lossesB;
    });

    // Assign ranks with ties
    let currentRank = 1;
    let lastWins = -1;
    let lastWinRate = -1;
    let lastLevel = -1;
    let lastLosses = -1;

    return playersWithRanking.map((player, index) => {
      const wins = player.wins || 0;
      const losses = player.losses || 0;
      
      if (index === 0 || 
          wins !== lastWins || 
          player.winRate !== lastWinRate || 
          player.level.bracket !== lastLevel || 
          losses !== lastLosses) {
        currentRank = index + 1;
      }
      
      lastWins = wins;
      lastWinRate = player.winRate;
      lastLevel = player.level.bracket;
      lastLosses = losses;
      
      return { ...player, rank: currentRank };
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 2) return <Target className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  const showPlayerMatchHistory = async (playerId: string, playerName: string) => {
    try {
      setSelectedPlayerHistory({ playerId, playerName });
      
      // Load games for this specific player
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('event_id', eventId)
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId},player3_id.eq.${playerId},player4_id.eq.${playerId}`)
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Get all unique player IDs from games
      const allPlayerIds = new Set<string>();
      games?.forEach(game => {
        allPlayerIds.add(game.player1_id);
        allPlayerIds.add(game.player2_id);
        allPlayerIds.add(game.player3_id);
        allPlayerIds.add(game.player4_id);
      });

      // Get player names
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .in('id', Array.from(allPlayerIds));

      if (playersError) throw playersError;

      const getPlayerName = (id: string) => 
        players?.find(p => p.id === id)?.name || 'Unknown';

      const gameReportsWithNames: GameReport[] = games?.map(game => ({
        id: game.id,
        player1Name: getPlayerName(game.player1_id),
        player2Name: getPlayerName(game.player2_id),
        player3Name: getPlayerName(game.player3_id),
        player4Name: getPlayerName(game.player4_id),
        startTime: new Date(game.start_time),
        completed: game.completed,
        winner: game.winner as 'team1' | 'team2' | undefined,
        courtId: game.court_id
      })) || [];

      setPlayerGameReports(gameReportsWithNames);
    } catch (error) {
      console.error('Error loading player match history:', error);
      toast({
        title: "Error",
        description: "Failed to load match history",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${event?.title} - Player Rankings`,
        text: `Check out the player rankings for ${event?.title}!`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Ranking link copied to clipboard",
      });
    }
  };

  const sortedPlayers = getRankedPlayers();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <p className="text-muted-foreground">The event you're looking for doesn't exist or isn't public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={badmintonLogo} alt="BadmintonPro" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">{event.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                  <Badge variant="outline">{event.status}</Badge>
                </div>
              </div>
            </div>
            
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share Rankings
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{players.length}</div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {players.reduce((total, player) => total + player.gamesPlayed, 0)}
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

        {/* Player Rankings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Player Rankings</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Sorted by: Most Wins → Highest Win Rate → Highest Level → Least Losses (Click Games to view match history)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedPlayers.map((player) => {
                const wins = player.wins || 0;
                const losses = player.losses || 0;
                
                return (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-12">
                        {getRankIcon(player.rank - 1)}
                        <span className="text-sm font-medium">#{player.rank}</span>
                      </div>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.level.major}{player.level.sub && ` ${player.level.sub}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{wins}W {losses}L</div>
                        <div className="text-xs text-muted-foreground">
                          {getWinRate(wins, losses)}% win rate
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showPlayerMatchHistory(player.id, player.name)}
                        disabled={player.gamesPlayed === 0}
                      >
                        {player.gamesPlayed} Games
                      </Button>
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
      </main>

      {/* Player Match History Dialog */}
      <Dialog 
        open={!!selectedPlayerHistory} 
        onOpenChange={() => setSelectedPlayerHistory(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {selectedPlayerHistory?.playerName} - Match History
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {playerGameReports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Team 1</TableHead>
                    <TableHead>Team 2</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerGameReports.map((game) => {
                    const team1Players = [game.player1Name, game.player2Name];
                    const team2Players = [game.player3Name, game.player4Name];
                    const playerIsInTeam1 = team1Players.includes(selectedPlayerHistory!.playerName);
                    const team1Won = game.winner === 'team1';
                    const team2Won = game.winner === 'team2';
                    
                    return (
                      <TableRow key={game.id}>
                        <TableCell>
                          {game.startTime.toLocaleTimeString()}
                        </TableCell>
                        <TableCell>Court {game.courtId}</TableCell>
                        <TableCell>
                          <div className={`space-y-1 ${team1Won ? 'text-green-600 font-medium' : ''}`}>
                            {team1Players.map((name, index) => (
                              <div key={index}>{name}</div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`space-y-1 ${team2Won ? 'text-green-600 font-medium' : ''}`}>
                            {team2Players.map((name, index) => (
                              <div key={index}>{name}</div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!game.completed ? (
                            <Badge variant="outline">In Progress</Badge>
                          ) : !game.winner ? (
                            <Badge variant="secondary">No Contest</Badge>
                          ) : (
                            <Badge 
                              variant={
                                (playerIsInTeam1 && team1Won) || (!playerIsInTeam1 && team2Won) 
                                  ? "default" 
                                  : "destructive"
                              }
                            >
                              {(playerIsInTeam1 && team1Won) || (!playerIsInTeam1 && team2Won) 
                                ? "Won" 
                                : "Lost"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No games found for this player
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicPlayerRanking;