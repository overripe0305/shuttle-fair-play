import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TournamentMatch, TournamentParticipant } from '@/types/tournament';
import { Trophy, Users, Clock } from 'lucide-react';

interface TournamentBracketVisualProps {
  matches: TournamentMatch[];
  participants: TournamentParticipant[];
  onUpdateMatch?: (match: TournamentMatch) => void;
}

interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: TournamentMatch[];
}

export const TournamentBracketVisual = ({ 
  matches, 
  participants, 
  onUpdateMatch 
}: TournamentBracketVisualProps) => {
  
  // Group matches by round
  const rounds: BracketRound[] = [];
  const eliminationMatches = matches.filter(m => m.stage === 'elimination_stage');
  
  // Sort matches by round
  const roundNumbers = [...new Set(eliminationMatches.map(m => m.roundNumber))].sort((a, b) => a - b);
  
  roundNumbers.forEach(roundNum => {
    const roundMatches = eliminationMatches
      .filter(m => m.roundNumber === roundNum)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    
    let roundName = `Round ${roundNum}`;
    const totalRounds = roundNumbers.length;
    
    if (roundNum === totalRounds) {
      roundName = 'Finals';
    } else if (roundNum === totalRounds - 1) {
      roundName = 'Semifinals';
    } else if (roundNum === totalRounds - 2 && totalRounds > 3) {
      roundName = 'Quarterfinals';
    }
    
    rounds.push({
      roundNumber: roundNum,
      roundName,
      matches: roundMatches
    });
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'scheduled': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getParticipantName = (participantId: string | undefined) => {
    if (!participantId) return 'TBD';
    const participant = participants.find(p => p.id === participantId);
    return participant?.playerName || 'TBD';
  };

  const renderMatch = (match: TournamentMatch, matchIndex: number) => {
    const isCompleted = match.status === 'completed';
    const winner = match.winnerId;
    
    return (
      <Card 
        key={match.id} 
        className={`relative transition-all hover:shadow-md ${getStatusColor(match.status)}`}
      >
        <CardContent className="p-3">
          {/* Match Header */}
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs">
              {match.status.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Match {match.matchNumber}
            </span>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <div className={`flex items-center justify-between p-2 rounded border-2 transition-colors ${
              winner === match.participant1Id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
            }`}>
              <span className={`font-medium text-sm ${
                winner === match.participant1Id ? 'text-yellow-800' : ''
              }`}>
                {getParticipantName(match.participant1Id)}
                {winner === match.participant1Id && <Trophy className="inline h-3 w-3 ml-1 text-yellow-600" />}
              </span>
              <span className="font-bold">
                {match.participant1Score ?? '-'}
              </span>
            </div>
            
            <div className="text-center">
              <span className="text-xs text-muted-foreground">vs</span>
            </div>
            
            <div className={`flex items-center justify-between p-2 rounded border-2 transition-colors ${
              winner === match.participant2Id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
            }`}>
              <span className={`font-medium text-sm ${
                winner === match.participant2Id ? 'text-yellow-800' : ''
              }`}>
                {getParticipantName(match.participant2Id)}
                {winner === match.participant2Id && <Trophy className="inline h-3 w-3 ml-1 text-yellow-600" />}
              </span>
              <span className="font-bold">
                {match.participant2Score ?? '-'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          {onUpdateMatch && match.status === 'scheduled' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full mt-2 text-xs"
              onClick={() => onUpdateMatch(match)}
            >
              Start Match
            </Button>
          )}

          {/* Match Time */}
          {match.scheduledTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              {match.scheduledTime.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Bracket Generated</h3>
            <p className="text-muted-foreground">
              Add participants and generate the tournament bracket to view matches.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Tournament Bracket
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {participants.length} participants • {matches.filter(m => m.status === 'completed').length}/{matches.length} matches completed
            </p>
          </div>

          {/* Bracket Layout */}
          <div className="relative overflow-x-auto">
            <div className="flex gap-8 min-w-fit pb-4">
              {rounds.map((round, roundIndex) => (
                <div key={round.roundNumber} className="flex-shrink-0">
                  {/* Round Header */}
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-lg">{round.roundName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}
                    </p>
                  </div>

                  {/* Matches in Round */}
                  <div className="space-y-6" style={{ minWidth: '280px' }}>
                    {round.matches.map((match, matchIndex) => (
                      <div key={match.id} className="relative">
                        {renderMatch(match, matchIndex)}
                        
                        {/* Connection Lines to Next Round */}
                        {roundIndex < rounds.length - 1 && (
                          <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-300 transform -translate-y-1/2">
                            <div className="absolute right-0 top-0 w-2 h-2 bg-gray-300 rounded-full transform -translate-y-1/2"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tournament Status */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Tournament Progress</span>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-green-50">
                  {matches.filter(m => m.status === 'completed').length} completed
                </Badge>
                <Badge variant="outline" className="bg-blue-50">
                  {matches.filter(m => m.status === 'in_progress').length} in progress
                </Badge>
                <Badge variant="outline" className="bg-gray-50">
                  {matches.filter(m => m.status === 'scheduled').length} scheduled
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};