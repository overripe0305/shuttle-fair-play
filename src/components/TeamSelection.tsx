import { GameMatch, Player } from '@/types/player';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, UserPlus, X, RefreshCw } from 'lucide-react';
import { WaitingMatch } from '@/hooks/useWaitingMatchManager';
import { useState, useMemo } from 'react';
import { PlayerCard } from './PlayerCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

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
    
    const draggedPlayerId = active.id as string;
    const overId = over.id as string;
    
    // Handle substitution in waiting queue
    if (overId.startsWith('waiting-player-')) {
      const [, , waitingMatchId, playerToReplace] = overId.split('-');
      if (draggedPlayerId !== playerToReplace && onSubstituteInWaiting) {
        onSubstituteInWaiting(waitingMatchId, playerToReplace, draggedPlayerId);
      }
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
          <CardContent className="space-y-3">
            {waitingMatches.length > 0 ? (
              waitingMatches.map((waitingMatch) => (
                <div key={waitingMatch.id} className="border rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-center">
                      Team 1 vs Team 2
                    </div>
                    
                    <div className="space-y-2">
                      {[
                        waitingMatch.player1Id,
                        waitingMatch.player2Id,
                        waitingMatch.player3Id,
                        waitingMatch.player4Id
                      ].map((playerId, index) => {
                        const playerName = availablePlayers.find(p => p.id === playerId)?.name;
                        return (
                          <div 
                            key={`waiting-player-${waitingMatch.id}-${index}`}
                            id={`waiting-player-${waitingMatch.id}-${index}`}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {(index < 2 ? 'T1' : 'T2') + (index % 2 + 1)}
                                </span>
                              </div>
                              <span className="font-medium">{playerName}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSubstitutionDialog({
                                open: true,
                                waitingMatchId: waitingMatch.id,
                                playerToReplace: playerId,
                                playerName: playerName
                              })}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Substitute
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Waiting for {Math.floor((new Date().getTime() - waitingMatch.createdAt.getTime()) / 60000)} minutes
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => startWaitingMatch(waitingMatch.id, 1, onStartGame, onPlayerStatusUpdate)}
                          disabled={maxCourts - activeGamesCount <= 0}
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
                    </div>
                  </div>
                </div>
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
                {availablePlayers.find(p => p.id === activeDragId)?.name}
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