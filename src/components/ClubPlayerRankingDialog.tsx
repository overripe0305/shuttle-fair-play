import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Target, Share2, BarChart3, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ClubPlayerRankingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
}

interface PlayerRankingData {
  id: string;
  name: string;
  level: { major: string; sub?: string };
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
}

interface EventOption {
  id: string;
  title: string;
  date: string;
}

export const ClubPlayerRankingDialog: React.FC<ClubPlayerRankingDialogProps> = ({
  open,
  onOpenChange,
  clubId
}) => {
  const [playerRankings, setPlayerRankings] = useState<PlayerRankingData[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
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
    if (open && clubId) {
      loadEvents();
      loadPlayerRankings();
    }
  }, [open, clubId, selectedEvent, selectedMonth]);

  const loadEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('id, title, date')
        .eq('club_id', clubId)
        .order('date', { ascending: false });

      if (error) throw error;

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadPlayerRankings = async () => {
    setLoading(true);
    try {
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

      const { data: games, error } = await query;

      if (error) throw error;

      // Get all unique player IDs from games
      const playerIds = new Set<string>();
      games?.forEach(game => {
        [game.player1_id, game.player2_id, game.player3_id, game.player4_id].forEach(id => {
          if (id) playerIds.add(id);
        });
      });

      // Fetch player details
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, major_level, sub_level')
        .in('id', Array.from(playerIds));

      if (playersError) throw playersError;

      // Calculate stats for each player
      const playerStatsMap = new Map<string, {
        gamesPlayed: number;
        wins: number;
        losses: number;
      }>();

      games?.forEach(game => {
        const playerIds = [game.player1_id, game.player2_id, game.player3_id, game.player4_id];
        const team1Ids = [game.player1_id, game.player2_id];
        const team2Ids = [game.player3_id, game.player4_id];

        playerIds.forEach(playerId => {
          if (!playerId) return;
          
          if (!playerStatsMap.has(playerId)) {
            playerStatsMap.set(playerId, {
              gamesPlayed: 0,
              wins: 0,
              losses: 0
            });
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

      // Create ranking data
      const rankingData: PlayerRankingData[] = players?.map(player => {
        const stats = playerStatsMap.get(player.id) || { gamesPlayed: 0, wins: 0, losses: 0 };
        const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

        return {
          id: player.id,
          name: player.name,
          level: { major: player.major_level, sub: player.sub_level },
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          winRate,
          rank: 0 // Will be assigned after sorting
        };
      }) || [];

      // Sort players and assign ranks
      const sortedPlayers = rankingData
        .filter(player => player.gamesPlayed > 0)
        .sort((a, b) => {
          if (a.wins !== b.wins) return b.wins - a.wins;
          if (a.winRate !== b.winRate) return b.winRate - a.winRate;
          const aLevel = getLevelValue(a.level.major);
          const bLevel = getLevelValue(b.level.major);
          if (aLevel !== bLevel) return bLevel - aLevel;
          return a.losses - b.losses;
        })
        .map((player, index) => ({ ...player, rank: index + 1 }));

      setPlayerRankings(sortedPlayers);
    } catch (error) {
      console.error('Error loading player rankings:', error);
      toast({
        title: "Error",
        description: "Failed to load player rankings",
        variant: "destructive"
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

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-amber-600" />;
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  const handleShare = async () => {
    // Create a public ranking URL using the first event if a specific event is selected, otherwise use 'all'
    const eventParam = selectedEvent !== 'all' ? selectedEvent : (events.length > 0 ? events[0].id : '');
    const baseUrl = window.location.origin;
    const url = eventParam ? `${baseUrl}/event/${eventParam}/ranking` : window.location.href;
    const title = `Player Rankings${selectedEvent !== 'all' ? ` - ${events.find(e => e.id === selectedEvent)?.title}` : ''}${selectedMonth !== 'all' ? ` - ${monthOptions.find(m => m.value === selectedMonth)?.label}` : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: url
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "Public ranking link copied to clipboard"
        });
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive"
        });
      }
    }
  };

  const getFilterSummary = () => {
    const parts = [];
    if (selectedEvent !== 'all') {
      const event = events.find(e => e.id === selectedEvent);
      if (event) parts.push(event.title);
    }
    if (selectedMonth !== 'all') {
      const month = monthOptions.find(m => m.value === selectedMonth);
      if (month) parts.push(month.label);
    }
    return parts.length > 0 ? ` - ${parts.join(' - ')}` : '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Player Rankings{getFilterSummary()}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
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

          {/* Summary Stats */}
          {playerRankings.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <div className="text-2xl font-bold">
                    {playerRankings.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Players</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <div className="text-2xl font-bold">
                    {playerRankings.reduce((total, player) => total + player.gamesPlayed, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Games</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <div className="text-2xl font-bold">
                    {playerRankings.reduce((total, player) => total + player.wins, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Wins</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Rankings List */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">
                Player Rankings
                {loading && <span className="text-sm text-muted-foreground ml-2">(Loading...)</span>}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sorted by: Most Wins → Highest Win Rate → Highest Level → Least Losses
              </p>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-96">
              <div className="space-y-3">
                {playerRankings.map((player) => (
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
                        <div className="text-lg font-bold text-green-600">{player.wins}</div>
                        <div className="text-xs text-muted-foreground">Wins</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{player.losses}</div>
                        <div className="text-xs text-muted-foreground">Losses</div>
                      </div>
                      
                      <Badge variant={player.winRate >= 70 ? 'default' : player.winRate >= 50 ? 'secondary' : 'outline'}>
                        {player.winRate}% WR
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {playerRankings.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No player data available for the selected filters
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