import { Player, getLevelDisplay } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Pause, Play } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
  onTogglePause?: (playerId: string) => void;
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

export function PlayerCard({ player, onClick, selected, onTogglePause }: PlayerCardProps) {
  const [idleTime, setIdleTime] = useState('0m');
  const [idleStartTime] = useState(() => new Date().getTime());

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
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        selected && "ring-2 ring-primary",
        !player.eligible && "opacity-50",
        player.status === 'in_progress' && "opacity-75"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold truncate">{player.name}</h3>
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