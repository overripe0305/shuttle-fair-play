import { ActiveGame } from '@/hooks/useGameManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy, RotateCcw, X, MapPin } from 'lucide-react';
import { useState } from 'react';

interface ActiveGameCardProps {
  game: ActiveGame;
  onComplete: (gameId: string, winner?: 'team1' | 'team2') => void;
  onCancel: (gameId: string) => void;
  onSubstitute: (gameId: string, oldPlayerId: string, newPlayerId: string) => void;
  onChangeCourt: (gameId: string, courtId: number) => void;
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

export function ActiveGameCard({ game, onComplete, onCancel, onSubstitute, onChangeCourt, availablePlayers, courtCount }: ActiveGameCardProps) {
  const [substitutingPlayer, setSubstitutingPlayer] = useState<string | null>(null);

  const formatPlayerName = (playerName?: string, gamesPlayed?: number) => {
    return `G${gamesPlayed || 0}-${playerName || 'Unknown'}`;
  };

  const handleSubstitute = (newPlayerId: string) => {
    if (substitutingPlayer) {
      onSubstitute(game.id, substitutingPlayer, newPlayerId);
      setSubstitutingPlayer(null);
    }
  };

  const getDuration = () => {
    const duration = new Date().getTime() - new Date(game.startTime).getTime();
    const minutes = Math.floor(duration / 60000);
    return `${minutes}m`;
  };

  // Get player level data from available players to show correct level colors
  const getPlayerLevel = (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    return player?.level?.bracket || 0;
  };

  const getPlayerGames = (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    return player?.gamesPlayed || 0;
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">Court {game.courtId}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {getDuration()}
            </div>
          </div>
          <div className="flex gap-1">
            <select
              value={game.courtId}
              onChange={(e) => onChangeCourt(game.id, Number(e.target.value))}
              className="text-xs border rounded px-1 py-1"
            >
              {Array.from({ length: courtCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Court {i + 1}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(game.id, 'team1')}
              className="h-7 px-2 text-blue-700 border-blue-300"
            >
              Team 1 Wins
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(game.id, 'team2')}
              className="h-7 px-2 text-green-700 border-green-300"
            >
              Team 2 Wins
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(game.id)}
              className="h-7 px-2"
            >
              <Trophy className="h-3 w-3 mr-1" />
              No Contest
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(game.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Team 1 */}
          <div className="space-y-2">
            <div className="font-medium text-blue-800">Team 1</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelColor(getPlayerLevel(game.player1Id)).split(' ')[0]}`}>
                  {formatPlayerName(game.player1Name, getPlayerGames(game.player1Id))}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player1Id))} variant="secondary">
                  {getPlayerLevel(game.player1Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSubstitutingPlayer(game.player1Id)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelColor(getPlayerLevel(game.player2Id)).split(' ')[0]}`}>
                  {formatPlayerName(game.player2Name, getPlayerGames(game.player2Id))}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player2Id))} variant="secondary">
                  {getPlayerLevel(game.player2Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSubstitutingPlayer(game.player2Id)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="space-y-2">
            <div className="font-medium text-green-800">Team 2</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelColor(getPlayerLevel(game.player3Id)).split(' ')[0]}`}>
                  {formatPlayerName(game.player3Name, getPlayerGames(game.player3Id))}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player3Id))} variant="secondary">
                  {getPlayerLevel(game.player3Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSubstitutingPlayer(game.player3Id)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelColor(getPlayerLevel(game.player4Id)).split(' ')[0]}`}>
                  {formatPlayerName(game.player4Name, getPlayerGames(game.player4Id))}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player4Id))} variant="secondary">
                  {getPlayerLevel(game.player4Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSubstitutingPlayer(game.player4Id)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Substitution Panel */}
        {substitutingPlayer && (
          <div className="mt-3 p-2 bg-yellow-100 rounded border">
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
                  {formatPlayerName(player.name, player.gamesPlayed)}
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