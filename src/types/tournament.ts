export type TournamentType = 'single_stage' | 'double_stage';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';
export type TournamentStage = 'setup' | 'group_stage' | 'elimination_stage' | 'completed';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'walkover' | 'forfeit' | 'bye' | 'awaiting';
export type SeedingMethod = 'random' | 'by_rating' | 'manual';
export type TournamentPlayFormat = 'singles' | 'doubles';

export interface TournamentConfig {
  tournamentType: TournamentType;
  playFormat: TournamentPlayFormat;
  singleStage?: {
    format: 'single_elimination' | 'double_elimination';
  };
  doubleStage?: {
    groupStage: {
      participantsPerGroup: number;
      participantsToAdvance: number;
      seedingMethod: SeedingMethod;
    };
    eliminationStage: {
      format: 'single_elimination';
    };
  };
}

export interface TournamentPair {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
}

export interface Tournament {
  id: string;
  eventId: string;
  tournamentType: TournamentType;
  stageConfig: TournamentConfig;
  currentStage: TournamentStage;
  participants: TournamentParticipant[];
  brackets: TournamentBrackets;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  playerId: string;
  playerName: string;
  seedNumber?: number;
  groupId?: string;
  eliminatedAt?: Date;
  finalPosition?: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  stage: 'group_stage' | 'elimination_stage';
  roundNumber: number;
  matchNumber: number;
  participant1Id?: string;
  participant2Id?: string;
  participant1Score?: number;
  participant2Score?: number;
  winnerId?: string;
  status: MatchStatus;
  scheduledTime?: Date;
  completedTime?: Date;
  groupId?: string;
  bracketPosition?: string;
  participant1Name?: string;
  participant2Name?: string;
}

export interface TournamentBrackets {
  groups?: GroupStage[];
  elimination?: EliminationBracket;
}

export interface GroupStage {
  id: string;
  name: string;
  participants: string[];
  matches: TournamentMatch[];
  standings: GroupStanding[];
}

export interface GroupStanding {
  participantId: string;
  participantName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  position: number;
}

export interface EliminationBracket {
  winners?: BracketRound[];
  losers?: BracketRound[];
  grandFinal?: TournamentMatch[];
}

export interface BracketRound {
  roundNumber: number;
  matches: TournamentMatch[];
}

// Extended event type to include tournament information
export interface TournamentEvent {
  id: string;
  title: string;
  date: Date;
  eventType: 'regular' | 'tournament';
  tournamentConfig?: TournamentConfig;
  selectedPlayerIds: string[];
  createdAt: Date;
  status: 'upcoming' | 'active' | 'completed' | 'ended';
  courtCount?: number;
  queueFee?: number;
}