import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TournamentMatch, Tournament } from '@/types/tournament';
import { Trophy, Users, Clock, Play } from 'lucide-react';

interface TournamentBracketProps {
  tournament: Tournament;
  matches: TournamentMatch[];
  onUpdateMatch?: (match: TournamentMatch) => void;
}

export const TournamentBracket = ({ tournament, matches, onUpdateMatch }: TournamentBracketProps) => {
  const getMatchesByStage = (stage: 'group_stage' | 'elimination_stage') => {
    return matches.filter(match => match.stage === stage);
  };

  const getGroupMatches = () => {
    const groupMatches = getMatchesByStage('group_stage');
    const groups: { [key: string]: TournamentMatch[] } = {};
    
    groupMatches.forEach(match => {
      if (match.groupId) {
        if (!groups[match.groupId]) {
          groups[match.groupId] = [];
        }
        groups[match.groupId].push(match);
      }
    });
    
    return groups;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'scheduled': return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    }
  };

  const renderMatch = (match: TournamentMatch) => (
    <Card key={match.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(match.status)}>
              {match.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Round {match.roundNumber}, Match {match.matchNumber}
            </span>
          </div>
          {onUpdateMatch && match.status === 'scheduled' && (
            <Button size="sm" variant="outline" onClick={() => onUpdateMatch(match)}>
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border rounded">
            <span className="font-medium">
              {match.participant1Name || 'TBD'}
            </span>
            <span className="font-bold text-lg">
              {match.participant1Score ?? '-'}
            </span>
          </div>
          <div className="text-center text-xs text-muted-foreground">VS</div>
          <div className="flex items-center justify-between p-2 border rounded">
            <span className="font-medium">
              {match.participant2Name || 'TBD'}
            </span>
            <span className="font-bold text-lg">
              {match.participant2Score ?? '-'}
            </span>
          </div>
        </div>
        
        {match.winnerId && (
          <div className="mt-2 text-center">
            <Badge variant="default">
              <Trophy className="h-3 w-3 mr-1" />
              Winner: {match.winnerId === match.participant1Id ? match.participant1Name : match.participant2Name}
            </Badge>
          </div>
        )}
        
        {match.scheduledTime && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {match.scheduledTime.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (tournament.currentStage === 'setup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Tournament Configuration</h3>
            <p className="text-muted-foreground mb-4">
              Configure your tournament settings and add participants to generate brackets.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {tournament.currentStage.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {tournament.participants.length} participants
            </span>
            <span className="text-sm text-muted-foreground">
              {matches.filter(m => m.status === 'completed').length} / {matches.length} matches completed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Group Stage */}
      {tournament.currentStage === 'group_stage' && tournament.tournamentType === 'double_stage' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Group Stage</h3>
          {Object.entries(getGroupMatches()).map(([groupId, groupMatches]) => (
            <Card key={groupId}>
              <CardHeader>
                <CardTitle className="text-base">Group {groupId}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groupMatches.map(renderMatch)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Elimination Stage */}
      {(tournament.currentStage === 'elimination_stage' || tournament.tournamentType === 'single_stage') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {tournament.tournamentType === 'single_stage' ? 'Tournament Bracket' : 'Elimination Stage'}
          </h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Elimination Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getMatchesByStage('elimination_stage').map(renderMatch)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Completed Tournament */}
      {tournament.currentStage === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Tournament Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
              <p className="text-muted-foreground">
                The tournament has been completed successfully.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};