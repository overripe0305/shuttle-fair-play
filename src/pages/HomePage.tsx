import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClubManager } from '@/hooks/useClubManager';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus,
  Users,
  Calendar,
  Trophy,
  Building2,
  LogOut,
  Loader2,
  ArrowRight
} from 'lucide-react';
import badmintonLogo from '@/assets/badminton-logo.png';
import { toast } from 'sonner';

const HomePage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { clubs, userProfile, loading, createClub } = useClubManager();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clubName.trim()) {
      setError('Club name is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      
      const newClub = await createClub(clubName.trim(), clubDescription.trim() || undefined);
      
      toast.success(`Club "${newClub.name}" created successfully!`);
      setIsCreateDialogOpen(false);
      setClubName('');
      setClubDescription('');
      
      // Navigate to the new club's dashboard
      navigate(`/club/${newClub.id}/dashboard`);
      
    } catch (error: any) {
      console.error('Error creating club:', error);
      setError(error.message || 'Failed to create club');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectClub = (clubId: string) => {
    navigate(`/club/${clubId}/dashboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your clubs...</span>
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
                <h1 className="text-2xl font-bold">BadmintonPro</h1>
                <p className="text-sm text-muted-foreground">Multi-Club Management Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-xs text-muted-foreground">
                  Welcome, {userProfile?.full_name || user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="h-8 px-3"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to Your Club Management Hub</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Manage multiple badminton clubs, organize events, track players, and streamline your club operations all in one place.
          </p>
        </div>

        {/* Clubs Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Your Clubs ({clubs.length})</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Club
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Club</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateClub} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="clubName">Club Name *</Label>
                    <Input
                      id="clubName"
                      placeholder="e.g., Downtown Badminton Club"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      disabled={isCreating}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clubDescription">Description (Optional)</Label>
                    <Input
                      id="clubDescription"
                      placeholder="Brief description of your club"
                      value={clubDescription}
                      onChange={(e) => setClubDescription(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="flex-1"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Club
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {clubs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No clubs yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first badminton club to start managing events and players.
                </p>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Club
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubs.map((club) => (
                <Card key={club.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{club.name}</CardTitle>
                          {club.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {club.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Manage players & events</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Schedule tournaments</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                        <span>Track performance</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full group-hover:bg-primary/90 transition-colors"
                      onClick={() => handleSelectClub(club.id)}
                    >
                      Open Club Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <h3 className="text-xl font-semibold text-center mb-8">Powerful Club Management Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h4 className="font-semibold mb-2">Player Management</h4>
                <p className="text-sm text-muted-foreground">
                  Maintain comprehensive player profiles, skill levels, and performance statistics.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h4 className="font-semibold mb-2">Event Scheduling</h4>
                <p className="text-sm text-muted-foreground">
                  Create and manage tournaments, practice sessions, and league games effortlessly.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h4 className="font-semibold mb-2">Smart Matchmaking</h4>
                <p className="text-sm text-muted-foreground">
                  AI-powered fair team selection and game management for competitive balance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;