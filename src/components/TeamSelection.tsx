import { GameMatch, Player } from '@/types/player';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, UserPlus, X, RefreshCw, UserX } from 'lucide-react';
import { WaitingMatch } from '@/hooks/useWaitingMatchManager';
import { useState, useMemo } from 'react';
import { PlayerCard } from './PlayerCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, useDroppable, useDraggable } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';

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
  onSubstituteInWaiting
}: TeamSelectionProps) {
  const [selectedMatch, setSelectedMatch] = useState<GameMatch | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    open: boolean;
    waitingMatchId?: string;
    playerToReplace?: string;
    playerName?: string;
  }>({ open: false });
  
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
    const match = waitingMatches.find(m => m.id === matchId);
    if (!match) return;

    // Update the waiting match record by swapping positions
    const updates: any = {};
    let updatedMatchData = { ...match.matchData };

    // Swap player positions in database
    if (match.player1Id === player1Id && match.player2Id === player2Id) {
      updates.player1_id = player2Id;
      updates.player2_id = player1Id;
      // Swap in match data
      const temp = updatedMatchData.pair1.players[0];
      updatedMatchData.pair1.players[0] = updatedMatchData.pair1.players[1];
      updatedMatchData.pair1.players[1] = temp;
    } else if (match.player3Id === player1Id && match.player4Id === player2Id) {
      updates.player3_id = player2Id;
      updates.player4_id = player1Id;
      // Swap in match data
      const temp = updatedMatchData.pair2.players[0];
      updatedMatchData.pair2.players[0] = updatedMatchData.pair2.players[1];
      updatedMatchData.pair2.players[1] = temp;
    } else if ((match.player1Id === player1Id && match.player3Id === player2Id) || 
               (match.player1Id === player2Id && match.player3Id === player1Id)) {
      // Cross-team swap
      const p1Pos = match.player1Id === player1Id ? 'player1_id' : 'player3_id';
      const p2Pos = match.player3Id === player2Id ? 'player3_id' : 'player1_id';
      updates[p1Pos] = player2Id;
      updates[p2Pos] = player1Id;
      
      // Update match data
      const player1Data = match.player1Id === player1Id ? updatedMatchData.pair1.players[0] : updatedMatchData.pair2.players[0];
      const player2Data = match.player3Id === player2Id ? updatedMatchData.pair2.players[0] : updatedMatchData.pair1.players[0];
      
      if (match.player1Id === player1Id) {
        updatedMatchData.pair1.players[0] = player2Data;
        updatedMatchData.pair2.players[0] = player1Data;
      } else {
        updatedMatchData.pair1.players[0] = player1Data;
        updatedMatchData.pair2.players[0] = player2Data;
      }
    } else {
      // Handle other swap combinations
      console.log('Complex swap - handling all cases');
      return;
    }

    updates.match_data = updatedMatchData;

    try {
      const { error } = await supabase.from('waiting_matches').update(updates).eq('id', matchId);
      if (error) throw error;
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
    const match = onSelectMatch();
    if (match) {
      // Always add to waiting queue first, let waiting queue manager handle court availability
      addWaitingMatch(match, onPlayerStatusUpdate);
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
        {...listeners}
        {...attributes}
        className={`flex items-center justify-between p-2 rounded-md cursor-move transition-colors ${
          isDragging ? 'opacity-50' : ''
        } ${
          isOver ? 'bg-primary/20 border-2 border-primary' : 'bg-muted'
        }`}
      >
        <span className="font-medium truncate">{playerName}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
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
            <div className="text-center space-y-3">
              <div className="flex gap-2">
                <Button 
                  onClick={handleQuickMatch}
                  size="lg"
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Queue
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
              waitingMatches.map((waitingMatch) => {
                const team1Players = [
                  { id: waitingMatch.player1Id, name: availablePlayers.find(p => p.id === waitingMatch.player1Id)?.name || 'Player 1' },
                  { id: waitingMatch.player2Id, name: availablePlayers.find(p => p.id === waitingMatch.player2Id)?.name || 'Player 2' }
                ];
                const team2Players = [
                  { id: waitingMatch.player3Id, name: availablePlayers.find(p => p.id === waitingMatch.player3Id)?.name || 'Player 3' },
                  { id: waitingMatch.player4Id, name: availablePlayers.find(p => p.id === waitingMatch.player4Id)?.name || 'Player 4' }
                ];

                return (
                  <Card key={waitingMatch.id} className="w-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Waiting Match
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.floor((new Date().getTime() - waitingMatch.createdAt.getTime()) / 60000)}m
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {/* Team 1 */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-3 w-3" />
                            Team 1
                          </div>
                          <DroppableTeam teamId={`team-${waitingMatch.id}-1-0`}>
                            {team1Players.map((player, index) => (
                              <DraggablePlayer
                                key={player.id}
                                playerId={player.id}
                                playerName={player.name}
                                teamLabel={`T1P${index + 1}`}
                                waitingMatchId={waitingMatch.id}
                              />
                            ))}
                          </DroppableTeam>
                        </div>
                        
                        {/* Team 2 */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-3 w-3" />
                            Team 2
                          </div>
                          <DroppableTeam teamId={`team-${waitingMatch.id}-2-0`}>
                            {team2Players.map((player, index) => (
                              <DraggablePlayer
                                key={player.id}
                                playerId={player.id}
                                playerName={player.name}
                                teamLabel={`T2P${index + 1}`}
                                waitingMatchId={waitingMatch.id}
                              />
                            ))}
                          </DroppableTeam>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t">
                        <Button 
                          size="sm"
                          onClick={() => startWaitingMatch(waitingMatch.id, 1, onStartGame, onPlayerStatusUpdate)}
                          disabled={maxCourts - activeGamesCount <= 0}
                          className="flex-1"
                        >
                          Start Now
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => removeWaitingMatch(waitingMatch.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
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
          onOpenChange={(open) => setSubstitutionDialog({ open })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Substitute Player - {substitutionDialog.playerName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a player to substitute for {substitutionDialog.playerName}:
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {eligiblePlayers.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onClick={() => handlePlayerSubstitution(player.id)}
                    isDraggable={true}
                    dragId={player.id}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}