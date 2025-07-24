import { Player } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
}

const levelColors = {
  A: 'bg-level-a text-white',
  B: 'bg-level-b text-white',
  C: 'bg-level-c text-white',
  D: 'bg-level-d text-white',
};

const statusColors = {
  Available: 'bg-status-available text-white',
  'In progress': 'bg-status-in-progress text-white',
  Done: 'bg-status-done text-white',
};

export function PlayerCard({ player, onClick, selected }: PlayerCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        selected && "ring-2 ring-primary",
        !player.eligible && "opacity-50",
        player.status === 'In progress' && "opacity-75"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold truncate">{player.name}</h3>
          <Badge className={levelColors[player.level]} variant="secondary">
            Level {player.level}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {player.gamesPlayed} games
          </span>
          <Badge className={statusColors[player.status]} variant="outline">
            {player.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}