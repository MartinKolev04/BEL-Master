import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { ArrowLeft } from '../icons';

interface ScreenHeaderProps {
  title: string;
  icon?: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
}

export function ScreenHeader({ title, icon, onBack, trailing }: ScreenHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row justify-between items-center mb-8">
      {onBack ? (
        <Pressable onPress={onBack} className="flex-row items-center gap-1">
          <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
          <Text className="text-gray-500 dark:text-gray-400 font-bold">{t.app.back}</Text>
        </Pressable>
      ) : (
        <View />
      )}
      <View className="flex-row items-center gap-3">
        {icon}
        <Text className="text-3xl font-black dark:text-white">{title}</Text>
      </View>
      {trailing ?? <View />}
    </View>
  );
}
