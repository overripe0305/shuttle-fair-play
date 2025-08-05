import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BadmintonEvent } from '@/types/event';

interface EventSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: BadmintonEvent;
  onUpdateEvent: (eventId: string, updates: { title?: string; date?: Date; courtCount?: number; queueFee?: number }) => void;
}

export function EventSettingsDialog({ open, onOpenChange, event, onUpdateEvent }: EventSettingsDialogProps) {
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState<Date>(new Date(event.date));
  const [courtCount, setCourtCount] = useState((event.courtCount || 4).toString());
  const [queueFee, setQueueFee] = useState((event.queueFee || 0).toString());

  useEffect(() => {
    setTitle(event.title);
    setDate(new Date(event.date));
    setCourtCount((event.courtCount || 4).toString());
    setQueueFee((event.queueFee || 0).toString());
  }, [event]);

  const handleSave = () => {
    const updates: { title?: string; date?: Date; courtCount?: number; queueFee?: number } = {};
    
    if (title !== event.title) {
      updates.title = title;
    }
    
    if (date.getTime() !== new Date(event.date).getTime()) {
      updates.date = date;
    }
    
    const newCourtCount = parseInt(courtCount);
    if (newCourtCount !== (event.courtCount || 4)) {
      updates.courtCount = newCourtCount;
    }

    const newQueueFee = parseFloat(queueFee);
    if (newQueueFee !== (event.queueFee || 0)) {
      updates.queueFee = newQueueFee;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateEvent(event.id, updates);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Event Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title">Event Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
            />
          </div>

          {/* Event Date */}
          <div className="space-y-2">
            <Label>Event Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Number of Courts */}
          <div className="space-y-2">
            <Label htmlFor="court-count">Number of Courts</Label>
            <Select value={courtCount} onValueChange={setCourtCount}>
              <SelectTrigger id="court-count">
                <SelectValue placeholder="Select number of courts" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    {count} Court{count > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Queue Fee */}
          <div className="space-y-2">
            <Label htmlFor="queue-fee">Queue Fee (₱)</Label>
            <Input
              id="queue-fee"
              type="number"
              value={queueFee}
              onChange={(e) => setQueueFee(e.target.value)}
              placeholder="Enter queue fee amount"
              min="0"
              step="0.01"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}