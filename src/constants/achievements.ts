export interface AchievementMeta {
  id: string;
  nameKey: 'achievementBeginner' | 'achievementStreak7' | 'achievementMaster';
  iconKey: 'star' | 'flame' | 'award';
  colorClass: string;
}

export const ACHIEVEMENTS: readonly AchievementMeta[] = [
  { id: '1', nameKey: 'achievementBeginner', iconKey: 'star', colorClass: 'text-yellow-400' },
  { id: '2', nameKey: 'achievementStreak7', iconKey: 'flame', colorClass: 'text-orange-500' },
  { id: '3', nameKey: 'achievementMaster', iconKey: 'award', colorClass: 'text-primary' },
];
