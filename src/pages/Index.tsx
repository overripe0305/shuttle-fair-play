import { useState, useCallback } from 'react';
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { usePlayerManager } from '@/hooks/usePlayerManager';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { useGameManager } from '@/hooks/useGameManager';
import { useEventPlayerStats } from '@/hooks/useEventPlayerStats';
import { PlayerCard } from '@/components/PlayerCard';
import { GameCard } from '@/components/GameCard';
import { TeamSelection } from '@/components/TeamSelection';
import { AddPlayerToEventDialog } from '@/components/AddPlayerToEventDialog';
import { PlayerEditDialog } from '@/components/PlayerEditDialog';
import { CourtSelector } from '@/components/CourtSelector';
import { EnhancedGameCard } from '@/components/EnhancedGameCard';
import { EventReportsDialog } from '@/components/EventReportsDialog';
import { EventSettingsDialog } from '@/components/EventSettingsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from "react-router-dom";
import { 
  Users, 
  Trophy, 
  RotateCcw, 
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Edit2,
  FileText,
  Settings
} from 'lucide-react';
import badmintonLogo from '@/assets/badminton-logo.png';
import { MajorLevel, SubLevel, PlayerStatus } from '@/types/player';
import { toast } from 'sonner';

const Index = () => {
  // State variables first
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<MajorLevel | 'All'>('All');
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);
  const [isEventSettingsOpen, setIsEventSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'level' | 'games' | 'idle'>('games');

  const { eventId } = useParams();
  const {
    players,
    games,
    selectFairMatch,
    startGame,
    markGameDone,
    resetAllPlayers,
    activeGames,
    replacePlayerInTeam,
    replacePlayerInGame
  } = usePlayerManager();

  const { events, addPlayerToEvent, updateEventCourtCount, updateEventStatus } = useEventManager();
  const { players: allPlayers, addPlayer, updatePlayer } = useEnhancedPlayerManager();
  const { activeGames: dbActiveGames, createGame, completeGame, updateGameCourt, replacePlayerInGame: replaceInDbGame } = useGameManager(eventId);
  
  // Get current event if we're in event context
  const currentEvent = eventId ? events.find(e => e.id === eventId) : null;
  
  const { getPlayerStats, eventPlayerStats, refetch: refetchEventStats, updateCounter } = useEventPlayerStats(eventId, currentEvent?.selectedPlayerIds);
  // Get players for current event or all players - memoize with proper dependencies
  const eventPlayers = React.useMemo(() => {
    if (!currentEvent) return allPlayers;
    
    return allPlayers.filter(p => currentEvent.selectedPlayerIds.includes(p.id)).map(player => {
      // For event context, use event-specific stats
      if (eventId) {
        const eventStats = getPlayerStats(player.id);
        return {
          ...player,
          gamesPlayed: eventStats.gamesPlayed,
          wins: eventStats.wins,
          losses: eventStats.losses
        };
      }
      return player;
    });
  }, [currentEvent, allPlayers, eventPlayerStats, eventId, getPlayerStats, updateCounter]);

  // Force refresh when updateCounter changes to ensure UI syncs with database
  // Force refresh of event stats when current event players change significantly
  const eventPlayerIds = currentEvent?.selectedPlayerIds;
  React.useEffect(() => {
    if (eventPlayerIds && eventPlayerIds.length > 0) {
      // Small delay to ensure all hooks are ready then refresh stats
      const timer = setTimeout(() => {
        console.log('Event players changed, refreshing stats...');
        refetchEventStats();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [JSON.stringify(eventPlayerIds?.sort()), refetchEventStats]);

  const filteredPlayers = React.useMemo(() => {
    let filtered = eventPlayers.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === 'All' || player.level.major === levelFilter;
      return matchesSearch && matchesLevel;
    });

    // Sort players based on selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'level':
          return a.level.bracket - b.level.bracket;
        case 'games':
          return a.gamesPlayed - b.gamesPlayed;
        case 'idle':
          // For idle time, available players come first, then by status
          if (a.status === 'available' && b.status !== 'available') return -1;
          if (a.status !== 'available' && b.status === 'available') return 1;
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [eventPlayers, searchTerm, levelFilter, sortBy]);

  const availablePlayers = React.useMemo(() => {
    return eventPlayers.filter(p => p.eligible && p.status === 'available');
  }, [eventPlayers]);

  const handleTogglePause = useCallback(async (playerId: string) => {
    const player = eventPlayers.find(p => p.id === playerId);
    if (!player) return;

    const newStatus: PlayerStatus = player.status === 'paused' ? 'available' : 'paused';
    
    try {
      await updatePlayer(playerId, { status: newStatus });
      toast.success(`Player ${newStatus === 'paused' ? 'paused' : 'unpaused'}: ${player.name} is now ${newStatus}.`);
    } catch (error) {
      toast.error("Failed to update player status.");
    }
  }, [eventPlayers, updatePlayer]);

  const inProgressPlayers = React.useMemo(() => {
    return eventPlayers.filter(p => p.status === 'in_progress');
  }, [eventPlayers]);
  
  // Use database active games instead of local state - memoized
  const currentActiveGames = React.useMemo(() => {
    return dbActiveGames || [];
  }, [dbActiveGames]);

  const availablePlayersForEvent = React.useMemo(() => {
    return allPlayers.filter(player => 
      !currentEvent?.selectedPlayerIds.includes(player.id)
    );
  }, [allPlayers, currentEvent]);

  const handleAddExistingPlayer = async (playerId: string) => {
    if (!currentEvent) return;
    try {
      await addPlayerToEvent(currentEvent.id, playerId);
      toast.success('Player added to event');
    } catch (error) {
      toast.error('Failed to add player to event');
    }
  };

  const handleAddNewPlayer = async (playerData: { name: string; majorLevel: MajorLevel; subLevel?: SubLevel }) => {
    // Check for duplicate names
    const existingPlayer = allPlayers.find(p => p.name.toLowerCase() === playerData.name.toLowerCase());
    if (existingPlayer) {
      toast.error('A player with this name already exists');
      return;
    }

    try {
      const newPlayer = await addPlayer(playerData);
      if (currentEvent) {
        await addPlayerToEvent(currentEvent.id, newPlayer.id);
        toast.success(`${newPlayer.name} created and added to event`);
      } else {
        toast.success(`${newPlayer.name} created`);
      }
    } catch (error) {
      toast.error('Failed to create player');
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: { name?: string; majorLevel?: MajorLevel; subLevel?: SubLevel }) => {
    // Check for duplicate names if name is being updated
    if (updates.name) {
      const existingPlayer = allPlayers.find(p => p.id !== playerId && p.name.toLowerCase() === updates.name!.toLowerCase());
      if (existingPlayer) {
        toast.error('A player with this name already exists');
        return;
      }
    }

    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.majorLevel) {
        updateData.level = {
          major: updates.majorLevel,
          sub: updates.subLevel,
          bracket: 1 // This will be recalculated
        };
      }
      
      await updatePlayer(playerId, updateData);
      toast.success('Player updated successfully');
    } catch (error) {
      toast.error('Failed to update player');
    }
  };

  // Wrapper function to complete game and immediately refresh event stats
  const handleCompleteGame = async (gameId: string, winner?: 'team1' | 'team2') => {
    await completeGame(gameId, winner);
    // Force immediate refresh of event player stats
    await refetchEventStats();
  };

  const handleCourtCountChange = async (courtCount: number) => {
    if (currentEvent) {
      try {
        await updateEventCourtCount(currentEvent.id, courtCount);
        toast.success('Court count updated');
      } catch (error) {
        toast.error('Failed to update court count');
      }
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: { title?: string; date?: Date; courtCount?: number }) => {
    // This would need to be implemented in the event manager
    // For now, just show a success message
    toast.success('Event settings updated');
  };

  const editingPlayerData = editingPlayer ? allPlayers.find(p => p.id === editingPlayer) : null;

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
              <div className="flex items-center gap-3">
                <img src={badmintonLogo} alt="BadmintonPro" className="h-10 w-10" />
                <div>
                  <h1 className="text-2xl font-bold">{currentEvent ? currentEvent.title : 'BadmintonPro'}</h1>
                  <p className="text-sm text-muted-foreground">Smart Club Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-status-available rounded-full"></div>
                  <span>{availablePlayers.length} Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-status-in-progress rounded-full"></div>
                  <span>{inProgressPlayers.length} Playing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>{currentActiveGames.length} Active Games</span>
                </div>
              </div>
              
              
              <div className="flex gap-2">
                {currentEvent && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => setIsEventSettingsOpen(true)}
                      variant="outline"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Event Settings
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setIsReportsDialogOpen(true)}
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Event Reports
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await updateEventStatus(currentEvent.id, 'ended' as any);
                          toast.success('Event ended successfully');
                        } catch (error) {
                          toast.error('Failed to end event');
                        }
                      }}
                    >
                      End Event
                    </Button>
                  </>
                )}
                <Button 
                  size="sm" 
                  onClick={() => setIsAddPlayerDialogOpen(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Player
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Players */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Player Pool ({filteredPlayers.length})
                </CardTitle>
                
                {/* Search and Filter */}
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
                    <Button
                      variant={levelFilter === 'All' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLevelFilter('All')}
                    >
                      All
                    </Button>
                    {(['Newbie', 'Beginner', 'Intermediate', 'Advance'] as MajorLevel[]).map(level => (
                      <Button
                        key={level}
                        variant={levelFilter === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLevelFilter(level)}
                        className={levelFilter === level ? 'text-white' : ''}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
                    <Button
                      variant={sortBy === 'games' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('games')}
                    >
                      Games
                    </Button>
                    <Button
                      variant={sortBy === 'idle' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('idle')}
                    >
                      Idle Time
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredPlayers.map((player) => (
                  <div 
                    key={player.id} 
                    className="cursor-pointer"
                    onClick={() => setEditingPlayer(player.id)}
                  >
                    <PlayerCard 
                      player={player} 
                      onTogglePause={handleTogglePause}
                    />
                  </div>
                ))}
                
                {filteredPlayers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No players found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Team Selection */}
          <div className="lg:col-span-1">
            <TeamSelection 
              onSelectMatch={() => {
                return selectFairMatch(eventPlayers);
              }}
              onStartGame={(match) => {
                if (currentEvent) {
                  createGame(
                    match.pair1.players[0].id,
                    match.pair1.players[1].id,
                    match.pair2.players[0].id,
                    match.pair2.players[1].id,
                    1 // Default to court 1, can be changed later
                  );
                }
              }}
              onReplacePlayer={replacePlayerInTeam}
              onPlayerStatusUpdate={async (playerId: string, status: string) => {
                // Update player status immediately in local state
                await updatePlayer(playerId, { status: status as any });
              }}
              availablePlayers={availablePlayers}
              maxCourts={currentEvent?.courtCount || 4}
              eventId={eventId}
              activeGamesCount={currentActiveGames.length}
            />
          </div>

          {/* Right Panel - Active Games */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Active Games ({currentActiveGames.length})
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {currentActiveGames.map((game) => (
                  <EnhancedGameCard 
                    key={game.id} 
                    game={game} 
                    onComplete={handleCompleteGame}
                    onReplacePlayer={replaceInDbGame}
                    onUpdateCourt={updateGameCourt}
                    availablePlayers={availablePlayers}
                    maxCourts={currentEvent?.courtCount || 4}
                  />
                ))}
                
                {currentActiveGames.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active games
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{eventPlayers.length}</div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </CardContent>
          </Card>
          
            <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {React.useMemo(() => 
                  Math.floor(eventPlayers.reduce((total, player) => total + (player.gamesPlayed || 0), 0) / 4), 
                  [eventPlayers]
                )}
              </div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{availablePlayers.length}</div>
              <div className="text-sm text-muted-foreground">Available Now</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{currentActiveGames.length}</div>
              <div className="text-sm text-muted-foreground">Games in Progress</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddPlayerToEventDialog
        open={isAddPlayerDialogOpen}
        onOpenChange={setIsAddPlayerDialogOpen}
        availablePlayers={availablePlayersForEvent}
        onAddExistingPlayer={handleAddExistingPlayer}
        onAddNewPlayer={handleAddNewPlayer}
        allowMultiple={true}
      />

      {editingPlayerData && (
        <PlayerEditDialog
          player={editingPlayerData}
          open={!!editingPlayer}
          onOpenChange={(open) => !open && setEditingPlayer(null)}
          onSave={handleUpdatePlayer}
        />
      )}

      {currentEvent && (
        <EventReportsDialog
          open={isReportsDialogOpen}
          onOpenChange={setIsReportsDialogOpen}
          eventId={currentEvent.id}
          eventTitle={currentEvent.title}
        />
      )}

      {currentEvent && (
        <EventSettingsDialog
          open={isEventSettingsOpen}
          onOpenChange={setIsEventSettingsOpen}
          event={currentEvent}
          onUpdateEvent={handleUpdateEvent}
        />
      )}
    </div>
  );
};

export default Index;
