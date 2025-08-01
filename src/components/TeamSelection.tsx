import { useState } from 'react';
import { GameMatch, getLevelDisplay } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Zap } from 'lucide-react';

interface TeamSelectionProps {
  onSelectMatch: () => GameMatch | null;
  onStartGame: (match: GameMatch) => void;
  onReplacePlayer?: (oldPlayerId: string, newPlayerId: string) => void;
}

const levelColors = {
  'Newbie': 'bg-level-newbie text-white',
  'Beginner': 'bg-level-beginner text-white',
  'Intermediate': 'bg-level-intermediate text-white',
  'Advance': 'bg-level-advance text-white',
};

export function TeamSelection({ onSelectMatch, onStartGame, onReplacePlayer }: TeamSelectionProps) {
  const [selectedMatch, setSelectedMatch] = useState<GameMatch | null>(null);

  const handleSelectMatch = () => {
    const match = onSelectMatch();
    setSelectedMatch(match);
  };

  const handleStartGame = () => {
    if (selectedMatch) {
      onStartGame(selectedMatch);
      setSelectedMatch(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Zap className="h-5 w-5" />
            AI Team Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSelectMatch}
            size="lg"
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            Pick Fair Match
          </Button>
          
          {selectedMatch && (
            <div className="space-y-4">
              <h3 className="font-semibold">Selected Match:</h3>
              
              {/* Team 1 */}
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Team 1 ({selectedMatch.pair1.pairType})
                </div>
                <div className="space-y-1">
                  {selectedMatch.pair1.players.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{player.name}</span>
                        <span className="text-xs text-muted-foreground">{player.level.major}</span>
                      </div>
                      <Badge className={levelColors[player.level.major]} variant="secondary">
                        Level {player.level.bracket}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Team 2 */}
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Team 2 ({selectedMatch.pair2.pairType})
                </div>
                <div className="space-y-1">
                  {selectedMatch.pair2.players.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{player.name}</span>
                        <span className="text-xs text-muted-foreground">{player.level.major}</span>
                      </div>
                      <Badge className={levelColors[player.level.major]} variant="secondary">
                        Level {player.level.bracket}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={handleStartGame}
                className="w-full"
                variant="default"
              >
                Start Game
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}