import { useState } from 'react';
import { PlayerLevel, MajorLevel, SubLevel, getBracketFromMajorSub } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPlayer: (name: string, level: PlayerLevel) => void;
}

export function AddPlayerDialog({ open, onOpenChange, onAddPlayer }: AddPlayerDialogProps) {
  const [name, setName] = useState('');
  const [majorLevel, setMajorLevel] = useState<MajorLevel>('Beginner');
  const [subLevel, setSubLevel] = useState<SubLevel>('Mid');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const bracket = getBracketFromMajorSub(majorLevel, majorLevel === 'Newbie' ? undefined : subLevel);
      const level: PlayerLevel = {
        bracket,
        major: majorLevel,
        sub: majorLevel === 'Newbie' ? undefined : subLevel
      };
      onAddPlayer(name.trim(), level);
      setName('');
      setMajorLevel('Beginner');
      setSubLevel('Mid');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Player Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter player name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="majorLevel">Major Level</Label>
              <Select value={majorLevel} onValueChange={(value: MajorLevel) => setMajorLevel(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select major level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Newbie">Newbie (Level 0)</SelectItem>
                  <SelectItem value="Beginner">Beginner (Levels 1-3)</SelectItem>
                  <SelectItem value="Intermediate">Intermediate (Levels 4-6)</SelectItem>
                  <SelectItem value="Advance">Advance (Levels 7-9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {majorLevel !== 'Newbie' && (
              <div className="grid gap-2">
                <Label htmlFor="subLevel">Sub Level</Label>
                <Select value={subLevel} onValueChange={(value: SubLevel) => setSubLevel(value)}>
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
            
            <div className="text-sm text-muted-foreground">
              Bracket Level: {getBracketFromMajorSub(majorLevel, majorLevel === 'Newbie' ? undefined : subLevel)}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Player</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}