import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

interface CourtSelectorProps {
  currentCourtCount: number;
  onCourtCountChange: (count: number) => void;
}

export function CourtSelector({ currentCourtCount, onCourtCountChange }: CourtSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [courtCount, setCourtCount] = useState(currentCourtCount);

  const handleSave = () => {
    onCourtCountChange(courtCount);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          {currentCourtCount} Courts
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Courts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="court-count">Number of Courts</Label>
            <Input
              id="court-count"
              type="number"
              min="1"
              max="20"
              value={courtCount}
              onChange={(e) => setCourtCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}