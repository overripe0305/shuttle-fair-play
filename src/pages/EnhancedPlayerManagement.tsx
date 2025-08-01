import { useState } from 'react';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { useGameManager } from '@/hooks/useGameManager';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Search,
  ArrowLeft,
  Calendar,
  Camera,
  SortAsc,
  SortDesc,
  Filter
} from 'lucide-react';
import { MajorLevel, SubLevel, getLevelDisplay } from '@/types/player';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type SortOption = 'alphabetical' | 'gamesPlayed' | 'wins' | 'losses';
type SortOrder = 'asc' | 'desc';

const EnhancedPlayerManagement = () => {
  const { players, addPlayer, updatePlayer, deletePlayer, bulkAddPlayers } = useEnhancedPlayerManager();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [dateFilter, setDateFilter] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');

  // Add player form state
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    majorLevel: '' as MajorLevel,
    subLevel: undefined as SubLevel | undefined,
    birthday: '',
    photo: ''
  });

  const sortPlayers = (players: any[]) => {
    const sortedPlayers = [...players].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'alphabetical':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'gamesPlayed':
          aValue = a.gamesPlayed || 0;
          bValue = b.gamesPlayed || 0;
          break;
        case 'wins':
          aValue = 0; // TODO: Add wins field to player data
          bValue = 0;
          break;
        case 'losses':
          aValue = 0; // TODO: Add losses field to player data
          bValue = 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
    
    return sortedPlayers;
  };

  const filteredPlayers = sortPlayers(
    players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        const playerDate = player.createdAt;
        const matchesDate = playerDate >= startOfDay(filterDate) && playerDate <= endOfDay(filterDate);
        return matchesSearch && matchesDate;
      }
      
      return matchesSearch;
    })
  );

  const handleAddPlayer = () => {
    if (!newPlayer.name || !newPlayer.majorLevel) return;
    
    addPlayer({
      name: newPlayer.name,
      majorLevel: newPlayer.majorLevel,
      subLevel: newPlayer.subLevel,
      birthday: newPlayer.birthday ? new Date(newPlayer.birthday) : undefined,
      photo: newPlayer.photo
    });

    setNewPlayer({
      name: '',
      majorLevel: '' as MajorLevel,
      subLevel: undefined,
      birthday: '',
      photo: ''
    });
    setIsAddDialogOpen(false);
  };

  const handleBulkUpload = async () => {
    const lines = bulkData.trim().split('\n');
    const playersData = lines.map(line => {
      const name = line.trim();
      return {
        name,
        majorLevel: 'Newbie' as MajorLevel,
        subLevel: undefined
      };
    }).filter(p => p.name);

    try {
      await bulkAddPlayers(playersData);
      setBulkData('');
      setIsBulkDialogOpen(false);
    } catch (error) {
      console.error('Bulk upload failed:', error);
    }
  };

  const needsSubLevel = (major: MajorLevel) => {
    return major === 'Beginner' || major === 'Intermediate' || major === 'Advance';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Player Management</h1>
                <p className="text-sm text-muted-foreground">Manage player profiles and information</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Players</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Player Data (One name per line)</Label>
                      <Textarea
                        placeholder="John Doe&#10;Jane Smith&#10;Alex Johnson"
                        value={bulkData}
                        onChange={(e) => setBulkData(e.target.value)}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        One player name per line
                      </p>
                    </div>
                    <Button onClick={handleBulkUpload} disabled={!bulkData.trim()}>
                      Upload Players
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Player</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newPlayer.name}
                        onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                        placeholder="Player name"
                      />
                    </div>
                    
                    <div>
                      <Label>Major Level</Label>
                      <Select 
                        value={newPlayer.majorLevel} 
                        onValueChange={(value: MajorLevel) => setNewPlayer({...newPlayer, majorLevel: value, subLevel: undefined})}
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

                    {needsSubLevel(newPlayer.majorLevel) && (
                      <div>
                        <Label>Sub Level</Label>
                        <Select 
                          value={newPlayer.subLevel || ''} 
                          onValueChange={(value: SubLevel) => setNewPlayer({...newPlayer, subLevel: value})}
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
                      <Label>Birthday (Optional)</Label>
                      <Input
                        type="date"
                        value={newPlayer.birthday}
                        onChange={(e) => setNewPlayer({...newPlayer, birthday: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>Photo URL (Optional)</Label>
                      <Input
                        value={newPlayer.photo}
                        onChange={(e) => setNewPlayer({...newPlayer, photo: e.target.value})}
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>

                    <Button onClick={handleAddPlayer} disabled={!newPlayer.name || !newPlayer.majorLevel}>
                      Add Player
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  <SelectItem value="gamesPlayed">Games Played</SelectItem>
                  <SelectItem value="wins">Wins</SelectItem>
                  <SelectItem value="losses">Losses</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
              placeholder="Filter by date"
            />
            {dateFilter && (
              <Button variant="outline" size="sm" onClick={() => setDateFilter('')}>
                Clear Date
              </Button>
            )}
          </div>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlayers.map((player) => (
            <Card key={player.id}>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={player.photo} alt={player.name} />
                    <AvatarFallback>
                      <Camera className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-lg">{player.name}</CardTitle>
                <Badge className="mx-auto w-fit">
                  {getLevelDisplay(player.level)}
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  {player.birthday && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {format(player.birthday, 'MMM dd, yyyy')}
                    </div>
                  )}
                  <div>Games Played: {player.gamesPlayed}</div>
                  <div>Status: {player.status}</div>
                </div>
                
                <div className="flex gap-2">
                  <Link to={`/player/${player.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      <Edit className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => deletePlayer(player.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No players found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPlayerManagement;