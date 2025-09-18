import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, Users, UserX, Search } from 'lucide-react';
import { ActiveGame } from '@/hooks/useGameManager';
import { DndContext, useDraggable, useDroppable, DragStartEvent, DragEndEvent } from '@dnd-kit/core';

interface DraggableActiveGameCardProps {
  game: ActiveGame;
  onComplete: (gameId: string, winner?: 'team1' | 'team2') => void;
  onReplacePlayer?: (gameId: string, oldPlayerId: string, newPlayerId: string) => void;
  onUpdateCourt?: (gameId: string, courtId: number) => void;
  onCancel?: (gameId: string) => void;
  availablePlayers?: any[];
  maxCourts?: number;
  onPlayerSwap?: (gameId: string, player1Id: string, player2Id: string) => void;
}

export function DraggableActiveGameCard({ 
  game, 
  onComplete, 
  onReplacePlayer, 
  onUpdateCourt,
  onCancel,
  availablePlayers = [],
  maxCourts = 4,
  onPlayerSwap
}: DraggableActiveGameCardProps) {
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    open: boolean;
    playerToReplace?: { id: string; name: string };
  }>({ open: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const [gameDuration, setGameDuration] = useState('00:00');

  // Update game duration every second for real-time display
  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      const start = new Date(game.startTime);
      const diff = now.getTime() - start.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours > 0) {
        setGameDuration(`${hours}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setGameDuration(`${mins}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [game.startTime]);

  const handlePlayerSubstitution = (newPlayerId: string) => {
    if (!substitutionDialog.playerToReplace || !onReplacePlayer) return;
    
    onReplacePlayer(game.id, substitutionDialog.playerToReplace.id, newPlayerId);
    setSubstitutionDialog({ open: false });
    setSearchTerm('');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over || !onPlayerSwap) return;
    
    const draggedId = active.id as string;
    const overId = over.id as string;
    
    // Extract player IDs from drag-{gameId}-{playerId} format
    const draggedPlayerId = draggedId.split('-')[2];
    const targetPlayerId = overId.split('-')[2];
    
    if (draggedPlayerId !== targetPlayerId) {
      onPlayerSwap(game.id, draggedPlayerId, targetPlayerId);
    }
  };

  // Filter players based on search term
  const filteredPlayers = availablePlayers
    .filter(p => {
      const statusMatch = p.status === 'Available' || p.status === 'available';
      const eligibleMatch = p.eligible !== false;
      const nameMatch = searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && eligibleMatch && nameMatch;
    });

  const handleCourtChange = (courtId: string) => {
    if (onUpdateCourt) {
      onUpdateCourt(game.id, parseInt(courtId));
    }
  };

  const team1Players = [
    { id: game.player1Id, name: game.player1Name || 'Player 1' },
    { id: game.player2Id, name: game.player2Name || 'Player 2' }
  ];

  const team2Players = [
    { id: game.player3Id, name: game.player3Name || 'Player 3' },
    { id: game.player4Id, name: game.player4Name || 'Player 4' }
  ];

  // Draggable Player Component
  function DraggablePlayer({ playerId, playerName, teamLabel }: {
    playerId: string;
    playerName: string;
    teamLabel: string;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef: setDragRef,
      transform,
      isDragging,
    } = useDraggable({
      id: `drag-${game.id}-${playerId}`,
    });

    const {
      isOver,
      setNodeRef: setDropRef,
    } = useDroppable({
      id: `drop-${game.id}-${playerId}`,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

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
        {!game.completed && availablePlayers.length > 0 && onReplacePlayer && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setSubstitutionDialog({
                open: true,
                playerToReplace: { id: playerId, name: playerName }
              });
              setSearchTerm('');
            }}
          >
            <UserX className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Court {game.courtId}
              </span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={`text-white ${
                    (new Date().getTime() - new Date(game.startTime).getTime()) >= 15 * 60 * 1000 
                      ? 'bg-red-600' 
                      : 'bg-status-in-progress'
                  }`}
                >
                  {gameDuration}
                </Badge>
              {onUpdateCourt && (
                <Select value={game.courtId.toString()} onValueChange={handleCourtChange}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxCourts }, (_, i) => i + 1).map((court) => (
                      <SelectItem key={court} value={court.toString()}>
                        {court}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Team 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-3 w-3" />
                Team 1
              </div>
              <div className="space-y-1">
                {team1Players.map((player) => (
                  <DraggablePlayer
                    key={player.id}
                    playerId={player.id}
                    playerName={player.name}
                    teamLabel="T1"
                  />
                ))}
              </div>
            </div>
            
            {/* Team 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-3 w-3" />
                Team 2
              </div>
              <div className="space-y-1">
                {team2Players.map((player) => (
                  <DraggablePlayer
                    key={player.id}
                    playerId={player.id}
                    playerName={player.name}
                    teamLabel="T2"
                  />
                ))}
              </div>
            </div>
          </div>
          
          {!game.completed && (
            <>
              <div className="flex gap-2">
                <Button 
                  onClick={() => onComplete(game.id, 'team1')}
                  className="flex-1"
                  variant="outline"
                >
                  Team 1 Wins
                </Button>
                <Button 
                  onClick={() => onComplete(game.id, 'team2')}
                  className="flex-1"
                  variant="outline"
                >
                  Team 2 Wins
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => onComplete(game.id)}
                  className="flex-1"
                  variant="secondary"
                >
                  Complete (No Winner)
                </Button>
                {onCancel && (
                  <Button 
                    onClick={() => onCancel(game.id)}
                    className="flex-1"
                    variant="destructive"
                  >
                    Cancel Game
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
        
        {/* Player Substitution Dialog */}
        <Dialog 
          open={substitutionDialog.open} 
          onOpenChange={(open) => {
            setSubstitutionDialog({ open });
            if (!open) setSearchTerm('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Replace Player in Game</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                Replace <strong>{substitutionDialog.playerToReplace?.name}</strong> with:
              </p>
              
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
      </Card>
    </DndContext>
  );
}