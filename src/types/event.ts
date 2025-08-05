export interface BadmintonEvent {
  id: string;
  title: string;
  date: Date;
  selectedPlayerIds: string[];
  createdAt: Date;
  status: 'upcoming' | 'active' | 'completed' | 'ended';
  courtCount?: number;
  queueFee?: number;
}

export interface EventPlayer {
  id: string;
  name: string;
  majorLevel: string;
  subLevel?: string;
  addedForEvent?: boolean; // If player was added specifically for this event
  addedAt?: Date; // When player was added to event for chronological order
}