import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TournamentParticipant } from '@/types/tournament';
import { GripVertical, RotateCcw, Shuffle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableParticipantItemProps {
  participant: TournamentParticipant;
  index: number;
}

const DraggableParticipantItem = ({ participant, index }: DraggableParticipantItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg ${
        isDragging ? 'shadow-lg' : 'hover:bg-accent/50'
      }`}
      {...attributes}
    >
      <div
        className="flex items-center justify-center w-6 h-6 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground transition-colors"
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary text-sm font-semibold rounded-full">
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="font-medium">{participant.playerName}</p>
        <p className="text-xs text-muted-foreground">
          {participant.wins}W - {participant.losses}L
        </p>
      </div>
    </div>
  );
};

interface DraggableParticipantListProps {
  participants: TournamentParticipant[];
  onReorder: (newOrder: TournamentParticipant[]) => void;
  onRegenerate: () => void;
  disabled?: boolean;
}

export const DraggableParticipantList = ({
  participants,
  onReorder,
  onRegenerate,
  disabled = false
}: DraggableParticipantListProps) => {
  const [orderedParticipants, setOrderedParticipants] = useState(participants);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setOrderedParticipants((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onReorder(newOrder);
        return newOrder;
      });
    }
  };

  const handleShuffle = () => {
    const shuffled = [...orderedParticipants].sort(() => Math.random() - 0.5);
    setOrderedParticipants(shuffled);
    onReorder(shuffled);
  };

  const handleReset = () => {
    setOrderedParticipants(participants);
    onReorder(participants);
  };

  if (disabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div key={participant.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{participant.playerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {participant.wins}W - {participant.losses}L
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Participants (Drag to Reorder)</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShuffle}>
              <Shuffle className="h-4 w-4 mr-1" />
              Shuffle
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedParticipants.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedParticipants.map((participant, index) => (
                <DraggableParticipantItem
                  key={participant.id}
                  participant={participant}
                  index={index}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        <div className="mt-4 pt-4 border-t">
          <Button onClick={onRegenerate} className="w-full">
            Regenerate Bracket with New Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};