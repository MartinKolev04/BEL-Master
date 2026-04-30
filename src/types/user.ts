import type { Grade } from './grade';

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
