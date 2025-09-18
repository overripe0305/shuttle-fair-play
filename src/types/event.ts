export interface BadmintonEvent {
  id: string;
  title: string;
  date: Date;
  selectedPlayerIds: string[];
  playerOrder?: string[]; // Ordered by when players were added to event
  createdAt: Date;
  status: 'upcoming' | 'active' | 'completed' | 'ended';
  courtCount?: number;
  queueFee?: number;
  eventType?: 'regular' | 'tournament';
  tournamentConfig?: any;
}

export interface EventPlayer {
  id: string;
  name: string;
  majorLevel: string;
  subLevel?: string;
  addedForEvent?: boolean; // If player was added specifically for this event
  addedAt?: Date; // When player was added to event for chronological order
}