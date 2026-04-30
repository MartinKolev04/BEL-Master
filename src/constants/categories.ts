import type { QuizCategory } from '../types';

export type HomeQuizCategory = Extract<
  QuizCategory,
  'grammar' | 'literature' | 'spelling' | 'reading' | 'writing' | 'full_test'
>;

export const HOME_CATEGORIES: readonly HomeQuizCategory[] = [
  'grammar',
  'reading',
  'literature',
  'writing',
  'full_test',
];
