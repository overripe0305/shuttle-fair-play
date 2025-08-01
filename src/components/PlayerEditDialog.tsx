import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MajorLevel, SubLevel } from '@/types/player';
import { EnhancedPlayer } from '@/types/enhancedPlayer';

interface PlayerEditDialogProps {
  player: EnhancedPlayer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (playerId: string, updates: { name?: string; majorLevel?: MajorLevel; subLevel?: SubLevel }) => void;
}

export function PlayerEditDialog({ player, open, onOpenChange, onSave }: PlayerEditDialogProps) {
  const [name, setName] = useState(player.name);
  const [majorLevel, setMajorLevel] = useState(player.level.major);
  const [subLevel, setSubLevel] = useState(player.level.sub);

  const needsSubLevel = (major: MajorLevel) => {
    return major === 'Beginner' || major === 'Intermediate' || major === 'Advance';
  };

  const handleSave = () => {
    onSave(player.id, {
      name: name !== player.name ? name : undefined,
      majorLevel: majorLevel !== player.level.major ? majorLevel : undefined,
      subLevel: subLevel !== player.level.sub ? subLevel : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Player</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
            />
          </div>
          
          <div>
            <Label>Major Level</Label>
            <Select 
              value={majorLevel} 
              onValueChange={(value: MajorLevel) => {
                setMajorLevel(value);
                if (!needsSubLevel(value)) {
                  setSubLevel(undefined);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select major level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Newbie">Newbie</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advance">Advance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsSubLevel(majorLevel) && (
            <div>
              <Label>Sub Level</Label>
              <Select 
                value={subLevel || ''} 
                onValueChange={(value: SubLevel) => setSubLevel(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Mid">Mid</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}