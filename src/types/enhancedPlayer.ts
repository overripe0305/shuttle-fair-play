import { PlayerLevel, PlayerStatus } from './player';

export interface EnhancedPlayer {
  id: string;
  name: string;
  level: PlayerLevel;
  birthday?: Date;
  photo?: string;
  eligible: boolean;
  gamesPlayed: number;
  gamePenaltyBonus: number;
  status: PlayerStatus;
  matchHistory: string[];
  createdAt: Date;
}