import type { UserProfile } from './user';
import type { QuizQuestion } from './quiz';

export type GameStatus = 'waiting' | 'starting' | 'playing' | 'finished';

export interface GamePlayer extends UserProfile {
  color: string;
  isReady: boolean;
  score: number;
  lastAnswerTime?: number;
  hasAnswered?: boolean;
  isCorrect?: boolean;
}

export interface Tile {
  id: number;
  ownerId: string | null;
  color: string | null;
}

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  players: Record<string, GamePlayer>;
  playerOrder: string[];
  board: Tile[];
  currentTurn: string;
  currentQuestion: QuizQuestion | null;
  round: number;
  maxRounds: number;
  timerStart: number | null;
  winner?: string;
  lastAction?: string;
  timestamp: any;
}
