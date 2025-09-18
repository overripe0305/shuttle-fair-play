import { Player, getLevelDisplay } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Pause, Play, Trash2, GripVertical, Plus, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
  onTogglePause?: (playerId: string) => void;
  onDeletePlayer?: (playerId: string) => void;
  onRemoveFromEvent?: (playerId: string) => void;
  onGameOverride?: (playerId: string, adjustment: number) => void;
  isInEvent?: boolean;
  isDraggable?: boolean;
  dragId?: string;
}

const getLevelColor = (bracket: number) => {
  const colorMap: Record<number, string> = {
    0: 'bg-[hsl(var(--level-0))] text-white',
    1: 'bg-[hsl(var(--level-1))] text-white',
    2: 'bg-[hsl(var(--level-2))] text-white',
    3: 'bg-[hsl(var(--level-3))] text-white',
    4: 'bg-[hsl(var(--level-4))] text-white',
    5: 'bg-[hsl(var(--level-5))] text-white',
    6: 'bg-[hsl(var(--level-6))] text-white',
    7: 'bg-[hsl(var(--level-7))] text-white',
    8: 'bg-[hsl(var(--level-8))] text-white',
    9: 'bg-[hsl(var(--level-9))] text-white',
  };
  return colorMap[bracket] || 'bg-gray-500 text-white';
};

const statusColors = {
  available: 'bg-status-available text-white',
  in_progress: 'bg-status-in-progress text-white',
  waiting: 'bg-orange-500 text-white',
  done: 'bg-status-done text-white',
  paused: 'bg-gray-500 text-white',
};

export function PlayerCard({ player, onClick, selected, onTogglePause, onDeletePlayer, onRemoveFromEvent, onGameOverride, isInEvent, isDraggable = false, dragId }: PlayerCardProps) {
  const [idleTime, setIdleTime] = useState('0m');
  
  // Use player's last status change time for the specific event
  const getIdleStartTime = () => {
    const eventId = window.location.pathname.split('/')[4]; // Extract eventId from URL
    
    // Try to get stored start time for this player in this specific event
    const storedTime = localStorage.getItem(`idle_start_${player.id}_${eventId}`);
    if (storedTime && player.status === 'available') {
      return parseInt(storedTime);
    }
    
    // If no stored time and player is available, set it now
    if (player.status === 'available') {
      const now = new Date().getTime();
      localStorage.setItem(`idle_start_${player.id}_${eventId}`, now.toString());
      return now;
    }
    
    return new Date().getTime();
  };
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: dragId || player.id,
    disabled: !isDraggable,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Calculate idle time for available players
  useEffect(() => {
    if (player.status !== 'available') {
      setIdleTime('');
      // Don't clear stored time - preserve it for substitutions
      return;
    }

    const updateIdleTime = () => {
      const now = new Date().getTime();
      const startTime = getIdleStartTime();
      const idleMinutes = Math.floor((now - startTime) / 60000);
      
      if (idleMinutes < 60) {
        setIdleTime(`${idleMinutes}m`);
      } else {
        const hours = Math.floor(idleMinutes / 60);
        const remainingMinutes = idleMinutes % 60;
        setIdleTime(`${hours}h ${remainingMinutes}m`);
      }
    };

    updateIdleTime();
    const interval = setInterval(updateIdleTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [player.status, player.id]);
  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        selected && "ring-2 ring-primary",
        !player.eligible && "opacity-50",
        player.status === 'in_progress' && "opacity-75",
        isDragging && "opacity-50 z-50",
        isDraggable && "cursor-grab active:cursor-grabbing"
      )}
      onClick={onClick}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isDraggable && (
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="font-semibold truncate">{player.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[player.status as keyof typeof statusColors]} variant="outline">
              {player.status}
            </Badge>
            {onTogglePause && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePause(player.id);
                }}
              >
                {player.status === 'paused' ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </Button>
            )}
            {(onDeletePlayer || onRemoveFromEvent) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  
                  if (isInEvent && onRemoveFromEvent && onDeletePlayer) {
                    // Show options for both remove from event and delete permanently
                    const choice = confirm(
                      `What would you like to do with ${player.name}?\n\n` +
                      'Click "OK" to remove from this event only\n' +
                      'Click "Cancel" to delete permanently from database'
                    );
                    
                    if (choice) {
                      onRemoveFromEvent(player.id);
                    } else {
                      if (confirm(`Are you sure you want to permanently delete ${player.name} from the database?`)) {
                        onDeletePlayer(player.id);
                      }
                    }
                  } else if (onDeletePlayer) {
                    // Only delete permanently option
                    if (confirm(`Are you sure you want to permanently delete ${player.name}?`)) {
                      onDeletePlayer(player.id);
                    }
                  } else if (onRemoveFromEvent) {
                    // Only remove from event option
                    if (confirm(`Remove ${player.name} from this event?`)) {
                      onRemoveFromEvent(player.id);
                    }
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {player.status === 'available' && idleTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span>Idle: {idleTime}</span>
          </div>
        )}
        
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {player.level.major}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {player.gamesPlayed} games
                {player.gamePenaltyBonus !== 0 && (
                  <span className="ml-1 text-xs">
                    ({player.gamePenaltyBonus > 0 ? '+' : ''}{player.gamePenaltyBonus})
                  </span>
                )}
              </span>
              {onGameOverride && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGameOverride(player.id, -1);
                    }}
                    disabled={player.gamesPlayed <= 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline" 
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGameOverride(player.id, 1);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <Badge className={getLevelColor(player.level.bracket)} variant="secondary">
              Level {player.level.bracket}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}