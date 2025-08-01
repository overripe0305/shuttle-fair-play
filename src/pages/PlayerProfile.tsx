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

  // Mock statistics - in a real app, these would come from match results
  const mockStats = {
    totalWins: Math.floor(player.gamesPlayed * 0.6), // 60% win rate
    totalLosses: Math.ceil(player.gamesPlayed * 0.4), // 40% loss rate
    winRate: player.gamesPlayed > 0 ? Math.round((Math.floor(player.gamesPlayed * 0.6) / player.gamesPlayed) * 100) : 0,
    streak: Math.floor(Math.random() * 5) + 1, // Random streak 1-5
    recentMatches: [
      { id: '1', opponent: 'John & Jane', result: 'Win', date: new Date('2024-01-15'), score: '21-15, 21-18' },
      { id: '2', opponent: 'Mike & Sarah', result: 'Loss', date: new Date('2024-01-12'), score: '18-21, 19-21' },
      { id: '3', opponent: 'Alex & Emma', result: 'Win', date: new Date('2024-01-10'), score: '21-16, 21-14' },
      { id: '4', opponent: 'Tom & Lisa', result: 'Win', date: new Date('2024-01-08'), score: '21-19, 18-21, 21-17' },
      { id: '5', opponent: 'Chris & Anna', result: 'Loss', date: new Date('2024-01-05'), score: '15-21, 21-18, 19-21' },
    ]
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
                  <div className="text-2xl font-bold text-green-600">{mockStats.totalWins}</div>
                  <div className="text-sm text-muted-foreground">Total Wins</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{mockStats.totalLosses}</div>
                  <div className="text-sm text-muted-foreground">Total Losses</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{mockStats.winRate}%</div>
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
                      <span className="text-lg font-semibold">{mockStats.streak} games</span>
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
                {mockStats.recentMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No match history available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockStats.recentMatches.map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={match.result === 'Win' ? 'default' : 'secondary'}
                            className={match.result === 'Win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {match.result}
                          </Badge>
                          <div>
                            <div className="font-medium">vs {match.opponent}</div>
                            <div className="text-sm text-muted-foreground">{match.score}</div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(match.date, 'MMM dd')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;