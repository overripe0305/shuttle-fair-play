import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEventPlayerStats } from '@/hooks/useEventPlayerStats';
import { useEventManager } from '@/hooks/useEventManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Trophy, Medal, Target, Calendar, Clock, 
  DollarSign, CreditCard, Users, Receipt, 
  Search, ArrowUpDown, Plus, Edit, X, Check,
  History, BarChart3, Wallet, RefreshCw, Filter, FilterX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EventReportDialogProps {
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
      bracket: number;
    };
  }>;
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

interface PlayerReport {
  id: string;
  name: string;
  gamesPlayed: number;
  totalMinutes: number;
  wins: number;
  losses: number;
  paymentStatus: 'paid' | 'unpaid';
  paymentMethod?: 'cash' | 'online';
  paymentDate?: string;
}

type SortField = 'name' | 'gamesPlayed' | 'wins' | 'losses' | 'paymentStatus';
type SortDirection = 'asc' | 'desc';

export const EventReportDialog: React.FC<EventReportDialogProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  players
}) => {
  const navigate = useNavigate();
  const { getPlayerStats, eventPlayerStats } = useEventPlayerStats(eventId);
  const { events } = useEventManager();
  const [selectedReport, setSelectedReport] = useState<string>('');
  
  // Match History state
  const [gameReports, setGameReports] = useState<GameReport[]>([]);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [matchHistorySearch, setMatchHistorySearch] = useState('');
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState<{ playerId: string; playerName: string } | null>(null);
  
  // Player Rankings state - improved ranking logic
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

    // Sort by: Most wins -> Highest Win rate -> Highest Level -> Least Losses
    playersWithRanking.sort((a, b) => {
      // First by most wins (descending)
      const aWins = a.wins || 0;
      const bWins = b.wins || 0;
      if (aWins !== bWins) return bWins - aWins;
      
      // Then by win rate (descending)
      if (a.winRate !== b.winRate) return b.winRate - a.winRate;
      
      // Then by level bracket (descending)
      if (a.level.bracket !== b.level.bracket) return b.level.bracket - a.level.bracket;
      
      // Then by least losses (ascending)
      const aLosses = a.losses || 0;
      const bLosses = b.losses || 0;
      if (aLosses !== bLosses) return aLosses - bLosses;
      
      // If all are equal, they tie (don't sort alphabetically)
      return 0;
    });

    // Assign ranks with ties
    let currentRank = 1;
    const rankedPlayers = playersWithRanking.map((player, index) => {
      if (index > 0) {
        const prev = playersWithRanking[index - 1];
        const current = player;
        
        // Check if this player should have the same rank as previous
        const sameWins = (prev.wins || 0) === (current.wins || 0);
        const sameWinRate = Math.abs(prev.winRate - current.winRate) < 0.001;
        const sameLevel = prev.level.bracket === current.level.bracket;
        const sameLosses = (prev.losses || 0) === (current.losses || 0);
        
        if (!sameWins || !sameWinRate || !sameLevel || !sameLosses) {
          currentRank = index + 1;
        }
      }
      
      return { ...player, rank: currentRank };
    });

    return rankedPlayers;
  };

  const sortedPlayers = getRankedPlayers();

  // Billing state (reused from BillingDialog)
  const [playerReports, setPlayerReports] = useState<PlayerReport[]>([]);
  const [sortedReports, setSortedReports] = useState<PlayerReport[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [markPaymentDialog, setMarkPaymentDialog] = useState({ open: false, playerId: '', playerName: '' });
  const [expenseDialog, setExpenseDialog] = useState({ open: false });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('unpaid');
  const [cashTotal, setCashTotal] = useState(0);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  // Player pool filters
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const currentEvent = events.find(e => e.id === eventId);
  const queueFee = currentEvent?.queueFee || 0;

  useEffect(() => {
    if (open && eventId) {
      if (selectedReport === 'match-history') {
        loadGameReports();
      } else if (selectedReport === 'billing') {
        loadPlayerReports();
        loadPaymentTotals();
      }
    }
  }, [open, eventId, selectedReport, eventPlayerStats]);

  const loadGameReports = async () => {
    try {
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Get player names for each game
      const gameReportsWithNames = await Promise.all(
        (games || []).map(async (game) => {
          const playerIds = [game.player1_id, game.player2_id, game.player3_id, game.player4_id];
          const { data: players, error: playersError } = await supabase
            .from('players')
            .select('id, name')
            .in('id', playerIds);

          if (playersError) throw playersError;

          const getPlayerName = (id: string) => 
            players?.find(p => p.id === id)?.name || 'Unknown';

          return {
            id: game.id,
            player1Name: getPlayerName(game.player1_id),
            player2Name: getPlayerName(game.player2_id),
            player3Name: getPlayerName(game.player3_id),
            player4Name: getPlayerName(game.player4_id),
            startTime: new Date(game.start_time),
            completed: game.completed,
            winner: game.winner as 'team1' | 'team2' | undefined,
            courtId: game.court_id
          };
        })
      );

      setGameReports(gameReportsWithNames);
    } catch (error) {
      console.error('Error loading game reports:', error);
    }
  };

  const loadPlayerReports = async () => {
    try {
      const { data: eventPlayers, error: eventPlayersError } = await supabase
        .from('event_players')
        .select('player_id')
        .eq('event_id', eventId);

      if (eventPlayersError) throw eventPlayersError;

      if (!eventPlayers || eventPlayers.length === 0) {
        setPlayerReports([]);
        return;
      }

      const playerIds = eventPlayers.map(ep => ep.player_id);
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds);

      if (playersError) throw playersError;

      const reports: PlayerReport[] = await Promise.all(
        (playersData || []).map(async (player) => {
          const stats = await getPlayerStats(player.id);
          
          return {
            id: player.id,
            name: player.name,
            gamesPlayed: stats?.gamesPlayed || 0,
            totalMinutes: 0,
            wins: stats?.wins || 0,
            losses: stats?.losses || 0,
            paymentStatus: player.payment_status as 'paid' | 'unpaid',
            paymentMethod: player.payment_method as 'cash' | 'online' | undefined,
            paymentDate: player.payment_date
          };
        })
      );

      setPlayerReports(reports);
    } catch (error) {
      console.error('Error loading player reports:', error);
    }
  };

  const loadPaymentTotals = async () => {
    try {
      // Get payments specifically for this event
      const { data: payments, error } = await supabase
        .from('event_payments')
        .select('amount, payment_method')
        .eq('event_id', eventId);

      if (error) throw error;

      let cash = 0;
      let online = 0;

      payments?.forEach(payment => {
        const amount = Number(payment.amount) || queueFee;
        if (payment.payment_method === 'cash') {
          cash += amount;
        } else if (payment.payment_method === 'online') {
          online += amount;
        }
      });

      setCashTotal(cash);
      setOnlineTotal(online);
      setTotalRevenue(cash + online);
    } catch (error) {
      console.error('Error loading payment totals:', error);
    }
  };

  const updateGameResult = async (gameId: string, winner: 'team1' | 'team2' | 'no-contest' | 'cancelled') => {
    try {
      const updateData: any = {};
      
      if (winner === 'cancelled') {
        // Delete the game entirely
        const { error } = await supabase
          .from('games')
          .delete()
          .eq('id', gameId);
        
        if (error) throw error;
        
        toast({
          title: "Game cancelled",
          description: "Game has been removed from the database",
        });
      } else {
        // Update the game
        if (winner === 'no-contest') {
          updateData.winner = null;
          updateData.completed = true;
        } else {
          updateData.winner = winner;
          updateData.completed = true;
        }

        const { error } = await supabase
          .from('games')
          .update(updateData)
          .eq('id', gameId);

        if (error) throw error;

        toast({
          title: "Game updated",
          description: `Game result set to ${winner === 'no-contest' ? 'no contest' : `${winner} wins`}`,
        });
      }

      setEditingGame(null);
      loadGameReports();
      
      // Trigger a refresh of player stats if we're in player ranking view
      if (selectedReport === 'player-ranking') {
        // Just reload the reports without full page refresh
        loadGameReports();
      }
    } catch (error) {
      console.error('Error updating game result:', error);
      toast({
        title: "Error",
        description: "Failed to update game result",
        variant: "destructive",
      });
    }
  };

  const handlePlayerClick = (playerId: string) => {
    navigate(`/player/${playerId}`);
  };

  const handleMarkPaid = async (playerId: string, method: 'cash' | 'online') => {
    try {
      const { error: playerError } = await supabase
        .from('players')
        .update({ 
          payment_status: 'paid',
          payment_method: method,
          payment_date: new Date().toISOString()
        })
        .eq('id', playerId);

      if (playerError) throw playerError;

      const { error: paymentError } = await supabase
        .from('event_payments')
        .insert({
          event_id: eventId,
          player_id: playerId,
          amount: queueFee,
          payment_method: method,
          payment_date: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Payment recorded",
        description: `Player marked as paid via ${method}`,
      });

      loadPlayerReports();
      loadPaymentTotals();
      setMarkPaymentDialog({ open: false, playerId: '', playerName: '' });
    } catch (error) {
      console.error('Error marking payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleRevertToUnpaid = async (playerId: string) => {
    try {
      const { error: playerError } = await supabase
        .from('players')
        .update({ 
          payment_status: 'unpaid',
          payment_method: null,
          payment_date: null
        })
        .eq('id', playerId);

      if (playerError) throw playerError;

      const { error: paymentError } = await supabase
        .from('event_payments')
        .delete()
        .eq('event_id', eventId)
        .eq('player_id', playerId);

      if (paymentError) throw paymentError;

      toast({
        title: "Payment reverted",
        description: "Player marked as unpaid",
      });

      loadPlayerReports();
      loadPaymentTotals();
    } catch (error) {
      console.error('Error reverting payment:', error);
      toast({
        title: "Error",
        description: "Failed to revert payment",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort and filter reports for billing
  useEffect(() => {
    let filtered = [...playerReports];
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'gamesPlayed':
          comparison = a.gamesPlayed - b.gamesPlayed;
          break;
        case 'wins':
          comparison = a.wins - b.wins;
          break;
        case 'losses':
          comparison = a.losses - b.losses;
          break;
        case 'paymentStatus':
          comparison = a.paymentStatus.localeCompare(b.paymentStatus);
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setSortedReports(filtered);
  }, [playerReports, sortField, sortDirection, searchTerm]);

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

  const SortableHeader = ({ field, children, currentField, direction, onSort }: {
    field: SortField;
    children: React.ReactNode;
    currentField: SortField;
    direction: SortDirection;
    onSort: (field: SortField) => void;
  }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {currentField === field && (
          <ArrowUpDown className={`h-3 w-3 ${direction === 'desc' ? 'rotate-180' : ''}`} />
        )}
      </div>
    </TableHead>
  );

  const renderMatchHistory = () => {
    // Filter games based on search term
    const filteredGames = gameReports.filter(game => {
      if (!matchHistorySearch) return true;
      
      const searchLower = matchHistorySearch.toLowerCase();
      return (
        game.player1Name.toLowerCase().includes(searchLower) ||
        game.player2Name.toLowerCase().includes(searchLower) ||
        game.player3Name.toLowerCase().includes(searchLower) ||
        game.player4Name.toLowerCase().includes(searchLower)
      );
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Match History</h3>
            <Badge variant="secondary">{filteredGames.length} Games</Badge>
          </div>
        </div>
        
        {/* Search bar for match history */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by player name..."
            value={matchHistorySearch}
            onChange={(e) => setMatchHistorySearch(e.target.value)}
            className="pl-8"
          />
        </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Court</TableHead>
            <TableHead>Team 1</TableHead>
            <TableHead>Team 2</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Winner</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredGames.map((game) => (
            <TableRow key={game.id}>
              <TableCell>{game.courtId}</TableCell>
               <TableCell>
                 <div className="text-sm">
                   <div className={game.completed && game.winner === 'team1' ? 'text-green-600 font-semibold' : ''}>
                     {game.player1Name}
                   </div>
                   <div className={game.completed && game.winner === 'team1' ? 'text-green-600 font-semibold' : ''}>
                     {game.player2Name}
                   </div>
                 </div>
               </TableCell>
               <TableCell>
                 <div className="text-sm">
                   <div className={game.completed && game.winner === 'team2' ? 'text-green-600 font-semibold' : ''}>
                     {game.player3Name}
                   </div>
                   <div className={game.completed && game.winner === 'team2' ? 'text-green-600 font-semibold' : ''}>
                     {game.player4Name}
                   </div>
                 </div>
               </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{game.startTime.toLocaleDateString()}</div>
                  <div>{game.startTime.toLocaleTimeString()}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={game.completed ? 'default' : 'secondary'}>
                  {game.completed ? 'Completed' : 'In Progress'}
                </Badge>
              </TableCell>
              <TableCell>
                {game.completed && game.winner && (
                  <Badge variant="outline">
                    Team {game.winner === 'team1' ? '1' : '2'}
                  </Badge>
                )}
                {game.completed && !game.winner && (
                  <Badge variant="destructive">No Contest</Badge>
                )}
                {!game.completed && '-'}
              </TableCell>
              <TableCell>
                {editingGame === game.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => updateGameResult(game.id, 'team1')}>
                      Team 1
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateGameResult(game.id, 'team2')}>
                      Team 2
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateGameResult(game.id, 'no-contest')}>
                      No Contest
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateGameResult(game.id, 'cancelled')}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGame(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingGame(game.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {filteredGames.length === 0 && gameReports.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No games found matching search criteria
        </div>
      )}
      
      {gameReports.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No games have been played yet
        </div>
      )}
    </div>
    );
  };


  const renderPlayerMatchHistory = () => {
    if (!selectedPlayerHistory) return null;

    const playerGames = gameReports.filter(game =>
      game.player1Name === selectedPlayerHistory.playerName ||
      game.player2Name === selectedPlayerHistory.playerName ||
      game.player3Name === selectedPlayerHistory.playerName ||
      game.player4Name === selectedPlayerHistory.playerName
    );

    return (
      <Dialog open={!!selectedPlayerHistory} onOpenChange={() => setSelectedPlayerHistory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match History - {selectedPlayerHistory.playerName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Games Played</h3>
              <Badge variant="secondary">{playerGames.length} Games</Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Court</TableHead>
                  <TableHead>Team 1</TableHead>
                  <TableHead>Team 2</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>{game.courtId}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className={game.player1Name === selectedPlayerHistory.playerName ? 'font-bold text-primary' : ''}>
                          {game.player1Name}
                        </div>
                        <div className={game.player2Name === selectedPlayerHistory.playerName ? 'font-bold text-primary' : ''}>
                          {game.player2Name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className={game.player3Name === selectedPlayerHistory.playerName ? 'font-bold text-primary' : ''}>
                          {game.player3Name}
                        </div>
                        <div className={game.player4Name === selectedPlayerHistory.playerName ? 'font-bold text-primary' : ''}>
                          {game.player4Name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{game.startTime.toLocaleDateString()}</div>
                        <div>{game.startTime.toLocaleTimeString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={game.completed ? 'default' : 'secondary'}>
                        {game.completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {game.completed && game.winner && (
                        <Badge variant="outline">
                          Team {game.winner === 'team1' ? '1' : '2'}
                        </Badge>
                      )}
                      {game.completed && !game.winner && (
                        <Badge variant="destructive">No Contest</Badge>
                      )}
                      {!game.completed && '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {playerGames.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No games found for this player
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const refreshPlayerRankings = async () => {
    // Refresh player stats without full page reload
    if (selectedReport === 'player-ranking') {
      loadGameReports();
      // Trigger a re-fetch of the player stats by parent component
      window.dispatchEvent(new CustomEvent('refreshPlayerStats'));
    }
  };

  const showPlayerMatchHistory = async (playerId: string, playerName: string) => {
    // Load game reports if not already loaded
    if (gameReports.length === 0) {
      await loadGameReports();
    }
    setSelectedPlayerHistory({ playerId, playerName });
  };

  const renderPlayerRankings = () => (
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle>Player Rankings</CardTitle>
              </div>
               <p className="text-sm text-muted-foreground">
                 Sorted by: Most Wins → Highest Win Rate → Highest Level → Least Losses (Click name to view profile, Games to view match history)
               </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshPlayerRankings}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
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
                      <button
                        onClick={() => handlePlayerClick(player.id)}
                        className="font-medium hover:underline cursor-pointer text-primary"
                      >
                        {player.name}
                      </button>
                      <div className="text-sm text-muted-foreground">
                        {player.level.major} {player.level.sub && `(${player.level.sub})`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <button
                        onClick={() => showPlayerMatchHistory(player.id, player.name)}
                        className="text-lg font-bold hover:underline cursor-pointer text-primary"
                      >
                        {player.gamesPlayed}
                      </button>
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
                    
                    <Badge variant={player.displayWinRate >= 70 ? 'default' : player.displayWinRate >= 50 ? 'secondary' : 'outline'}>
                      {player.displayWinRate}% WR
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
      
      {/* Player Pool Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Pool
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                </SelectContent>
              </Select>
              {statusFilter !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setStatusFilter('all')}
                  className="flex items-center gap-1"
                >
                  <FilterX className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {statusFilter !== 'all'
              ? `Showing players with status: ${statusFilter}`
              : `Showing all ${players.length} players`
            }
          </div>
        </CardContent>
      </Card>
      
      {renderPlayerMatchHistory()}
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{cashTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {sortedReports.filter(p => p.paymentStatus === 'paid' && p.paymentMethod === 'cash').length} payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{onlineTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {sortedReports.filter(p => p.paymentStatus === 'paid' && p.paymentMethod === 'online').length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {sortedReports.filter(p => p.paymentStatus === 'paid').length} of {sortedReports.length} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sortedReports.filter(p => p.paymentStatus === 'unpaid').length}
            </div>
            <p className="text-xs text-muted-foreground">Players remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Tabs for Paid/Unpaid */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unpaid">
            Unpaid ({sortedReports.filter(p => p.paymentStatus === 'unpaid').length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({sortedReports.filter(p => p.paymentStatus === 'paid').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unpaid">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Player Name
                </SortableHeader>
                <SortableHeader field="gamesPlayed" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Games
                </SortableHeader>
                <SortableHeader field="wins" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Wins
                </SortableHeader>
                <SortableHeader field="losses" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Losses
                </SortableHeader>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports
                .filter(p => p.paymentStatus === 'unpaid')
                .map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>{player.gamesPlayed}</TableCell>
                  <TableCell>{player.wins}</TableCell>
                  <TableCell>{player.losses}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => setMarkPaymentDialog({ 
                        open: true, 
                        playerId: player.id, 
                        playerName: player.name 
                      })}
                    >
                      Mark as Paid
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="paid">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Player Name
                </SortableHeader>
                <SortableHeader field="gamesPlayed" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Games
                </SortableHeader>
                <SortableHeader field="wins" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Wins
                </SortableHeader>
                <SortableHeader field="losses" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                  Losses
                </SortableHeader>
                <TableHead>Payment Method</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports
                .filter(p => p.paymentStatus === 'paid')
                .map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>{player.gamesPlayed}</TableCell>
                  <TableCell>{player.wins}</TableCell>
                  <TableCell>{player.losses}</TableCell>
                  <TableCell>
                    <Badge variant={player.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                      {player.paymentMethod?.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevertToUnpaid(player.id)}
                    >
                      Revert to Unpaid
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Mark Payment Dialog */}
      <Dialog open={markPaymentDialog.open} onOpenChange={(open) => 
        setMarkPaymentDialog({ ...markPaymentDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment for {markPaymentDialog.playerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: 'cash' | 'online') => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleMarkPaid(markPaymentDialog.playerId, paymentMethod)}
                className="flex-1"
              >
                Confirm Payment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setMarkPaymentDialog({ open: false, playerId: '', playerName: '' })}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Event Report - {eventTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Report Type Selector */}
          <div className="flex items-center gap-4">
            <Label htmlFor="report-type">Report Type:</Label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match-history">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Match History
                  </div>
                </SelectItem>
                <SelectItem value="player-ranking">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Player Ranking
                  </div>
                </SelectItem>
                <SelectItem value="billing">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Billing
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Report Content */}
          <div className="min-h-[400px]">
            {selectedReport === 'match-history' && renderMatchHistory()}
            {selectedReport === 'player-ranking' && renderPlayerRankings()}
            {selectedReport === 'billing' && renderBilling()}
            {!selectedReport && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a report type to view event data</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};