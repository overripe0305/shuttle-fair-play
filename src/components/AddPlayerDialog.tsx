import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { PlayerLevel } from '@/types/player';

interface AddPlayerDialogProps {
  onAddPlayer: (name: string, level: PlayerLevel) => void;
}

export function AddPlayerDialog({ onAddPlayer }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<PlayerLevel>('C');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddPlayer(name.trim(), level);
      setName('');
      setLevel('C');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Player Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter player name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="level">Skill Level</Label>
            <Select value={level} onValueChange={(value: PlayerLevel) => setLevel(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Level A (Advanced)</SelectItem>
                <SelectItem value="B">Level B (Intermediate)</SelectItem>
                <SelectItem value="C">Level C (Beginner+)</SelectItem>
                <SelectItem value="D">Level D (Beginner)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Player</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}