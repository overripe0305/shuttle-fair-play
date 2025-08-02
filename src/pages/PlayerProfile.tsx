import { useParams, Link } from 'react-router-dom';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { useCumulativePlayerStats } from '@/hooks/useCumulativePlayerStats';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayerComparison } from '@/components/PlayerComparison';
import { 
  ArrowLeft,
  Trophy,
  Target,
  Calendar,
  Camera,
  TrendingUp,
  Award,
  Activity,
  Edit2,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { getLevelDisplay, MajorLevel, SubLevel } from '@/types/player';
import { useState, useEffect } from 'react';

const PlayerProfile = () => {
  const { playerId } = useParams();
  const { players, updatePlayer } = useEnhancedPlayerManager();
  const { getPlayerStats, playerStats: allPlayerStats } = useCumulativePlayerStats();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState({
    totalWins: 0,
    totalLosses: 0,
    winRate: 0
  });
  const [editForm, setEditForm] = useState({
    name: '',
    majorLevel: '' as MajorLevel,
    subLevel: undefined as SubLevel | undefined,
    photo: '',
    birthday: ''
  });

  const player = players.find(p => p.id === playerId);

  // Load player game history and stats
  useEffect(() => {
    if (playerId) {
      loadPlayerGameHistory();
      loadPlayerStats();
    }
  }, [playerId, allPlayerStats]); // Add allPlayerStats dependency to refresh when stats change

  // Set up real-time sync for game updates
  useEffect(() => {
    if (!playerId) return;

    const channel = supabase
      .channel('player-profile-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games'
        },
        () => {
          // Reload stats and game history when any game is updated
          loadPlayerGameHistory();
          loadPlayerStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  const loadPlayerGameHistory = async () => {
    try {
      // First, get the games where this player participated
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId},player3_id.eq.${playerId},player4_id.eq.${playerId}`)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (gamesError) throw gamesError;

      if (games && games.length > 0) {
        // Get all unique player IDs from the games
        const playerIds = new Set<string>();
        games.forEach(game => {
          playerIds.add(game.player1_id);
          playerIds.add(game.player2_id);
          playerIds.add(game.player3_id);
          playerIds.add(game.player4_id);
        });

        // Fetch player names for all involved players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .in('id', Array.from(playerIds));

        if (playersError) throw playersError;

        // Create a map of player ID to name
        const playerNameMap = new Map();
        playersData?.forEach(player => {
          playerNameMap.set(player.id, player.name);
        });

        // Enhance games with player names
        const enhancedGames = games.map(game => ({
          ...game,
          player1: { name: playerNameMap.get(game.player1_id) },
          player2: { name: playerNameMap.get(game.player2_id) },
          player3: { name: playerNameMap.get(game.player3_id) },
          player4: { name: playerNameMap.get(game.player4_id) }
        }));

        setGameHistory(enhancedGames);
      } else {
        setGameHistory([]);
      }
    } catch (error) {
      console.error('Error loading game history:', error);
      setGameHistory([]);
    }
  };

  const loadPlayerStats = async () => {
    try {
      // Use cumulative stats from the new hook
      const cumulativeStats = getPlayerStats(playerId!);
      
      const totalGames = cumulativeStats.wins + cumulativeStats.losses;
      const winRate = totalGames > 0 ? Math.round((cumulativeStats.wins / totalGames) * 100) : 0;

      setPlayerStats({
        totalWins: cumulativeStats.wins,
        totalLosses: cumulativeStats.losses,
        winRate
      });
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  };

  // Initialize edit form when player is loaded
  useEffect(() => {
    if (player) {
      setEditForm({
        name: player.name,
        majorLevel: player.level.major,
        subLevel: player.level.sub,
        photo: player.photo || '',
        birthday: player.birthday ? format(player.birthday, 'yyyy-MM-dd') : ''
      });
    }
  }, [player]);

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Player Not Found</h1>
          <Link to="/players">
            <Button>Return to Players</Button>
          </Link>
        </div>
      </div>
    );
  }

  const needsSubLevel = (major: MajorLevel) => {
    return major === 'Beginner' || major === 'Intermediate' || major === 'Advance';
  };

  const handleSaveEdit = async () => {
    try {
      const updateData: any = {
        name: editForm.name,
        level: {
          major: editForm.majorLevel,
          sub: editForm.subLevel,
          bracket: 1 // Will be recalculated
        },
        photo: editForm.photo || undefined,
        birthday: editForm.birthday ? new Date(editForm.birthday) : undefined
      };
      
      await updatePlayer(player.id, updateData);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update player:', error);
    }
  };

  // Calculate current streak from recent games
  const calculateStreak = () => {
    if (gameHistory.length === 0) return 0;
    
    let streak = 0;
    let lastResult = null;
    
    for (const game of gameHistory) {
      const isWinner = game.winner === 'team1' 
        ? [game.player1_id, game.player2_id].includes(playerId)
        : game.winner === 'team2' 
        ? [game.player3_id, game.player4_id].includes(playerId)
        : null;
      
      if (lastResult === null) {
        lastResult = isWinner;
        streak = isWinner ? 1 : 1;
      } else if (lastResult === isWinner) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/players">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Players
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Player Profile</h1>
                <p className="text-sm text-muted-foreground">Detailed player statistics and information</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Player Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={player.photo} alt={player.name} />
                    <AvatarFallback className="text-2xl">
                      <Camera className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-2xl">{player.name}</CardTitle>
                <Badge className="mx-auto w-fit text-lg px-3 py-1">
                  {getLevelDisplay(player.level)}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditDialogOpen(true)}
                  className="mt-2"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit Profile
                </Button>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {player.birthday && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Birthday</div>
                        <div className="font-medium">{format(player.birthday, 'MMM dd, yyyy')}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="font-medium">{player.status}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Bracket Level</div>
                      <div className="font-medium">{player.level.bracket}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{playerStats.totalWins}</div>
                  <div className="text-sm text-muted-foreground">Total Wins</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{playerStats.totalLosses}</div>
                  <div className="text-sm text-muted-foreground">Total Losses</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{playerStats.winRate}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{getPlayerStats(playerId!).gamesPlayed}</div>
                  <div className="text-sm text-muted-foreground">Games Played</div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Current Streak</div>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-semibold">{calculateStreak()} games</span>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Game History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gameHistory.length > 0 ? (
                    gameHistory.map((game) => (
                      <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            Court {game.court_id} - {format(new Date(game.created_at), 'MMM dd, HH:mm')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Players: {game.player1?.name}, {game.player2?.name}, {game.player3?.name}, {game.player4?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {game.winner ? `Winner: ${game.winner === 'team1' ? `${game.player1?.name} & ${game.player2?.name}` : `${game.player3?.name} & ${game.player4?.name}`}` : 'No winner recorded'}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            game.winner === 'team1' && [game.player1_id, game.player2_id].includes(playerId) ||
                            game.winner === 'team2' && [game.player3_id, game.player4_id].includes(playerId)
                              ? 'default' : 'secondary'
                          }
                        >
                          {game.winner === 'team1' && [game.player1_id, game.player2_id].includes(playerId) ||
                           game.winner === 'team2' && [game.player3_id, game.player4_id].includes(playerId)
                            ? 'Win' : 'Loss'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No games played yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Player Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Player Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerComparison currentPlayer={player} allPlayers={players} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Player Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Player name"
              />
            </div>
            
            <div>
              <Label>Major Level</Label>
              <Select 
                value={editForm.majorLevel} 
                onValueChange={(value: MajorLevel) => setEditForm({
                  ...editForm, 
                  majorLevel: value, 
                  subLevel: needsSubLevel(value) ? editForm.subLevel : undefined
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select major level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Newbie">Newbie</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advance">Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsSubLevel(editForm.majorLevel) && (
              <div>
                <Label>Sub Level</Label>
                <Select 
                  value={editForm.subLevel || ''} 
                  onValueChange={(value: SubLevel) => setEditForm({...editForm, subLevel: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Photo URL (Optional)</Label>
              <Input
                value={editForm.photo}
                onChange={(e) => setEditForm({...editForm, photo: e.target.value})}
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <div>
              <Label>Birthday (Optional)</Label>
              <Input
                type="date"
                value={editForm.birthday}
                onChange={(e) => setEditForm({...editForm, birthday: e.target.value})}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerProfile;