import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Award, Flame, Star } from '../../../components/icons';
import { ACHIEVEMENTS } from '../../../constants/achievements';
import { useTranslation } from '../../../i18n';
import { cn } from '../../../utils/cn';

const ICONS: Record<string, ReactNode> = {
  star: <Star />,
  flame: <Flame />,
  award: <Award />,
};

export function AchievementsGrid() {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap">
      {ACHIEVEMENTS.map((ach) => (
        <View key={ach.id} className="w-1/3 px-2 mb-4 items-center">
          <View className="opacity-50 items-center">
            <View
              className={cn(
                'w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center border-2 border-gray-100 dark:border-gray-700 mb-2',
                ach.colorClass,
              )}
            >
              {ICONS[ach.iconKey]}
            </View>
            <Text className="text-[10px] font-bold text-center dark:text-gray-300">
              {t.profile[ach.nameKey]}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
