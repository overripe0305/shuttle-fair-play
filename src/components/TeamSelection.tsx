import { GameMatch, Player } from '@/types/player';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, UserPlus, X, RefreshCw, UserX, Search, Settings } from 'lucide-react';
import { WaitingMatch } from '@/hooks/useWaitingMatchManager';
import { useState, useMemo } from 'react';
import { PlayerCard } from './PlayerCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, useDroppable, useDraggable } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { ManualPlayerSelectionDialog } from './ManualPlayerSelectionDialog';
import { WaitingMatchCard } from './WaitingMatchCard';

interface TeamSelectionProps {
  selectedPlayers: string[];
  onPlayerSelect: (playerId: string) => void;
  availablePlayers: Player[];
  maxCourts: number;
  activeGamesCount: number;
  waitingMatches: WaitingMatch[];
  addWaitingMatch: (match: GameMatch, onPlayerStatusUpdate?: (playerId: string, status: string) => void) => void;
  removeWaitingMatch: (matchId: string) => void;
  startWaitingMatch: (matchId: string, courtId: number, onStartGame: (match: GameMatch) => void, onPlayerStatusUpdate?: (playerId: string, status: string) => void) => void;
  onSelectMatch: () => GameMatch | null;
  onStartGame: (match: GameMatch) => void;
  onPlayerStatusUpdate?: (playerId: string, status: string) => void;
  onReplacePlayer?: (waitingMatchId: string, oldPlayerId: string, newPlayerId: string) => void;
  onSubstituteInWaiting?: (waitingMatchId: string, oldPlayerId: string, newPlayerId: string) => void;
  onTeamTradeInWaiting?: (waitingMatchId: string, player1Id: string, player2Id: string) => void;
  loadWaitingMatches?: () => void;
  onManualMatch?: (players: Player[]) => void;
}

export function TeamSelection({ 
  selectedPlayers, 
  onPlayerSelect, 
  availablePlayers, 
  maxCourts, 
  activeGamesCount, 
  waitingMatches, 
  addWaitingMatch, 
  removeWaitingMatch, 
  startWaitingMatch, 
  onSelectMatch, 
  onStartGame, 
  onPlayerStatusUpdate,
  onReplacePlayer,
  onSubstituteInWaiting,
  onTeamTradeInWaiting,
  loadWaitingMatches,
  onManualMatch
}: TeamSelectionProps) {
  const [selectedMatch, setSelectedMatch] = useState<GameMatch | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    open: boolean;
    waitingMatchId?: string;
    playerToReplace?: string;
    playerName?: string;
  }>({ open: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Available players for selection (not waiting, in progress, etc.)
  const eligiblePlayers = useMemo(() => 
    availablePlayers.filter(p => p.status === 'available' && p.eligible !== false),
    [availablePlayers]
  );

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return [];
    return eligiblePlayers.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [eligiblePlayers, searchTerm]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over) return;
    
    const draggedId = active.id as string;
    const overId = over.id as string;
    
    // Extract player ID from drag-{playerId} format
    const draggedPlayerId = draggedId.startsWith('drag-') ? draggedId.replace('drag-', '') : draggedId;
    
    // Handle direct drop on another player (for swapping within same match)
    if (overId.startsWith('drop-')) {
      const targetPlayerId = overId.replace('drop-', '');
      if (targetPlayerId !== draggedPlayerId) {
        // Find which waiting match contains both players
        const waitingMatch = waitingMatches.find(m => 
          [m.player1Id, m.player2Id, m.player3Id, m.player4Id].includes(draggedPlayerId) &&
          [m.player1Id, m.player2Id, m.player3Id, m.player4Id].includes(targetPlayerId)
        );
        
        if (waitingMatch) {
          // This is a swap within the same match, use a different approach
          handlePlayerSwap(waitingMatch.id, draggedPlayerId, targetPlayerId);
        }
      }
    }
  };

  const handlePlayerSwap = async (matchId: string, player1Id: string, player2Id: string) => {
    console.log('Attempting to swap players:', { matchId, player1Id, player2Id });
    
    const match = waitingMatches.find(m => m.id === matchId);
    if (!match) {
      console.log('Match not found');
      return;
    }

    console.log('Current match:', match);

    // Create new player arrays by swapping positions
    const currentPlayers = [match.player1Id, match.player2Id, match.player3Id, match.player4Id];
    const player1Index = currentPlayers.indexOf(player1Id);
    const player2Index = currentPlayers.indexOf(player2Id);
    
    console.log('Player positions:', { player1Index, player2Index });

    if (player1Index === -1 || player2Index === -1) {
      console.log('One or both players not found in match');
      return;
    }

    // Swap the players in the array
    const newPlayers = [...currentPlayers];
    newPlayers[player1Index] = player2Id;
    newPlayers[player2Index] = player1Id;

    console.log('New player arrangement:', newPlayers);

    // Create the update object
    const updates: any = {
      player1_id: newPlayers[0],
      player2_id: newPlayers[1], 
      player3_id: newPlayers[2],
      player4_id: newPlayers[3],
      match_data: undefined // Will be set below
    };

    // Also update the match_data to keep it in sync
    const updatedMatchData = { ...match.matchData };
    
    // Swap players in match data structure
    const matchDataPlayers = [
      updatedMatchData.pair1.players[0],
      updatedMatchData.pair1.players[1],
      updatedMatchData.pair2.players[0], 
      updatedMatchData.pair2.players[1]
    ];

    // Swap in match data array
    const temp = matchDataPlayers[player1Index];
    matchDataPlayers[player1Index] = matchDataPlayers[player2Index];
    matchDataPlayers[player2Index] = temp;

    // Reconstruct the match data
    updatedMatchData.pair1.players[0] = matchDataPlayers[0];
    updatedMatchData.pair1.players[1] = matchDataPlayers[1];
    updatedMatchData.pair2.players[0] = matchDataPlayers[2];
    updatedMatchData.pair2.players[1] = matchDataPlayers[3];

    updates.match_data = updatedMatchData;

    console.log('Sending updates to database:', updates);

    try {
      const { error } = await supabase
        .from('waiting_matches')
        .update(updates)
        .eq('id', matchId);
      
      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Swap successful');
      
      // Trigger waiting matches reload to update the UI
      if (loadWaitingMatches) {
        loadWaitingMatches();
      }
      
      console.log('UI should update now');
    } catch (error) {
      console.error('Error swapping players:', error);
    }
  };

  const handleSelectMatch = () => {
    const match = onSelectMatch();
    if (match) {
      setSelectedMatch(match);
    }
  };

  const handleQuickMatch = () => {
    if (isAutoMode) {
      const match = onSelectMatch();
      if (match) {
        // Always add to waiting queue first, let waiting queue manager handle court availability
        addWaitingMatch(match, onPlayerStatusUpdate);
      }
    } else {
      setIsManualDialogOpen(true);
    }
  };

  const handleManualPlayersSelected = (players: Player[]) => {
    if (onManualMatch) {
      onManualMatch(players);
    }
  };

  const handleStartGame = () => {
    if (selectedMatch) {
      const availableCourts = maxCourts - activeGamesCount;
      if (availableCourts > 0) {
        onStartGame(selectedMatch);
        setSelectedMatch(null);
      } else {
        // Add to waiting queue
        addWaitingMatch(selectedMatch, onPlayerStatusUpdate);
        setSelectedMatch(null);
      }
    }
  };

  const handlePlayerSubstitution = (newPlayerId: string) => {
    if (!substitutionDialog.playerToReplace || !onSubstituteInWaiting) return;
    
    onSubstituteInWaiting(
      substitutionDialog.waitingMatchId!, 
      substitutionDialog.playerToReplace, 
      newPlayerId
    );
    
    setSubstitutionDialog({ open: false });
  };

  // Draggable and Droppable Player Component
  function DraggablePlayer({ playerId, playerName, teamLabel, waitingMatchId }: {
    playerId: string;
    playerName: string;
    teamLabel: string;
    waitingMatchId: string;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef: setDragRef,
      transform,
      isDragging,
    } = useDraggable({
      id: `drag-${playerId}`,
    });

    const {
      isOver,
      setNodeRef: setDropRef,
    } = useDroppable({
      id: `drop-${playerId}`,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    // Combine refs
    const setNodeRef = (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center justify-between p-1.5 rounded text-xs transition-colors ${
          isDragging ? 'opacity-50' : ''
        } ${
          isOver ? 'bg-primary/20 border-2 border-primary' : 'bg-muted'
        }`}
      >
        <div 
          {...listeners}
          {...attributes}
          className="flex-1 cursor-move flex items-center"
        >
          <span className="font-medium truncate">{playerName}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setSubstitutionDialog({
              open: true,
              waitingMatchId: waitingMatchId,
              playerToReplace: playerId,
              playerName: playerName
            });
          }}
        >
          <UserX className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Droppable Team Component
  function DroppableTeam({ teamId, children }: { teamId: string; children: React.ReactNode }) {
    const {
      isOver,
      setNodeRef,
    } = useDroppable({
      id: teamId,
    });

    return (
      <div
        ref={setNodeRef}
        className={`space-y-1 p-2 rounded-lg border-2 border-dashed transition-colors ${
          isOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/20'
        }`}
      >
        {children}
      </div>
    );
  }


  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* AI Team Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              AI Team Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Queue Mode Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {isAutoMode ? 'Auto Queue' : 'Manual Selection'}
                  </span>
                </div>
                <Switch
                  checked={isAutoMode}
                  onCheckedChange={setIsAutoMode}
                />
              </div>

              <div className="text-center">
                <Button 
                  onClick={handleQuickMatch}
                  size="lg"
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {isAutoMode ? 'Auto Queue' : 'Manual Queue'}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Available courts: {Math.max(0, maxCourts - activeGamesCount)} | 
                Queued matches: {waitingMatches.length}
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Waiting Matches Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Queue ({waitingMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {waitingMatches.length > 0 ? (
              waitingMatches.map((waitingMatch) => (
                <WaitingMatchCard
                  key={waitingMatch.id}
                  match={waitingMatch}
                  onStart={(matchId, courtId) => startWaitingMatch(matchId, courtId, onStartGame, onPlayerStatusUpdate)}
                  onRemove={removeWaitingMatch}
                  onSubstitute={(matchId, oldPlayerId, newPlayerId) => {
                    if (onSubstituteInWaiting) {
                      onSubstituteInWaiting(matchId, oldPlayerId, newPlayerId);
                    }
                  }}
                  onTeamTrade={(matchId, player1Id, player2Id) => {
                    if (onTeamTradeInWaiting) {
                      onTeamTradeInWaiting(matchId, player1Id, player2Id);
                    }
                  }}
                  availablePlayers={availablePlayers}
                  courtCount={maxCourts}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No matches in queue
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragId ? (
            <div className="bg-card border rounded-lg p-2 shadow-lg opacity-80">
              <span className="font-medium">
                {(() => {
                  const playerId = activeDragId.startsWith('drag-') ? activeDragId.replace('drag-', '') : activeDragId;
                  return availablePlayers.find(p => p.id === playerId)?.name || 'Player';
                })()}
              </span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Substitution Dialog */}
        <Dialog 
          open={substitutionDialog.open} 
          onOpenChange={(open) => {
            setSubstitutionDialog({ open });
            if (!open) setSearchTerm('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Substitute Player - {substitutionDialog.playerName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                Replace <strong>{substitutionDialog.playerName}</strong> with:
              </p>
              
              {/* Search Input */}
              <div className="space-y-2">
                <Label htmlFor="player-search">Search and Select Player</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="player-search"
                    placeholder="Type player name to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              {/* Direct selection interface */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                {searchTerm && filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player) => (
                    <Button
                      key={player.id}
                      variant="outline"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => handlePlayerSubstitution(player.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{player.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {player.level.major} Level {player.level.bracket}
                        </span>
                      </div>
                    </Button>
                  ))
                ) : searchTerm ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No players found matching "{searchTerm}"
                  </div>
                ) : (
                   <div className="text-center py-4 text-muted-foreground">
                     Start typing to search for players
                   </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual Player Selection Dialog */}
        <ManualPlayerSelectionDialog
          open={isManualDialogOpen}
          onOpenChange={setIsManualDialogOpen}
          availablePlayers={eligiblePlayers}
          onPlayersSelected={handleManualPlayersSelected}
        />
      </div>
    </DndContext>
  );
}