export type PlayerLevel = 'A' | 'B' | 'C' | 'D';
export type PlayerStatus = 'Available' | 'In progress' | 'Done';

export interface Player {
  id: string;
  name: string;
  eligible: boolean;
  gamesPlayed: number;
  status: PlayerStatus;
  level: PlayerLevel;
}

export interface Game {
  id: string;
  players: Player[];
  gameNumber: number;
  timestamp: Date;
  completed: boolean;
}