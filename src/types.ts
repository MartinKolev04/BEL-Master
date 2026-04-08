export type Grade = '7' | '10' | '12';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  xp: number;
  level: number;
  grade: Grade | null;
  streak: number;
  lastActive: string;
  achievements: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: 'grammar' | 'literature' | 'spelling' | 'reading' | 'writing' | 'full_test' | 'vocabulary' | 'punctuation';
  context?: string;
  type?: 'multiple_choice' | 'matching' | 'open_ended' | 'essay' | 'lis' | 'multiple_choice_cloze' | 'passage';
  correctAnswerText?: string;
  matchingItems?: {
    left: string[];
    right: string[];
  };
}

export interface QuizResult {
  userId: string;
  category: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  timestamp: string;
  grade: Grade;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  xp: number;
  level: number;
}

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
  currentTurn: string; // UID of player whose turn it is
  currentQuestion: QuizQuestion | null;
  round: number;
  maxRounds: number;
  timerStart: number | null;
  winner?: string;
  lastAction?: string;
  timestamp: any;
}
