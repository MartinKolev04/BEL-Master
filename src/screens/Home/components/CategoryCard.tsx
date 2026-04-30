import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Card } from '../../../components/ui';
import { ChevronRight } from '../../../components/icons';

interface CategoryCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  iconBgClass?: string;
  iconColorClass?: string;
}

export function CategoryCard({
  icon,
  title,
  description,
  onPress,
  iconBgClass = 'bg-primary/10 dark:bg-primary/20',
  iconColorClass = 'text-primary',
}: CategoryCardProps) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-4 p-6">
      <View className={`w-16 h-16 ${iconBgClass} rounded-2xl items-center justify-center`}>
        <View className={iconColorClass}>{icon}</View>
      </View>
      <View className="flex-1">
        <Text className="font-bold text-lg dark:text-white">{title}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{description}</Text>
      </View>
      <ChevronRight className="text-gray-300 dark:text-gray-600" />
    </Card>
  );
}
