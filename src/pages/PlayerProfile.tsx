import { useParams, Link } from 'react-router-dom';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
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
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { getLevelDisplay, MajorLevel, SubLevel } from '@/types/player';
import { useState, useEffect } from 'react';

const PlayerProfile = () => {
  const { playerId } = useParams();
  const { players, updatePlayer } = useEnhancedPlayerManager();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    majorLevel: '' as MajorLevel,
    subLevel: undefined as SubLevel | undefined,
    photo: '',
    birthday: ''
  });

  const player = players.find(p => p.id === playerId);

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