import { Player, getLevelDisplay } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
}

const levelColors = {
  'Newbie': 'bg-level-newbie text-white',
  'Beginner': 'bg-level-beginner text-white',
  'Intermediate': 'bg-level-intermediate text-white',
  'Advance': 'bg-level-advance text-white',
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
          <Badge className={levelColors[player.level.major]} variant="secondary">
            {player.level.bracket}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {getLevelDisplay(player.level)}
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
            <Badge className={statusColors[player.status]} variant="outline">
              {player.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}