import type { Grade } from './grade';

export type QuizCategory =
  | 'grammar'
  | 'literature'
  | 'spelling'
  | 'reading'
  | 'writing'
  | 'full_test'
  | 'vocabulary'
  | 'punctuation';

export type QuizQuestionType =
  | 'multiple_choice'
  | 'matching'
  | 'open_ended'
  | 'essay'
  | 'lis'
  | 'multiple_choice_cloze'
  | 'passage';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: QuizCategory;
  context?: string;
  type?: QuizQuestionType;
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
