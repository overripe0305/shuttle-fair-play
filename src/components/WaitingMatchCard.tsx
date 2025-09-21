import { WaitingMatch } from '@/hooks/useWaitingMatchManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, X, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Player } from '@/types/player';
import { TeamSubstituteDialog } from './TeamSubstituteDialog';
import { getBracketFromMajorSub, MajorLevel, SubLevel, BracketLevel } from '@/types/player';

interface WaitingMatchCardProps {
  match: WaitingMatch;
  onStart: (matchId: string, courtId: number) => void;
  onRemove: (matchId: string) => void;
  onSubstitute: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  onTeamTrade: (matchId: string, player1Id: string, player2Id: string) => void;
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

export function WaitingMatchCard({ match, onStart, onRemove, onSubstitute, onTeamTrade, availablePlayers, courtCount }: WaitingMatchCardProps) {
  const [selectedCourt, setSelectedCourt] = useState(1);
  const [selectedPlayerForSubstitute, setSelectedPlayerForSubstitute] = useState<any | null>(null);

  const formatPlayerName = (player: any) => {
    return player.name;
  };

  const handleSubstitute = (oldPlayerId: string, newPlayerId: string) => {
    onSubstitute(match.id, oldPlayerId, newPlayerId);
    setSelectedPlayerForSubstitute(null);
  };

  const handleTeamTrade = (player1Id: string, player2Id: string) => {
    onTeamTrade(match.id, player1Id, player2Id);
    setSelectedPlayerForSubstitute(null);
  };

  // Get player level data from available players to show correct level colors
  const getPlayerLevel = (playerId: string) => {
    const player: any = availablePlayers.find(p => p.id === playerId);
    if (!player) return 0;

    // Prefer EnhancedPlayer shape
    const bracketFromLevel = player.level?.bracket;
    if (typeof bracketFromLevel === 'number') return bracketFromLevel;

    // Fallback to DB shape if provided
    if (player.major_level) {
      return getBracketFromMajorSub(player.major_level as MajorLevel, player.sub_level as SubLevel | undefined);
    }

    return 0;
  };

  const getPlayerGames = (playerId: string) => {
    const player: any = availablePlayers.find(p => p.id === playerId);
    return (player?.gamesPlayed ?? player?.games_played ?? 0) as number;
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
          {/* Team 1 */}
          <div className="space-y-2">
            <div className="font-medium text-blue-800">Team 1</div>
            {match.matchData.pair1.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelBackgroundColor(getPlayerLevel(player.id))}`}>
                  {formatPlayerName(player)} - {getPlayerLevel(player.id)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setSelectedPlayerForSubstitute({
                    id: player.id,
                    name: player.name,
                    level: { major: 'Beginner', bracket: getPlayerLevel(player.id) },
                    gamesPlayed: getPlayerGames(player.id),
                    eligible: true,
                    gamePenaltyBonus: 0,
                    status: 'queued',
                    matchHistory: []
                  })}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          
          {/* Team 2 */}
          <div className="space-y-2">
            <div className="font-medium text-green-800">Team 2</div>
            {match.matchData.pair2.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <span className={`truncate px-2 py-1 rounded text-white ${getLevelBackgroundColor(getPlayerLevel(player.id))}`}>
                  {formatPlayerName(player)} - {getPlayerLevel(player.id)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setSelectedPlayerForSubstitute({
                    id: player.id,
                    name: player.name,
                    level: { major: 'Beginner', bracket: getPlayerLevel(player.id) },
                    gamesPlayed: getPlayerGames(player.id),
                    eligible: true,
                    gamePenaltyBonus: 0,
                    status: 'queued',
                    matchHistory: []
                  })}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Team Substitute Dialog */}
        <TeamSubstituteDialog
          open={!!selectedPlayerForSubstitute}
          onOpenChange={(open) => !open && setSelectedPlayerForSubstitute(null)}
          selectedPlayer={selectedPlayerForSubstitute}
          team1Players={match.matchData.pair1.players.map(player => ({
            id: player.id,
            name: player.name,
            level: { major: 'Beginner', bracket: getPlayerLevel(player.id) as BracketLevel },
            gamesPlayed: getPlayerGames(player.id),
            eligible: true,
            gamePenaltyBonus: 0,
            status: 'queued',
            matchHistory: []
          }))}
          team2Players={match.matchData.pair2.players.map(player => ({
            id: player.id,
            name: player.name,
            level: { major: 'Beginner', bracket: getPlayerLevel(player.id) as BracketLevel },
            gamesPlayed: getPlayerGames(player.id),
            eligible: true,
            gamePenaltyBonus: 0,
            status: 'queued',
            matchHistory: []
          }))}
          availablePlayers={availablePlayers}
          onSubstitute={handleSubstitute}
          onTeamTrade={handleTeamTrade}
        />
      </CardContent>
    </Card>
  );
}