import { useParams, Link } from 'react-router-dom';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Trophy,
  Target,
  Calendar,
  Camera,
  TrendingUp,
  Award,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { getLevelDisplay } from '@/types/player';

const PlayerProfile = () => {
  const { playerId } = useParams();
  const { players } = useEnhancedPlayerManager();

  const player = players.find(p => p.id === playerId);

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

  // Real statistics based on actual player data
  const stats = {
    totalWins: 0, // TODO: Calculate from actual match results
    totalLosses: 0, // TODO: Calculate from actual match results
    winRate: 0,
    streak: 0,
    recentMatches: [] // TODO: Get from actual match history
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
                  <div className="text-2xl font-bold text-green-600">{stats.totalWins}</div>
                  <div className="text-sm text-muted-foreground">Total Wins</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.totalLosses}</div>
                  <div className="text-sm text-muted-foreground">Total Losses</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{stats.winRate}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{player.gamesPlayed}</div>
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
                        <span className="text-lg font-semibold">{stats.streak} games</span>
                      </div>
                    </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Penalty/Bonus</div>
                    <div className="text-lg font-semibold">
                      {player.gamePenaltyBonus > 0 ? '+' : ''}{player.gamePenaltyBonus}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Match History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Recent Match History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>No match history available</p>
                  <p className="text-sm mt-2">Match history will appear here after playing games</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;