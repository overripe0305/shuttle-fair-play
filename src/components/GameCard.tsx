import { Game, getLevelDisplay } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Users } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onMarkDone: (gameId: string) => void;
}

const levelColors = {
  'Newbie': 'bg-level-newbie text-white',
  'Beginner': 'bg-level-beginner text-white',
  'Intermediate': 'bg-level-intermediate text-white',
  'Advance': 'bg-level-advance text-white',
};

export function GameCard({ game, onMarkDone }: GameCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Game #{game.gameNumber}
          </span>
          <span className="text-sm text-muted-foreground">
            {new Date(game.timestamp).toLocaleTimeString()}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Team 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3 w-3" />
              Team 1 ({game.match.pair1.pairType} - Avg: {game.match.pair1.averageLevel})
            </div>
            <div className="grid grid-cols-1 gap-1 pl-5">
              {game.match.pair1.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{player.name}</span>
                    <span className="text-xs text-muted-foreground">{getLevelDisplay(player.level)}</span>
                  </div>
                  <Badge className={levelColors[player.level.major]} variant="secondary">
                    {player.level.bracket}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3 w-3" />
              Team 2 ({game.match.pair2.pairType} - Avg: {game.match.pair2.averageLevel})
            </div>
            <div className="grid grid-cols-1 gap-1 pl-5">
              {game.match.pair2.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{player.name}</span>
                    <span className="text-xs text-muted-foreground">{getLevelDisplay(player.level)}</span>
                  </div>
                  <Badge className={levelColors[player.level.major]} variant="secondary">
                    {player.level.bracket}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {!game.completed && (
          <Button 
            onClick={() => onMarkDone(game.id)}
            className="w-full"
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Done
          </Button>
        )}
      </CardContent>
    </Card>
  );
}