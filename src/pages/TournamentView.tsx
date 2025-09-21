import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTournamentManager } from '@/hooks/useTournamentManager';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TournamentBracket } from '@/components/TournamentBracket';
import { TournamentSetup } from '@/components/TournamentSetup';
import { TournamentBracketPreview } from '@/components/TournamentBracketPreview';
import { TournamentSettingsDialog } from '@/components/TournamentSettingsDialog';
import { MatchResultDialog } from '@/components/MatchResultDialog';
import { ArrowLeft, Trophy, Calendar, Users, Settings, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TournamentConfig, TournamentMatch, TournamentPair } from '@/types/tournament';

const TournamentView = () => {
  const { clubId, eventId } = useParams<{ clubId: string; eventId: string }>();
  const { events } = useEventManager(clubId);
  const { players } = useEnhancedPlayerManager(clubId);
  const { tournament, matches, participants, loading, createTournament, addMoreParticipants, refetch, updateMatchResult, generateTournamentBracket } = useTournamentManager();
  const [showSetup, setShowSetup] = useState(false);
  const [showBracketPreview, setShowBracketPreview] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [tournamentPairs, setTournamentPairs] = useState<TournamentPair[]>([]);

  const event = events.find(e => e.id === eventId);

  // Load tournament data when component mounts or eventId changes
  useEffect(() => {
    if (eventId) {
      refetch(eventId);
    }
  }, [eventId, refetch]);

  const handleCreateTournament = async (config: TournamentConfig, selectedPlayerIds: string[], pairs?: TournamentPair[]) => {
    if (!eventId) return;
    
    // Store config and participants for preview
    setTournamentConfig(config);
    setSelectedPlayers(selectedPlayerIds);
    setTournamentPairs(pairs || []);
    setShowSetup(false);
    setShowBracketPreview(true);
  };

  const handleGenerateBracketFromPreview = async (participants: string[] | TournamentPair[]) => {
    if (!eventId || !tournamentConfig) return;
    
    try {
      // First create the tournament with original player order
      await createTournament(eventId, tournamentConfig, selectedPlayers, tournamentPairs.length > 0 ? tournamentPairs : undefined);
      
      // Then generate bracket with custom order
      if (tournament?.id) {
        await generateTournamentBracket(tournament.id, participants);
      }
      
      setShowBracketPreview(false);
    } catch (error) {
      console.error('Failed to create tournament:', error);
    }
  };

  const handleAddParticipants = async (playerIds: string[]) => {
    if (!tournament) return;
    await addMoreParticipants(tournament.id, playerIds);
  };

  const handleGenerateBracket = async () => {
    if (!tournament?.id) return;
    try {
      await generateTournamentBracket(tournament.id);
    } catch (error) {
      console.error('Failed to generate bracket:', error);
    }
  };

  const handleMatchClick = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setIsMatchDialogOpen(true);
  };

  const handleMatchResult = async (matchId: string, participant1Score: number, participant2Score: number, winnerId: string) => {
    await updateMatchResult(matchId, participant1Score, participant2Score, winnerId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Tournament Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The tournament you're looking for doesn't exist.
          </p>
          <Link to={`/club/${clubId}/dashboard`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/club/${clubId}/dashboard`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  {event.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Tournament Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!tournament && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSetup(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Button>
              )}
              {tournament && (
            <TournamentSettingsDialog
              tournament={tournament}
              participants={participants}
              availablePlayers={players}
              onAddParticipants={handleAddParticipants}
              onGenerateBracket={handleGenerateBracket}
            >
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </TournamentSettingsDialog>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{event.date.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{participants.length} participants</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {event.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tournament Type */}
            {tournament && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tournament Format</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="outline">
                    {tournament.tournamentType === 'single_stage' ? 'Single Stage' : 'Double Stage'}
                  </Badge>
                  {tournament.stageConfig.singleStage && (
                    <p className="text-sm text-muted-foreground">
                      {tournament.stageConfig.singleStage.format === 'single_elimination' 
                        ? 'Single Elimination' 
                        : 'Double Elimination'
                      }
                    </p>
                  )}
                  {tournament.stageConfig.doubleStage && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Group Stage → Elimination</p>
                      <p>{tournament.stageConfig.doubleStage.groupStage.participantsPerGroup} per group</p>
                      <p>{tournament.stageConfig.doubleStage.groupStage.participantsToAdvance} advance</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {participants.map((participant, index) => (
                    <div key={participant.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        #{participant.seedNumber || index + 1} {participant.playerName}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {participant.wins}W-{participant.losses}L
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tournament View */}
          <div className="lg:col-span-3">
            {showSetup ? (
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <TournamentSetup
                    players={players}
                    onCreateTournament={handleCreateTournament}
                    onCancel={() => setShowSetup(false)}
                  />
                </CardContent>
              </Card>
            ) : showBracketPreview && tournamentConfig ? (
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Bracket Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <TournamentBracketPreview
                    config={tournamentConfig}
                    selectedPlayers={players.filter(p => selectedPlayers.includes(p.id))}
                    pairs={tournamentPairs.length > 0 ? tournamentPairs : undefined}
                    onGenerateBracket={handleGenerateBracketFromPreview}
                    onCancel={() => setShowBracketPreview(false)}
                  />
                </CardContent>
              </Card>
            ) : tournament ? (
              <>
                <TournamentBracket 
                  tournament={tournament} 
                  matches={matches}
                  participants={participants}
                  onUpdateMatch={handleMatchClick}
                />
                
                <MatchResultDialog
                  match={selectedMatch}
                  participants={participants}
                  open={isMatchDialogOpen}
                  onOpenChange={setIsMatchDialogOpen}
                  onSubmit={handleMatchResult}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Tournament Created</h3>
                    <p className="text-muted-foreground mb-6">
                      This event is configured as a tournament but hasn't been set up yet. Create the tournament to add participants and generate brackets.
                    </p>
                    <Button onClick={() => setShowSetup(true)} size="lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tournament
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentView;