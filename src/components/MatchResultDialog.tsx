import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users } from 'lucide-react';
import { TournamentMatch, TournamentParticipant } from '@/types/tournament';
import { toast } from 'sonner';

interface MatchResultDialogProps {
  match: TournamentMatch | null;
  participants: TournamentParticipant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (matchId: string, participant1Score: number, participant2Score: number, winnerId: string) => Promise<void>;
}

export const MatchResultDialog = ({ 
  match, 
  participants, 
  open, 
  onOpenChange, 
  onSubmit 
}: MatchResultDialogProps) => {
  const [participant1Score, setParticipant1Score] = useState<number>(0);
  const [participant2Score, setParticipant2Score] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!match) return null;

  const participant1 = participants.find(p => p.id === match.participant1Id);
  const participant2 = participants.find(p => p.id === match.participant2Id);

  const handleSubmit = async () => {
    if (!match.participant1Id || !match.participant2Id) {
      toast.error('Both participants must be set');
      return;
    }

    if (participant1Score === participant2Score) {
      toast.error('Scores cannot be tied');
      return;
    }

    const winnerId = participant1Score > participant2Score ? match.participant1Id : match.participant2Id;

    setIsSubmitting(true);
    try {
      await onSubmit(match.id, participant1Score, participant2Score, winnerId);
      onOpenChange(false);
      setParticipant1Score(0);
      setParticipant2Score(0);
    } catch (error) {
      console.error('Error submitting match result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setParticipant1Score(0);
    setParticipant2Score(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Enter Match Result
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Info */}
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-sm">
              Round {match.roundNumber} - Match {match.matchNumber}
            </Badge>
          </div>

          {/* Participants and Scores */}
          <div className="space-y-4">
            {/* Participant 1 */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{participant1?.playerName || 'Player 1'}</div>
                <div className="text-sm text-muted-foreground">
                  Seed #{participant1?.seedNumber}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="participant1Score" className="text-sm">Score</Label>
                <Input
                  id="participant1Score"
                  type="number"
                  min="0"
                  max="99"
                  value={participant1Score}
                  onChange={(e) => setParticipant1Score(parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                />
              </div>
            </div>

            {/* VS Divider */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px bg-border flex-1" />
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="h-px bg-border flex-1" />
              </div>
            </div>

            {/* Participant 2 */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{participant2?.playerName || 'Player 2'}</div>
                <div className="text-sm text-muted-foreground">
                  Seed #{participant2?.seedNumber}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="participant2Score" className="text-sm">Score</Label>
                <Input
                  id="participant2Score"
                  type="number"
                  min="0"
                  max="99"
                  value={participant2Score}
                  onChange={(e) => setParticipant2Score(parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                />
              </div>
            </div>
          </div>

          {/* Winner Preview */}
          {participant1Score !== participant2Score && (participant1Score > 0 || participant2Score > 0) && (
            <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-700">
                Winner: {participant1Score > participant2Score ? participant1?.playerName : participant2?.playerName}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting || participant1Score === participant2Score}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Result'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};