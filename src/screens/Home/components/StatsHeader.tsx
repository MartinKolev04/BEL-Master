import { Text, View } from 'react-native';
import { Award, Flame, Zap } from '../../../components/icons';
import { useTranslation } from '../../../i18n';
import type { UserProfile } from '../../../types';

interface StatsHeaderProps {
  profile: UserProfile;
}

export function StatsHeader({ profile }: StatsHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row justify-between items-center mb-8">
      <View className="flex-row items-center gap-2">
        <View className="bg-accent p-2 rounded-lg">
          <Flame size={20} className="text-white" />
        </View>
        <Text className="font-bold text-accent">{profile.streak}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="bg-primary p-2 rounded-lg">
          <Zap size={20} className="text-white" />
        </View>
        <Text className="font-bold text-primary">{profile.xp} XP</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="bg-secondary p-2 rounded-lg">
          <Award size={20} className="text-white" />
        </View>
        <Text className="font-bold text-secondary">
          {t.home.levelLabel} {profile.level}
        </Text>
      </View>
    </View>
  );
}
