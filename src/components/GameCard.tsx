import { Game } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onMarkDone: (gameId: string) => void;
}

const levelColors = {
  A: 'bg-level-a text-white',
  B: 'bg-level-b text-white',
  C: 'bg-level-c text-white',
  D: 'bg-level-d text-white',
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
        <div className="grid grid-cols-2 gap-2">
          {game.players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="font-medium truncate">{player.name}</span>
              <Badge className={levelColors[player.level]} variant="secondary">
                {player.level}
              </Badge>
            </div>
          ))}
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