import { WaitingMatch } from '@/hooks/useWaitingMatchManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, X, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface WaitingMatchCardProps {
  match: WaitingMatch;
  onStart: (matchId: string, courtId: number) => void;
  onRemove: (matchId: string) => void;
  onSubstitute: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  availablePlayers: any[];
  courtCount: number;
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

export function WaitingMatchCard({ match, onStart, onRemove, onSubstitute, availablePlayers, courtCount }: WaitingMatchCardProps) {
  const [selectedCourt, setSelectedCourt] = useState(1);
  const [substitutingPlayer, setSubstitutingPlayer] = useState<string | null>(null);

  const formatPlayerName = (player: any) => {
    return `G${player.gamesPlayed || 0}-${player.name}`;
  };

  const handleSubstitute = (newPlayerId: string) => {
    if (substitutingPlayer) {
      onSubstitute(match.id, substitutingPlayer, newPlayerId);
      setSubstitutingPlayer(null);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-orange-800">Waiting for Court</span>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStart(match.id, selectedCourt)}
              className="h-7 px-2"
            >
              <Play className="h-3 w-3 mr-1" />
              Start on Court {selectedCourt}
            </Button>
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(Number(e.target.value))}
              className="text-xs border rounded px-1 py-1"
            >
              {Array.from({ length: courtCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(match.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Pair 1 */}
          <div className="space-y-2">
            <div className="font-medium text-blue-800">Pair 1</div>
            {match.matchData.pair1.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`truncate px-2 py-1 rounded text-white ${getLevelColor(player.level.bracket).split(' ')[0]}`}>
                    {formatPlayerName(player)}
                  </span>
                  <Badge className={getLevelColor(player.level.bracket)} variant="secondary">
                    {player.level.bracket}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setSubstitutingPlayer(player.id)}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          
          {/* Pair 2 */}
          <div className="space-y-2">
            <div className="font-medium text-green-800">Pair 2</div>
            {match.matchData.pair2.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`truncate px-2 py-1 rounded text-white ${getLevelColor(player.level.bracket).split(' ')[0]}`}>
                    {formatPlayerName(player)}
                  </span>
                  <Badge className={getLevelColor(player.level.bracket)} variant="secondary">
                    {player.level.bracket}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setSubstitutingPlayer(player.id)}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Substitution Panel */}
        {substitutingPlayer && (
          <div className="mt-3 p-2 bg-yellow-50 rounded border">
            <div className="text-sm font-medium mb-2">Select replacement:</div>
            <div className="flex gap-1 flex-wrap">
              {availablePlayers.map(player => (
                <Button
                  key={player.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleSubstitute(player.id)}
                  className={`text-xs text-white ${getLevelColor(player.level?.bracket || 0).split(' ')[0]}`}
                >
                  {formatPlayerName(player)}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSubstitutingPlayer(null)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}