import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Settings, Users, Plus, UserPlus, Camera, Check } from 'lucide-react';
import { Tournament, TournamentParticipant } from '@/types/tournament';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { getLevelDisplay } from '@/types/player';
import { toast } from 'sonner';

interface TournamentSettingsDialogProps {
  tournament: Tournament;
  participants: TournamentParticipant[];
  availablePlayers: EnhancedPlayer[];
  onAddParticipants: (playerIds: string[]) => Promise<void>;
  children: React.ReactNode;
}

export const TournamentSettingsDialog = ({ 
  tournament, 
  participants,
  availablePlayers,
  onAddParticipants,
  children 
}: TournamentSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isAddingParticipants, setIsAddingParticipants] = useState(false);

  // Filter out players who are already participants
  const participantPlayerIds = participants.map(p => p.playerId);
  const eligiblePlayers = availablePlayers.filter(p => !participantPlayerIds.includes(p.id));

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleAddParticipants = async () => {
    if (selectedPlayerIds.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    setIsAddingParticipants(true);
    try {
      await onAddParticipants(selectedPlayerIds);
      setSelectedPlayerIds([]);
      toast.success(`${selectedPlayerIds.length} participant(s) added successfully!`);
    } catch (error) {
      console.error('Error adding participants:', error);
      toast.error('Failed to add participants');
    } finally {
      setIsAddingParticipants(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tournament Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tournament Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {tournament.tournamentType === 'single_stage' ? 'Single Stage' : 'Double Stage'}
                </div>
                <div>
                  <span className="font-medium">Stage:</span> {tournament.currentStage.replace('_', ' ')}
                </div>
                <div>
                  <span className="font-medium">Participants:</span> {participants.length}
                </div>
                <div>
                  <span className="font-medium">Format:</span> 
                  {tournament.stageConfig.singleStage ? 
                    (tournament.stageConfig.singleStage.format === 'single_elimination' ? ' Single Elimination' : ' Double Elimination')
                    : ' Group + Elimination'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current Participants ({participants.length})
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {participants.map((participant, index) => (
                  <div key={participant.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    <div className="text-sm font-medium">#{participant.seedNumber || index + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium">{participant.playerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {participant.wins}W-{participant.losses}L
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add More Participants */}
          {eligiblePlayers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add More Participants
                  </div>
                  {selectedPlayerIds.length > 0 && (
                    <Badge variant="secondary">
                      {selectedPlayerIds.length} selected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {eligiblePlayers.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => handlePlayerToggle(player.id)}
                    >
                      <Checkbox 
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={() => handlePlayerToggle(player.id)}
                      />
                      
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.photo} alt={player.name} />
                        <AvatarFallback>
                          <Camera className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getLevelDisplay(player.level)} • {player.gamesPlayed} games
                        </div>
                      </div>

                      {selectedPlayerIds.includes(player.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>

                {selectedPlayerIds.length > 0 && (
                  <Button 
                    onClick={handleAddParticipants} 
                    disabled={isAddingParticipants}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isAddingParticipants ? 'Adding...' : `Add ${selectedPlayerIds.length} Participant(s)`}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {eligiblePlayers.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>All available players are already participating in this tournament.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};