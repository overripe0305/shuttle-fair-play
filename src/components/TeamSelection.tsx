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
    
    if (!over || !onSubstituteInWaiting) return;
    
    const draggedId = active.id as string;
    const overId = over.id as string;
    
    // Extract player ID from drag-{playerId} format
    const draggedPlayerId = draggedId.startsWith('drag-') ? draggedId.replace('drag-', '') : draggedId;
    
    // Handle drag from available players to team slots
    if (overId.startsWith('team-')) {
      const [teamPart, waitingMatchId, teamNum, playerPos] = overId.split('-');
      const waitingMatch = waitingMatches.find(m => m.id === waitingMatchId);
      if (!waitingMatch) return;
      
      const playerIds = [
        waitingMatch.player1Id,
        waitingMatch.player2Id, 
        waitingMatch.player3Id,
        waitingMatch.player4Id
      ];
      
      // Find the first player in the target team that can be replaced
      const isTeam1 = parseInt(teamNum) === 1;
      const startIndex = isTeam1 ? 0 : 2;
      const endIndex = isTeam1 ? 2 : 4;
      
      // Try to find a suitable slot in the target team
      for (let i = startIndex; i < endIndex; i++) {
        const oldPlayerId = playerIds[i];
        if (oldPlayerId !== draggedPlayerId) {
          onSubstituteInWaiting(waitingMatchId, oldPlayerId, draggedPlayerId);
          break;
        }
      }
    }
    
    // Handle drag between team positions within the same match
    if (overId.startsWith('team-') && draggedId.startsWith('drag-')) {
      // This is handled above
      return;
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

  // Draggable Player Component
  function DraggablePlayer({ playerId, playerName, teamLabel, waitingMatchId }: {
    playerId: string;
    playerName: string;
    teamLabel: string;
    waitingMatchId: string;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: `drag-${playerId}`,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`flex items-center justify-between p-2 bg-muted rounded-md cursor-move ${
          isDragging ? 'opacity-50' : ''
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

        {/* Available Players for Drag & Drop */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Available Players ({eligiblePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {eligiblePlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={() => {}}
                  isDraggable={true}
                  dragId={player.id}
                />
              ))}
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