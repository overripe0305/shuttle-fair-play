export type MajorLevel = 'Newbie' | 'Beginner' | 'Intermediate' | 'Advance';
export type SubLevel = 'Low' | 'Mid' | 'High';
export type BracketLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type PlayerStatus = 'available' | 'in_progress' | 'waiting' | 'done';
export type PairType = 'Balanced' | 'Mixed';

export interface PlayerLevel {
  bracket: BracketLevel;
  major: MajorLevel;
  sub?: SubLevel; // Only for Beginner and Intermediate
}

export interface Player {
  id: string;
  name: string;
  eligible: boolean;
  gamesPlayed: number;
  gamePenaltyBonus: number; // Manual adjustment for fairness
  status: PlayerStatus;
  level: PlayerLevel;
  matchHistory: string[]; // Array of game IDs
}

export interface GamePair {
  players: [Player, Player];
  averageLevel: number;
  pairType: PairType;
}

export interface GameMatch {
  pair1: GamePair;
  pair2: GamePair;
}

export interface Game {
  id: string;
  match: GameMatch;
  gameNumber: number;
  timestamp: Date;
  completed: boolean;
}

// Helper functions for level system
export const getLevelDisplay = (level: PlayerLevel): string => {
  if (level.bracket === 0) return 'Newbie';
  if (level.sub) {
    return `${level.major} ${level.sub} (${level.bracket})`;
  }
  return `${level.major} (${level.bracket})`;
};

export const getBracketFromMajorSub = (major: MajorLevel, sub?: SubLevel): BracketLevel => {
  if (major === 'Newbie') return 0;
  if (major === 'Beginner') {
    if (sub === 'Low') return 1;
    if (sub === 'Mid') return 2;
    if (sub === 'High') return 3;
  }
  if (major === 'Intermediate') {
    if (sub === 'Low') return 4;
    if (sub === 'Mid') return 5;
    if (sub === 'High') return 6;
  }
  if (major === 'Advance') {
    if (sub === 'Low') return 7;
    if (sub === 'Mid') return 8;
    if (sub === 'High') return 9;
  }
  return 0;
};