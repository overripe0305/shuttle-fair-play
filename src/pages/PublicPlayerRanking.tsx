import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Target, Calendar, BarChart3, Share2, Filter } from 'lucide-react';
import { useEventPlayerStats } from '@/hooks/useEventPlayerStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import badmintonLogo from '@/assets/badminton-logo.png';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

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
  const { eventId, clubId } = useParams();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [club, setClub] = useState<{ id: string; name: string } | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string; date: string }[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState<{ playerId: string; playerName: string } | null>(null);
  const [playerGameReports, setPlayerGameReports] = useState<GameReport[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  const { getPlayerStats, loading: statsLoading, eventPlayerStats } = useEventPlayerStats(eventId);

  // Generate month options for the last 12 months
  const monthOptions = React.useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      });
    }
    return months;
  }, []);

  useEffect(() => {
    // Initialize filters from URL params for club rankings
    if (clubId) {
      const eventParam = searchParams.get('event');
      const monthParam = searchParams.get('month');
      
      if (eventParam) setSelectedEvent(eventParam);
      if (monthParam) setSelectedMonth(monthParam);
    }
    
    if (eventId) {
      loadPublicEventData();
    } else if (clubId) {
      loadClubData();
    }
  }, [eventId, clubId, searchParams]);

  // Update players with stats when eventPlayerStats changes (for event-specific rankings)
  useEffect(() => {
    if (eventPlayerStats.length > 0 && players.length > 0 && eventId) {
      console.log('Updating players with stats:', eventPlayerStats.length, 'stats for', players.length, 'players');
      const updatedPlayers = players.map(player => {
        const stats = getPlayerStats(player.id);
        console.log(`Player ${player.name} stats:`, stats);
        return {
          ...player,
          wins: stats?.wins || 0,
          losses: stats?.losses || 0,
          gamesPlayed: stats?.gamesPlayed || 0
        };
      });
      setPlayers(updatedPlayers);
    }
  }, [eventPlayerStats, players, getPlayerStats, eventId]);

  // Reload club data when filters change
  useEffect(() => {
    if (clubId && (selectedEvent !== 'all' || selectedMonth !== 'all')) {
      loadClubData();
    }
  }, [selectedEvent, selectedMonth]);

  const loadClubData = async () => {
    try {
      setLoading(true);

      // Load club data
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('id', clubId)
        .single();

      if (clubError) throw clubError;
      setClub(clubData);

      // Load events for this club
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, date')
        .eq('club_id', clubId)
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Load games with filtering
      let query = supabase
        .from('games')
        .select(`
          *,
          events!inner(club_id, date)
        `)
        .eq('completed', true)
        .eq('events.club_id', clubId);

      // Apply event filter
      if (selectedEvent !== 'all') {
        query = query.eq('event_id', selectedEvent);
      }

      // Apply month filter
      if (selectedMonth !== 'all') {
        const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
        const monthEnd = endOfMonth(monthStart);
        query = query.gte('events.date', monthStart.toISOString().split('T')[0])
                    .lte('events.date', monthEnd.toISOString().split('T')[0]);
      }

      const { data: games, error: gamesError } = await query;
      if (gamesError) throw gamesError;

      // Get all unique player IDs from games
      const playerIds = new Set<string>();
      games?.forEach(game => {
        [game.player1_id, game.player2_id, game.player3_id, game.player4_id].forEach(id => {
          if (id) playerIds.add(id);
        });
      });

      // Load all players for this club (for display even if no games)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, major_level, sub_level')
        .eq('club_id', clubId);

      if (playersError) throw playersError;

      // Calculate stats for each player
      const playerStatsMap = new Map<string, { gamesPlayed: number; wins: number; losses: number; }>();

      games?.forEach(game => {
        const gamePlayerIds = [game.player1_id, game.player2_id, game.player3_id, game.player4_id];
        const team1Ids = [game.player1_id, game.player2_id];
        const team2Ids = [game.player3_id, game.player4_id];

        gamePlayerIds.forEach(playerId => {
          if (!playerId) return;
          
          if (!playerStatsMap.has(playerId)) {
            playerStatsMap.set(playerId, { gamesPlayed: 0, wins: 0, losses: 0 });
          }

          const stats = playerStatsMap.get(playerId)!;
          stats.gamesPlayed += 1;

          // Determine if this player won or lost
          if (game.winner === 'team1' && team1Ids.includes(playerId)) {
            stats.wins += 1;
          } else if (game.winner === 'team2' && team2Ids.includes(playerId)) {
            stats.wins += 1;
          } else if (game.winner) {
            stats.losses += 1;
          }
        });
      });

      // Create player objects with stats
      const playersWithStats = (playersData || []).map((player) => {
        const stats = playerStatsMap.get(player.id) || { gamesPlayed: 0, wins: 0, losses: 0 };
        return {
          id: player.id,
          name: player.name,
          level: {
            major: player.major_level,
            sub: player.sub_level,
            bracket: 1 // Will be calculated properly based on level
          },
          wins: stats.wins,
          losses: stats.losses,
          gamesPlayed: stats.gamesPlayed
        };
      });

      setPlayers(playersWithStats);
    } catch (error) {
      console.error('Error loading club data:', error);
      toast({
        title: "Error",
        description: "Failed to load club data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

        // Create player objects without stats initially
        const playersWithoutStats = (playersData || []).map((player) => ({
          id: player.id,
          name: player.name,
          level: {
            major: player.major_level,
            sub: player.sub_level,
            bracket: 1 // Will be calculated properly based on level
          },
          wins: 0,
          losses: 0,
          gamesPlayed: 0
        }));

        setPlayers(playersWithoutStats);
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

  const getLevelValue = (level: string): number => {
    const levelMap: { [key: string]: number } = {
      'Beginner': 1,
      'Intermediate': 2,
      'Advanced': 3,
      'Professional': 4
    };
    return levelMap[level] || 0;
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
      const aLevel = getLevelValue(a.level.major);
      const bLevel = getLevelValue(b.level.major);
      if (aLevel !== bLevel) {
        return bLevel - aLevel;
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
      let url = window.location.href;
      
      // For club rankings, update URL with current filters
      if (clubId) {
        const baseUrl = window.location.origin;
        const newUrl = new URL(`${baseUrl}/club/${clubId}/ranking`);
        
        if (selectedEvent !== 'all') {
          newUrl.searchParams.set('event', selectedEvent);
        }
        if (selectedMonth !== 'all') {
          newUrl.searchParams.set('month', selectedMonth);
        }
        
        url = newUrl.toString();
      }
      
      const title = event 
        ? `${event.title} - Player Rankings`
        : club 
        ? `${club.name} - Player Rankings`
        : 'Player Rankings';
      
      const text = event 
        ? `Check out the player rankings for ${event.title}!`
        : club
        ? `Check out the player rankings for ${club.name}!`
        : 'Check out these player rankings!';
        
      await navigator.share({
        title,
        text,
        url,
      });
    } catch (error) {
      // Fallback to copying to clipboard
      let url = window.location.href;
      
      if (clubId) {
        const baseUrl = window.location.origin;
        const newUrl = new URL(`${baseUrl}/club/${clubId}/ranking`);
        
        if (selectedEvent !== 'all') {
          newUrl.searchParams.set('event', selectedEvent);
        }
        if (selectedMonth !== 'all') {
          newUrl.searchParams.set('month', selectedMonth);
        }
        
        url = newUrl.toString();
      }
      
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Ranking link copied to clipboard",
      });
    }
  };

  const sortedPlayers = getRankedPlayers();

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (!event && !club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{eventId ? 'Event not found' : 'Club not found'}</h1>
          <p className="text-muted-foreground">
            {eventId 
              ? "The event you're looking for doesn't exist or isn't public." 
              : "The club you're looking for doesn't exist or isn't accessible."
            }
          </p>
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
                <h1 className="text-2xl font-bold">
                  {event ? event.title : club ? `${club.name} - Player Rankings` : 'Player Rankings'}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {event ? (
                    <>
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                      <Badge variant="outline">{event.status}</Badge>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4" />
                      <span>Overall Club Rankings</span>
                    </>
                  )}
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
        {/* Filters for club rankings */}
        {clubId && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        {events.map(event => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      {monthOptions.map(month => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Stats */}
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