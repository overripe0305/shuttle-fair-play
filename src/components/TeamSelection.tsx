import { useState } from 'react';
import { Player } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Zap } from 'lucide-react';

interface TeamSelectionProps {
  onSelectTeam: () => Player[];
  onStartGame: (players: Player[]) => void;
}

const levelColors = {
  A: 'bg-level-a text-white',
  B: 'bg-level-b text-white',
  C: 'bg-level-c text-white',
  D: 'bg-level-d text-white',
};

export function TeamSelection({ onSelectTeam, onStartGame }: TeamSelectionProps) {
  const [selectedTeam, setSelectedTeam] = useState<Player[]>([]);

  const handleSelectTeam = () => {
    const team = onSelectTeam();
    setSelectedTeam(team);
  };

  const handleStartGame = () => {
    if (selectedTeam.length === 4) {
      onStartGame(selectedTeam);
      setSelectedTeam([]);
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
            onClick={handleSelectTeam}
            size="lg"
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            Pick Fair Team
          </Button>
          
          {selectedTeam.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Selected Team:</h3>
              <div className="grid grid-cols-2 gap-2">
                {selectedTeam.map((player) => (
                  <div 
                    key={player.id} 
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <span className="font-medium truncate">{player.name}</span>
                    <Badge className={levelColors[player.level]} variant="secondary">
                      {player.level}
                    </Badge>
                  </div>
                ))}
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