import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TournamentConfig, TournamentPair } from '@/types/tournament';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { Trophy, Users, ArrowUp, ArrowDown, Camera } from 'lucide-react';

interface TournamentBracketPreviewProps {
  config: TournamentConfig;
  selectedPlayers: EnhancedPlayer[];
  pairs?: TournamentPair[];
  onGenerateBracket: (participants: string[] | TournamentPair[]) => void;
  onCancel: () => void;
}

export const TournamentBracketPreview = ({ 
  config, 
  selectedPlayers, 
  pairs, 
  onGenerateBracket, 
  onCancel 
}: TournamentBracketPreviewProps) => {
  const [orderedParticipants, setOrderedParticipants] = useState<EnhancedPlayer[]>(selectedPlayers);
  const [orderedPairs, setOrderedPairs] = useState<TournamentPair[]>(pairs || []);

  const isDoubles = config.playFormat === 'doubles';
  const participants = isDoubles ? orderedPairs : orderedParticipants;
  const participantCount = participants.length;

  // Calculate bracket structure
  const getBracketStructure = () => {
    const rounds = [];
    let currentRound = 1;
    let playersInRound = participantCount;

    // Determine target sizes for each round
    const targetSizes = [64, 32, 16, 8, 4, 2];
    let targetIndex = targetSizes.findIndex(size => size <= participantCount);
    
    if (targetIndex === -1) targetIndex = targetSizes.length - 1;

    while (playersInRound > 1) {
      const targetSize = targetSizes[targetIndex] || 1;
      
      if (playersInRound > targetSize) {
        // Pre-round needed
        const preRoundMatches = playersInRound - targetSize;
        rounds.push({
          name: `Pre-Round ${currentRound}`,
          matches: preRoundMatches,
          players: playersInRound,
          advancing: targetSize
        });
        playersInRound = targetSize;
      } else {
        // Regular round
        const roundName = getRoundName(playersInRound);
        rounds.push({
          name: roundName,
          matches: Math.floor(playersInRound / 2),
          players: playersInRound,
          advancing: Math.floor(playersInRound / 2)
        });
        playersInRound = Math.floor(playersInRound / 2);
      }
      
      currentRound++;
      targetIndex++;
    }

    return rounds;
  };

  const getRoundName = (playerCount: number) => {
    switch (playerCount) {
      case 2: return 'Championship';
      case 4: return 'Semi Finals';
      case 8: return 'Quarter Finals';
      case 16: return 'Round of 16';
      case 32: return 'Round of 32';
      case 64: return 'Round of 64';
      default: return `Round of ${playerCount}`;
    }
  };


  const moveParticipant = (index: number, direction: 'up' | 'down') => {
    if (isDoubles) {
      const items = [...orderedPairs];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= items.length) return;
      
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      setOrderedPairs(items);
    } else {
      const items = [...orderedParticipants];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= items.length) return;
      
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      setOrderedParticipants(items);
    }
  };

  const handleGenerateBracket = () => {
    if (isDoubles) {
      onGenerateBracket(orderedPairs);
    } else {
      onGenerateBracket(orderedParticipants.map(p => p.id));
    }
  };

  const bracketStructure = getBracketStructure();

  return (
    <div className="space-y-6">
      {/* Bracket Structure Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Bracket Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">{config.playFormat.toUpperCase()}</Badge>
              <span>•</span>
              <span>{participantCount} {isDoubles ? 'pairs' : 'participants'}</span>
              <span>•</span>
              <span>{bracketStructure.length} rounds</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {bracketStructure.map((round, index) => (
                <div key={index} className="p-3 border rounded-lg bg-muted/20">
                  <div className="font-medium text-sm">{round.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {round.matches} matches • {round.advancing} advance
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participant Seeding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seeding Order
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Drag to reorder or use the arrows to adjust seeding
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={isDoubles ? (participant as TournamentPair).id : (participant as EnhancedPlayer).id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-background"
              >
                <Badge variant="outline">#{index + 1}</Badge>
                
                {isDoubles ? (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium">{(participant as TournamentPair).player1Name}</span>
                    <span className="text-muted-foreground">+</span>
                    <span className="font-medium">{(participant as TournamentPair).player2Name}</span>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(participant as EnhancedPlayer).photo} alt={(participant as EnhancedPlayer).name} />
                      <AvatarFallback>
                        <Camera className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{(participant as EnhancedPlayer).name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(participant as EnhancedPlayer).level.major}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveParticipant(index, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveParticipant(index, 'down')}
                    disabled={index === participants.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Back
        </Button>
        <Button onClick={handleGenerateBracket} className="flex-1">
          <Trophy className="h-4 w-4 mr-2" />
          Generate Bracket
        </Button>
      </div>
    </div>
  );
};