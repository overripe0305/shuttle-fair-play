import { useState, useCallback, useMemo } from 'react';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerEditDialog } from '@/components/PlayerEditDialog';
import { AddPlayerDialog } from '@/components/AddPlayerDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { MajorLevel, SubLevel } from '@/types/player';

const PlayerManagement = () => {
  const { players, addPlayer, updatePlayer, deletePlayer } = useEnhancedPlayerManager();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'All'>('All');
  const [gamesFilter, setGamesFilter] = useState<number | 'All'>('All');
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === 'All' || player.level.bracket === levelFilter;
      const matchesGames = gamesFilter === 'All' || player.gamesPlayed === gamesFilter;
      return matchesSearch && matchesLevel && matchesGames;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [players, searchTerm, levelFilter, gamesFilter]);

  const handleAddPlayer = async (playerData: { name: string; majorLevel: MajorLevel; subLevel?: SubLevel }) => {
    // Check for duplicate names
    const existingPlayer = players.find(p => p.name.toLowerCase() === playerData.name.toLowerCase());
    if (existingPlayer) {
      toast.error('A player with this name already exists');
      return;
    }

    try {
      await addPlayer(playerData);
      toast.success(`${playerData.name} created successfully`);
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create player');
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: { name?: string; majorLevel?: MajorLevel; subLevel?: SubLevel }) => {
    // Check for duplicate names if name is being updated
    if (updates.name) {
      const existingPlayer = players.find(p => p.id !== playerId && p.name.toLowerCase() === updates.name.toLowerCase());
      if (existingPlayer) {
        toast.error('A player with this name already exists');
        return;
      }
    }

    try {
      await updatePlayer(playerId, updates);
      toast.success('Player updated successfully');
      setEditingPlayer(null);
    } catch (error) {
      toast.error('Failed to update player');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    if (confirm(`Are you sure you want to permanently delete ${player.name}?`)) {
      try {
        await deletePlayer(playerId);
        toast.success('Player deleted successfully');
      } catch (error) {
        toast.error('Failed to delete player');
      }
    }
  };

  // Get available bracket levels and game counts for filtering
  const availableBrackets = useMemo(() => {
    return [...new Set(players.map(p => p.level.bracket))].sort((a, b) => a - b);
  }, [players]);

  const availableGameCounts = useMemo(() => {
    return [...new Set(players.map(p => p.gamesPlayed))].sort((a, b) => a - b);
  }, [players]);

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Player Management</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Players ({filteredPlayers.length})
            </CardTitle>
            
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Level:</span>
                <Button
                  variant={levelFilter === 'All' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLevelFilter('All')}
                >
                  All
                </Button>
                {availableBrackets.map(bracket => (
                  <Button
                    key={bracket}
                    variant={levelFilter === bracket ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLevelFilter(bracket)}
                    className={levelFilter === bracket ? 'text-white' : ''}
                  >
                    Level {bracket}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Games:</span>
                <Button
                  variant={gamesFilter === 'All' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGamesFilter('All')}
                >
                  All
                </Button>
                {availableGameCounts.map(count => (
                  <Button
                    key={count}
                    variant={gamesFilter === count ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGamesFilter(count)}
                  >
                    {count} games
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={() => setEditingPlayer(player.id)}
                  onDeletePlayer={handleDeletePlayer}
                />
              ))}
            </div>
            
            {filteredPlayers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No players found matching the current filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddPlayerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddPlayer={(name, level) => handleAddPlayer({ name, majorLevel: level.major, subLevel: level.sub })}
      />

      {editingPlayer && (
        <PlayerEditDialog
          player={players.find(p => p.id === editingPlayer)!}
          open={true}
          onOpenChange={(open) => !open && setEditingPlayer(null)}
          onSave={handleUpdatePlayer}
        />
      )}
    </div>
  );
};

export default PlayerManagement;