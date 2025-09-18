import { useState, useCallback } from 'react';
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { usePlayerManager } from '@/hooks/usePlayerManager';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { useGameManager } from '@/hooks/useGameManager';
import { useEventPlayerStats } from '@/hooks/useEventPlayerStats';
import { useWaitingMatchManager } from '@/hooks/useWaitingMatchManager';
import { useDataSync } from '@/hooks/useDataSync';
import { useTournamentManager } from '@/hooks/useTournamentManager';
import { PlayerCard } from '@/components/PlayerCard';
import { GameCard } from '@/components/GameCard';
import { TeamSelection } from '@/components/TeamSelection';
import { AddPlayerToEventDialog } from '@/components/AddPlayerToEventDialog';
import { PlayerEditDialog } from '@/components/PlayerEditDialog';
import { CourtSelector } from '@/components/CourtSelector';
import { EnhancedGameCard } from '@/components/EnhancedGameCard';
import { DraggableActiveGameCard } from '@/components/DraggableActiveGameCard';
import { EventSettingsDialog } from '@/components/EventSettingsDialog';
import { EventReportDialog } from '@/components/EventReportDialog';
import { WaitingMatchCard } from '@/components/WaitingMatchCard';
import { ActiveGameCard } from '@/components/ActiveGameCard';
import { TournamentBracket } from '@/components/TournamentBracket';
import { TournamentSetup } from '@/components/TournamentSetup';
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
  Settings,
  RefreshCw
} from 'lucide-react';
import badmintonLogo from '@/assets/badminton-logo.png';
import { MajorLevel, SubLevel, PlayerStatus, Player, GameMatch } from '@/types/player';
import { toast } from 'sonner';
import { useEventSpecificIdleTime } from '@/hooks/useEventSpecificIdleTime';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  // Get eventId and clubId from URL params
  const { eventId, clubId } = useParams();
  
  // State variables 
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'All'>('All');
  const [gamesFilter, setGamesFilter] = useState<number | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [isEventSettingsOpen, setIsEventSettingsOpen] = useState(false);
  const [isEventReportOpen, setIsEventReportOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'level' | 'games' | 'idle' | 'chronological'>('games');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [gameOverrides, setGameOverrides] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`gameOverrides-${eventId}`);
    return saved ? JSON.parse(saved) : {};
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
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

  const { events, addPlayerToEvent, updateEvent, updateEventCourtCount, updateEventStatus, removePlayerFromEvent } = useEventManager(clubId);
  const { players: allPlayers, addPlayer, updatePlayer, deletePlayer } = useEnhancedPlayerManager(clubId);
  const { activeGames: dbActiveGames, createGame, completeGame, cancelGame, updateGameCourt, replacePlayerInGame: replaceInDbGame } = useGameManager(eventId);
  const { 
    waitingMatches, 
    addWaitingMatch, 
    removeWaitingMatch, 
    startWaitingMatch,
    substitutePlayerInWaiting,
    loadWaitingMatches
  } = useWaitingMatchManager(eventId);
  
  // Get current event if we're in event context
  const currentEvent = eventId ? events.find(e => e.id === eventId) : null;
  
  // Load tournament data if this is a tournament event
  const { 
    tournament, 
    matches, 
    participants, 
    loading: tournamentLoading,
    refetch: refetchTournament 
  } = useTournamentManager();

  // Load tournament when event is available and is tournament type
  React.useEffect(() => {
    if (currentEvent && currentEvent.eventType === 'tournament' && eventId) {
      refetchTournament(eventId);
    }
  }, [currentEvent?.eventType, eventId, refetchTournament]);
  
  const { getPlayerStats, eventPlayerStats, refetch: refetchEventStats, updateCounter } = useEventPlayerStats(eventId, currentEvent?.selectedPlayerIds);
  
  // Initialize data sync hook
  const { performSync, isSyncing } = useDataSync(eventId, clubId);
  
  // Initialize event-specific idle time hook
  const { setIdleStartTime } = useEventSpecificIdleTime();
  
  // Get players for current event or all players - memoize with proper dependencies
  const eventPlayers = React.useMemo(() => {
    if (!currentEvent) return allPlayers;
    
    return allPlayers.filter(p => currentEvent.selectedPlayerIds.includes(p.id)).map(player => {
      // For event context, use event-specific stats
      if (eventId) {
        const eventStats = getPlayerStats(player.id);
        const override = gameOverrides[player.id] || 0;
        return {
          ...player,
          gamesPlayed: Math.max(0, eventStats.gamesPlayed + override),
          gamePenaltyBonus: override, // Show override as penalty/bonus
          wins: eventStats.wins,
          losses: eventStats.losses
        };
      }
      return player;
    });
  }, [currentEvent, allPlayers, eventPlayerStats, eventId, getPlayerStats, updateCounter, gameOverrides]);

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
      const matchesLevel = levelFilter === 'All' || player.level.bracket === levelFilter;
      const matchesGames = gamesFilter === 'All' || player.gamesPlayed === gamesFilter;
      const matchesStatus = statusFilter === 'all' || player.status === statusFilter;
      return matchesSearch && matchesLevel && matchesGames && matchesStatus;
    });

    // Sort players based on selected criteria
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'level':
          result = a.level.bracket - b.level.bracket;
          break;
        case 'games':
          result = a.gamesPlayed - b.gamesPlayed;
          break;
        case 'idle':
          // For idle time, available players come first, then by status
          if (a.status === 'available' && b.status !== 'available') result = -1;
          else if (a.status !== 'available' && b.status === 'available') result = 1;
          else result = a.name.localeCompare(b.name);
          break;
        case 'chronological':
          // Sort by event player order (when they were added to the event)
          if (currentEvent?.playerOrder) {
            const indexA = currentEvent.playerOrder.indexOf(a.id);
            const indexB = currentEvent.playerOrder.indexOf(b.id);
            result = indexA - indexB;
          } else {
            result = a.name.localeCompare(b.name);
          }
          break;
        default:
          result = 0;
      }
      return sortDirection === 'desc' ? -result : result;
    });

    return filtered;
  }, [eventPlayers, searchTerm, levelFilter, gamesFilter, statusFilter, sortBy, sortDirection, currentEvent]);

  const availablePlayers = React.useMemo(() => {
    return eventPlayers.filter(p => p.eligible && p.status === 'available');
  }, [eventPlayers]);

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleManualMatch = (players: Player[]) => {
    if (players.length === 4 && currentEvent) {
      // Create a match from the selected players
      const match: GameMatch = {
        pair1: {
          players: [players[0], players[1]],
          averageLevel: (players[0].level.bracket + players[1].level.bracket) / 2,
          pairType: 'Balanced'
        },
        pair2: {
          players: [players[2], players[3]],
          averageLevel: (players[2].level.bracket + players[3].level.bracket) / 2,
          pairType: 'Balanced'
        }
      };

      // Add to waiting queue or start immediately if court available
      const usedCourts = currentActiveGames.map(game => game.courtId);
      const maxCourts = currentEvent.courtCount || 4;
      const availableCourts = maxCourts - usedCourts.length;

      if (availableCourts > 0) {
        // Start immediately
        let availableCourt = 1;
        for (let court = 1; court <= maxCourts; court++) {
          if (!usedCourts.includes(court)) {
            availableCourt = court;
            break;
          }
        }
        
        createGame(
          match.pair1.players[0].id,
          match.pair1.players[1].id,
          match.pair2.players[0].id,
          match.pair2.players[1].id,
          availableCourt
        );
      } else {
        // Add to waiting queue
        addWaitingMatch(match, async (playerId: string, status: string) => {
          await updatePlayer(playerId, { status: status as any });
        });
      }
    }
  };

  const handleActiveGamePlayerSwap = async (gameId: string, player1Id: string, player2Id: string) => {
    try {
      const game = currentActiveGames.find(g => g.id === gameId);
      if (!game) return;

      // Find the positions of the players in the game
      const playerIds = [game.player1Id, game.player2Id, game.player3Id, game.player4Id];
      const player1Index = playerIds.indexOf(player1Id);
      const player2Index = playerIds.indexOf(player2Id);

      if (player1Index === -1 || player2Index === -1) return;

      // Create new player arrangement by swapping
      const newPlayerIds = [...playerIds];
      newPlayerIds[player1Index] = player2Id;
      newPlayerIds[player2Index] = player1Id;

      // Update the game in the database
      const { error } = await supabase
        .from('games')
        .update({
          player1_id: newPlayerIds[0],
          player2_id: newPlayerIds[1],
          player3_id: newPlayerIds[2],
          player4_id: newPlayerIds[3]
        })
        .eq('id', gameId);

      if (error) throw error;

      toast.success('Players swapped successfully');
    } catch (error) {
      console.error('Error swapping players in active game:', error);
      toast.error('Failed to swap players');
    }
  };

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

  const handleUpdateEvent = async (eventId: string, updates: { title?: string; date?: Date; courtCount?: number; queueFee?: number }) => {
    try {
      await updateEvent(eventId, updates);
      toast.success('Event settings updated');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleGameOverride = useCallback((playerId: string, adjustment: number) => {
    setGameOverrides(prev => {
      const newOverrides = {
        ...prev,
        [playerId]: (prev[playerId] || 0) + adjustment
      };
      localStorage.setItem(`gameOverrides-${eventId}`, JSON.stringify(newOverrides));
      return newOverrides;
    });
  }, [eventId]);

  const getTotalOverrides = useCallback(() => {
    return Object.values(gameOverrides).reduce((sum, override) => sum + override, 0);
  }, [gameOverrides]);

  const editingPlayerData = editingPlayer ? allPlayers.find(p => p.id === editingPlayer) : null;

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over) return;
    
    const draggedPlayerId = active.id as string;
    const overId = over.id as string;
    
    // Handle drop zones for player cards
    if (overId === 'available-players' || overId === 'event-players') {
      // Handle moving players between available and event lists
      const draggedPlayer = allPlayers.find(p => p.id === draggedPlayerId);
      if (!draggedPlayer || !currentEvent) return;
      
      const isInEvent = eventPlayers.some(p => p.id === draggedPlayerId);
      
      if (overId === 'event-players' && !isInEvent) {
        addPlayerToEvent(currentEvent.id, draggedPlayerId);
      } else if (overId === 'available-players' && isInEvent) {
        removePlayerFromEvent(currentEvent.id, draggedPlayerId);
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/club/${clubId}/dashboard`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
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
                      onClick={performSync}
                      variant="outline"
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync Data
                    </Button>
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
                      onClick={() => setIsEventReportOpen(true)}
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Event Report
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
      {currentEvent?.eventType === 'tournament' ? (
        // Tournament Interface
        <div className="container mx-auto px-6 py-6">
          {tournament ? (
            <TournamentBracket 
              tournament={tournament} 
              matches={matches}
              onUpdateMatch={(match) => console.log('Update match:', match)}
            />
          ) : (
            <TournamentSetup 
              players={allPlayers}
              onCreateTournament={async (config, selectedPlayerIds) => {
                if (!eventId) return;
                // Add players to event first
                for (const playerId of selectedPlayerIds) {
                  await handleAddExistingPlayer(playerId);
                }
                toast.success('Tournament setup completed!');
                refetchTournament(eventId);
              }}
              onCancel={() => {
                // Navigate back to dashboard or close setup
                console.log('Tournament setup cancelled');
              }}
            />
          )}
        </div>
      ) : (
        // Regular Queue Interface
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Players */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Player Pool ({filteredPlayers.length})
                  </div>
                  {getTotalOverrides() !== 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Games {getTotalOverrides() > 0 ? '+' : ''}{getTotalOverrides()}
                    </Badge>
                  )}
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
                     <span className="text-sm font-medium text-muted-foreground">Level:</span>
                     <Button
                       variant={levelFilter === 'All' ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setLevelFilter('All')}
                     >
                       All
                     </Button>
                     {React.useMemo(() => {
                       const availableBrackets = [...new Set(eventPlayers.map(p => p.level.bracket))].sort((a, b) => a - b);
                       return availableBrackets.map(bracket => (
                         <Button
                           key={bracket}
                           variant={levelFilter === bracket ? 'default' : 'outline'}
                           size="sm"
                           onClick={() => setLevelFilter(bracket)}
                           className={levelFilter === bracket ? 'text-white' : ''}
                         >
                           Level {bracket}
                         </Button>
                       ));
                     }, [eventPlayers, levelFilter])}
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
                      {React.useMemo(() => {
                        const availableGameCounts = [...new Set(eventPlayers.map(p => p.gamesPlayed))].sort((a, b) => a - b);
                        return availableGameCounts.map(gameCount => (
                          <Button
                            key={gameCount}
                            variant={gamesFilter === gameCount ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setGamesFilter(gameCount)}
                            className={gamesFilter === gameCount ? 'text-white' : ''}
                          >
                            {gameCount}
                          </Button>
                        ));
                      }, [eventPlayers, gamesFilter])}
                    </div>

                     <div className="flex gap-2 flex-wrap">
                       <span className="text-sm font-medium text-muted-foreground">Status:</span>
                       <Button
                         variant={statusFilter === 'all' ? 'default' : 'outline'}
                         size="sm"
                         onClick={() => setStatusFilter('all')}
                         className={statusFilter === 'all' ? 'text-white' : ''}
                       >
                         All
                       </Button>
                       <Button
                         variant={statusFilter === 'available' ? 'default' : 'outline'}
                         size="sm"
                         onClick={() => setStatusFilter('available')}
                         className={statusFilter === 'available' ? 'text-white' : ''}
                       >
                         Available
                       </Button>
                       <Button
                         variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                         size="sm"
                         onClick={() => setStatusFilter('in_progress')}
                         className={statusFilter === 'in_progress' ? 'text-white' : ''}
                       >
                         In Progress
                       </Button>
                       <Button
                         variant={statusFilter === 'waiting' ? 'default' : 'outline'}
                         size="sm"
                         onClick={() => setStatusFilter('waiting')}
                         className={statusFilter === 'waiting' ? 'text-white' : ''}
                       >
                         Waiting
                       </Button>
                       <Button
                         variant={statusFilter === 'paused' ? 'default' : 'outline'}
                         size="sm"
                         onClick={() => setStatusFilter('paused')}
                         className={statusFilter === 'paused' ? 'text-white' : ''}
                       >
                         Paused
                       </Button>
                     </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
                    <Button
                      variant={sortBy === 'games' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'games') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('games');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Games {sortBy === 'games' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Button>
                    <Button
                      variant={sortBy === 'idle' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'idle') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('idle');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Idle Time {sortBy === 'idle' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Button>
                    <Button
                      variant={sortBy === 'chronological' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'chronological') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('chronological');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Added Order {sortBy === 'chronological' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                      onRemoveFromEvent={(playerId) => removePlayerFromEvent(currentEvent.id, playerId)}
                      onDeletePlayer={deletePlayer}
                      onGameOverride={handleGameOverride}
                      isInEvent={true}
                      selected={selectedPlayerIds.includes(player.id)}
                      isDraggable={false}
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
              selectedPlayers={selectedPlayerIds}
              onPlayerSelect={handlePlayerSelect}
              availablePlayers={eventPlayers}
              maxCourts={currentEvent?.courtCount || 4}
              activeGamesCount={activeGames.length}
              waitingMatches={waitingMatches}
              addWaitingMatch={addWaitingMatch}
              removeWaitingMatch={removeWaitingMatch}
              startWaitingMatch={startWaitingMatch}
              onSelectMatch={() => selectFairMatch(eventPlayers)}
              onStartGame={(match) => {
                if (currentEvent) {
                  // Find available court (not used by active games)
                  const usedCourts = currentActiveGames.map(game => game.courtId);
                  const maxCourts = currentEvent.courtCount || 4;
                  let availableCourt = 1;
                  
                  for (let court = 1; court <= maxCourts; court++) {
                    if (!usedCourts.includes(court)) {
                      availableCourt = court;
                      break;
                    }
                  }
                  
                  createGame(
                    match.pair1.players[0].id,
                    match.pair1.players[1].id,
                    match.pair2.players[0].id,
                    match.pair2.players[1].id,
                    availableCourt
                  );
                }
              }}
              onPlayerStatusUpdate={async (playerId: string, status: string) => {
                await updatePlayer(playerId, { status: status as any });
              }}
              onReplacePlayer={replacePlayerInTeam}
              onSubstituteInWaiting={substitutePlayerInWaiting}
              loadWaitingMatches={loadWaitingMatches}
              onManualMatch={handleManualMatch}
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
                  <DraggableActiveGameCard 
                    key={game.id} 
                    game={game} 
                    onComplete={handleCompleteGame}
                    onReplacePlayer={replaceInDbGame}
                    onUpdateCourt={updateGameCourt}
                    onCancel={cancelGame}
                    availablePlayers={availablePlayers}
                    maxCourts={currentEvent?.courtCount || 4}
                    onPlayerSwap={handleActiveGamePlayerSwap}
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

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragId ? (
            <div className="bg-card border rounded-lg p-2 shadow-lg opacity-80">
              <span className="font-medium">
                {allPlayers.find(p => p.id === activeDragId)?.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>

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
      )}

      <AddPlayerToEventDialog
        open={isAddPlayerDialogOpen}
        onOpenChange={setIsAddPlayerDialogOpen}
        availablePlayers={availablePlayersForEvent}
        onAddExistingPlayer={handleAddExistingPlayer}
        onAddNewPlayer={handleAddNewPlayer}
        allowMultiple={currentEvent?.eventType !== 'tournament'}
        pairMode={currentEvent?.eventType === 'tournament'}
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
        <EventSettingsDialog
          open={isEventSettingsOpen}
          onOpenChange={setIsEventSettingsOpen}
          event={currentEvent}
          onUpdateEvent={handleUpdateEvent}
        />
      )}
      
      {currentEvent && (
        <EventReportDialog
          open={isEventReportOpen}
          onOpenChange={setIsEventReportOpen}
          eventId={currentEvent.id}
          eventTitle={currentEvent.title}
          players={eventPlayers}
        />
      )}
      </div>
    </DndContext>
  );
};

export default Index;
