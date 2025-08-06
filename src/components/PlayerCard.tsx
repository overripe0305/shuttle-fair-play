import { Player, getLevelDisplay } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Pause, Play, Trash2, GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
  onTogglePause?: (playerId: string) => void;
  onDeletePlayer?: (playerId: string) => void;
  onRemoveFromEvent?: (playerId: string) => void;
  isInEvent?: boolean;
  isDraggable?: boolean;
  dragId?: string;
}

const levelColors = {
  'Newbie': 'bg-level-newbie text-white',
  'Beginner': 'bg-level-beginner text-white',
  'Intermediate': 'bg-level-intermediate text-white',
  'Advance': 'bg-level-advance text-white',
};

const statusColors = {
  available: 'bg-status-available text-white',
  in_progress: 'bg-status-in-progress text-white',
  waiting: 'bg-orange-500 text-white',
  done: 'bg-status-done text-white',
  paused: 'bg-gray-500 text-white',
};

export function PlayerCard({ player, onClick, selected, onTogglePause, onDeletePlayer, onRemoveFromEvent, isInEvent, isDraggable = false, dragId }: PlayerCardProps) {
  const [idleTime, setIdleTime] = useState('0m');
  const [idleStartTime] = useState(() => new Date().getTime());
  
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
      return;
    }

    const updateIdleTime = () => {
      const now = new Date().getTime();
      const idleMinutes = Math.floor((now - idleStartTime) / 60000);
      
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
  }, [player.status, idleStartTime]);
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
            <span className="text-muted-foreground">
              {player.gamesPlayed} games
              {player.gamePenaltyBonus !== 0 && (
                <span className="ml-1 text-xs">
                  ({player.gamePenaltyBonus > 0 ? '+' : ''}{player.gamePenaltyBonus})
                </span>
              )}
            </span>
            <Badge className={levelColors[player.level.major]} variant="secondary">
              Level {player.level.bracket}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}