import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TournamentConfig, SeedingMethod } from '@/types/tournament';
import { EnhancedPlayer } from '@/types/enhancedPlayer';
import { Trophy, Users, Settings, Play, Camera, Check } from 'lucide-react';
import { getLevelDisplay } from '@/types/player';

interface TournamentSetupProps {
  players: EnhancedPlayer[];
  onCreateTournament: (config: TournamentConfig, selectedPlayerIds: string[]) => void;
  onCancel: () => void;
}

export const TournamentSetup = ({ players, onCreateTournament, onCancel }: TournamentSetupProps) => {
  const [config, setConfig] = useState<TournamentConfig>({
    tournamentType: 'single_stage',
    singleStage: {
      format: 'single_elimination'
    }
  });
  
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleTournamentTypeChange = (isDoubleStage: boolean) => {
    if (isDoubleStage) {
      setConfig({
        tournamentType: 'double_stage',
        doubleStage: {
          groupStage: {
            participantsPerGroup: 4,
            participantsToAdvance: 2,
            seedingMethod: 'random'
          },
          eliminationStage: {
            format: 'single_elimination'
          }
        }
      });
    } else {
      setConfig({
        tournamentType: 'single_stage',
        singleStage: {
          format: 'single_elimination'
        }
      });
    }
  };

  const handleCreate = () => {
    if (selectedPlayerIds.length < 2) {
      alert('Please select at least 2 participants');
      return;
    }
    onCreateTournament(config, selectedPlayerIds);
  };

  const selectedPlayers = players.filter(player => selectedPlayerIds.includes(player.id));

  return (
    <div className="space-y-6">
      {/* Tournament Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tournament Type Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Tournament Type</Label>
              <p className="text-sm text-muted-foreground">
                {config.tournamentType === 'single_stage' 
                  ? 'Single Stage: Direct elimination bracket'
                  : 'Double Stage: Group stage followed by elimination'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={config.tournamentType === 'single_stage' ? 'font-medium' : 'text-muted-foreground'}>
                Single Stage
              </span>
              <Switch
                checked={config.tournamentType === 'double_stage'}
                onCheckedChange={handleTournamentTypeChange}
              />
              <span className={config.tournamentType === 'double_stage' ? 'font-medium' : 'text-muted-foreground'}>
                Double Stage
              </span>
            </div>
          </div>

          {/* Single Stage Configuration */}
          {config.tournamentType === 'single_stage' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="font-medium">Single Stage Settings</h4>
              <div>
                <Label>Tournament Format</Label>
                <Select 
                  value={config.singleStage?.format || 'single_elimination'}
                  onValueChange={(value: 'single_elimination' | 'double_elimination') => 
                    setConfig(prev => ({
                      ...prev,
                      singleStage: { format: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">Single Elimination</SelectItem>
                    <SelectItem value="double_elimination">Double Elimination</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {config.singleStage?.format === 'single_elimination' 
                    ? 'Players are eliminated after one loss'
                    : 'Players must lose twice to be eliminated'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Double Stage Configuration */}
          {config.tournamentType === 'double_stage' && (
            <div className="space-y-4">
              {/* Group Stage Settings */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium mb-3">Group Stage Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Participants per Group</Label>
                    <Input
                      type="number"
                      min={2}
                      max={8}
                      value={config.doubleStage?.groupStage.participantsPerGroup || 4}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        doubleStage: {
                          ...prev.doubleStage!,
                          groupStage: {
                            ...prev.doubleStage!.groupStage,
                            participantsPerGroup: parseInt(e.target.value) || 4
                          }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Participants to Advance</Label>
                    <Input
                      type="number"
                      min={1}
                      max={config.doubleStage?.groupStage.participantsPerGroup || 4}
                      value={config.doubleStage?.groupStage.participantsToAdvance || 2}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        doubleStage: {
                          ...prev.doubleStage!,
                          groupStage: {
                            ...prev.doubleStage!.groupStage,
                            participantsToAdvance: parseInt(e.target.value) || 2
                          }
                        }
                      }))}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Seeding Method</Label>
                  <Select 
                    value={config.doubleStage?.groupStage.seedingMethod || 'random'}
                    onValueChange={(value: SeedingMethod) => 
                      setConfig(prev => ({
                        ...prev,
                        doubleStage: {
                          ...prev.doubleStage!,
                          groupStage: {
                            ...prev.doubleStage!.groupStage,
                            seedingMethod: value
                          }
                        }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="by_rating">By Rating</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Elimination Stage Settings */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium mb-3">Elimination Stage Settings</h4>
                <div>
                  <Label>Format</Label>
                  <Select value="single_elimination" disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_elimination">Single Elimination</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bracket size auto-derived from group stage qualifiers
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participant Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Participants ({selectedPlayerIds.length} selected)
            </div>
            {selectedPlayerIds.length > 0 && (
              <Badge variant="secondary">
                {selectedPlayerIds.length} participants
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Selected Players Summary */}
          {selectedPlayerIds.length > 0 && (
            <div className="mb-4 p-3 border rounded-lg bg-muted/20">
              <h4 className="font-medium mb-2">Selected Participants</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPlayers.map(player => (
                  <Badge key={player.id} variant="default" className="text-xs">
                    {player.name} ({getLevelDisplay(player.level)})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Player List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {players.map((player) => (
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
            
            {players.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No players available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleCreate} 
          className="flex-1"
          disabled={selectedPlayerIds.length < 2}
        >
          <Play className="h-4 w-4 mr-2" />
          Create Tournament
        </Button>
      </div>
    </div>
  );
};