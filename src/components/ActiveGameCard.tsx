import { ActiveGame } from '@/hooks/useGameManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy, RotateCcw, X, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Player } from '@/types/player';
import { TeamSubstituteDialog } from './TeamSubstituteDialog';

interface ActiveGameCardProps {
  game: ActiveGame;
  onComplete: (gameId: string, winner?: 'team1' | 'team2') => void;
  onCancel: (gameId: string) => void;
  onSubstitute: (gameId: string, oldPlayerId: string, newPlayerId: string) => void;
  onTeamTrade: (gameId: string, player1Id: string, player2Id: string) => void;
  onChangeCourt: (gameId: string, courtId: number) => void;
  availablePlayers: Player[];
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

const getLevelBackgroundColor = (bracket: number) => {
  console.log('Getting level background color for bracket:', bracket);
  const colorMap: Record<number, string> = {
    0: 'bg-pink-400',
    1: 'bg-green-300', 
    2: 'bg-green-500',
    3: 'bg-green-700',
    4: 'bg-blue-300',
    5: 'bg-blue-500',
    6: 'bg-blue-700',
    7: 'bg-orange-300',
    8: 'bg-orange-500',
    9: 'bg-yellow-400',
  };
  const color = colorMap[bracket] || 'bg-gray-500';
  console.log('Returning color:', color);
  return color;
};

export function ActiveGameCard({ game, onComplete, onCancel, onSubstitute, onTeamTrade, onChangeCourt, availablePlayers, courtCount }: ActiveGameCardProps) {
  const [selectedPlayerForSubstitute, setSelectedPlayerForSubstitute] = useState<any | null>(null);

  const formatPlayerName = (playerName?: string) => {
    return playerName || 'Unknown';
  };

  const handleSubstitute = (oldPlayerId: string, newPlayerId: string) => {
    onSubstitute(game.id, oldPlayerId, newPlayerId);
    setSelectedPlayerForSubstitute(null);
  };

  const handleTeamTrade = (player1Id: string, player2Id: string) => {
    onTeamTrade(game.id, player1Id, player2Id);
    setSelectedPlayerForSubstitute(null);
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
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelBackgroundColor(getPlayerLevel(game.player1Id))}`}>
                  {formatPlayerName(game.player1Name)}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player1Id))} variant="secondary">
                  Level {getPlayerLevel(game.player1Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedPlayerForSubstitute({
                  id: game.player1Id,
                  name: game.player1Name,
                  level: { major: 'Beginner', bracket: getPlayerLevel(game.player1Id) },
                  gamesPlayed: getPlayerGames(game.player1Id),
                  eligible: true,
                  gamePenaltyBonus: 0,
                  status: 'in_progress',
                  matchHistory: []
                })}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelBackgroundColor(getPlayerLevel(game.player2Id))}`}>
                  {formatPlayerName(game.player2Name)}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player2Id))} variant="secondary">
                  Level {getPlayerLevel(game.player2Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedPlayerForSubstitute({
                  id: game.player2Id,
                  name: game.player2Name,
                  level: { major: 'Beginner', bracket: getPlayerLevel(game.player2Id) },
                  gamesPlayed: getPlayerGames(game.player2Id),
                  eligible: true,
                  gamePenaltyBonus: 0,
                  status: 'in_progress',
                  matchHistory: []
                })}
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
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelBackgroundColor(getPlayerLevel(game.player3Id))}`}>
                  {formatPlayerName(game.player3Name)}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player3Id))} variant="secondary">
                  Level {getPlayerLevel(game.player3Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedPlayerForSubstitute({
                  id: game.player3Id,
                  name: game.player3Name,
                  level: { major: 'Beginner', bracket: getPlayerLevel(game.player3Id) },
                  gamesPlayed: getPlayerGames(game.player3Id),
                  eligible: true,
                  gamePenaltyBonus: 0,
                  status: 'in_progress',
                  matchHistory: []
                })}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelBackgroundColor(getPlayerLevel(game.player4Id))}`}>
                  {formatPlayerName(game.player4Name)}
                </span>
                <Badge className={getLevelColor(getPlayerLevel(game.player4Id))} variant="secondary">
                  Level {getPlayerLevel(game.player4Id)}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedPlayerForSubstitute({
                  id: game.player4Id,
                  name: game.player4Name,
                  level: { major: 'Beginner', bracket: getPlayerLevel(game.player4Id) },
                  gamesPlayed: getPlayerGames(game.player4Id),
                  eligible: true,
                  gamePenaltyBonus: 0,
                  status: 'in_progress',
                  matchHistory: []
                })}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Game Result Buttons */}
        <div className="flex justify-center gap-2 mt-4 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(game.id, 'team1')}
            className="px-4 text-blue-700 border-blue-300"
          >
            Team 1 Wins
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(game.id, 'team2')}
            className="px-4 text-green-700 border-green-300"
          >
            Team 2 Wins
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(game.id)}
            className="px-4"
          >
            <Trophy className="h-3 w-3 mr-1" />
            No Contest
          </Button>
        </div>

        {/* Team Substitute Dialog */}
        <TeamSubstituteDialog
          open={!!selectedPlayerForSubstitute}
          onOpenChange={(open) => !open && setSelectedPlayerForSubstitute(null)}
          selectedPlayer={selectedPlayerForSubstitute}
          team1Players={[
            { 
              id: game.player1Id, 
              name: game.player1Name, 
              level: { major: 'Beginner', bracket: getPlayerLevel(game.player1Id) }, 
              gamesPlayed: getPlayerGames(game.player1Id),
              eligible: true,
              gamePenaltyBonus: 0,
              status: 'in_progress',
              matchHistory: []
            },
            { 
              id: game.player2Id, 
              name: game.player2Name, 
              level: { major: 'Beginner', bracket: getPlayerLevel(game.player2Id) }, 
              gamesPlayed: getPlayerGames(game.player2Id),
              eligible: true,
              gamePenaltyBonus: 0,
              status: 'in_progress',
              matchHistory: []
            }
          ]}
          team2Players={[
            { 
              id: game.player3Id, 
              name: game.player3Name, 
              level: { major: 'Beginner', bracket: getPlayerLevel(game.player3Id) }, 
              gamesPlayed: getPlayerGames(game.player3Id),
              eligible: true,
              gamePenaltyBonus: 0,
              status: 'in_progress',
              matchHistory: []
            },
            { 
              id: game.player4Id, 
              name: game.player4Name, 
              level: { major: 'Beginner', bracket: getPlayerLevel(game.player4Id) }, 
              gamesPlayed: getPlayerGames(game.player4Id),
              eligible: true,
              gamePenaltyBonus: 0,
              status: 'in_progress',
              matchHistory: []
            }
          ]}
          availablePlayers={availablePlayers}
          onSubstitute={handleSubstitute}
          onTeamTrade={handleTeamTrade}
        />
      </CardContent>
    </Card>
  );
}