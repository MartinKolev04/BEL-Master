import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { ScrollView, Text, View } from 'react-native';
import { LoadingSpinner, ScreenHeader } from '../../components/ui';
import { Trophy } from '../../components/icons';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useTranslation } from '../../i18n';
import { ROUTES } from '../../navigation/routes';
import { cn } from '../../utils/cn';

export function LeaderboardScreen() {
  const router = useRouter();
  const { entries, loading } = useLeaderboard();
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-bg-dark"
      contentContainerStyle={{ paddingBottom: 96 }}
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-6"
      >
        <ScreenHeader
          onBack={() => router.replace(ROUTES.HOME as never)}
          title={t.leaderboard.title}
          icon={<Trophy className="text-accent" size={32} />}
        />

        {loading ? (
          <View className="items-center justify-center p-12">
            <LoadingSpinner size="sm" />
          </View>
        ) : (
          <View>
            {entries.map((entry, idx) => (
              <View
                key={entry.uid}
                className={cn(
                  'flex-row items-center gap-4 p-4 rounded-2xl border-2 mb-3',
                  idx === 0
                    ? 'border-accent bg-accent/5 dark:bg-accent/10'
                    : 'border-gray-100 dark:border-gray-800 dark:bg-gray-900',
                )}
              >
                <View
                  className={cn(
                    'w-8 h-8 rounded-full items-center justify-center',
                    idx === 0
                      ? 'bg-accent'
                      : 'bg-gray-100 dark:bg-gray-800',
                  )}
                >
                  <Text
                    className={cn(
                      'font-black',
                      idx === 0 ? 'text-white' : 'text-gray-400 dark:text-gray-500',
                    )}
                  >
                    {idx + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold dark:text-white">{entry.displayName}</Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500">
                    {t.leaderboard.levelLabel} {entry.level}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-black text-primary">{entry.xp}</Text>
                  <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                    XP
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </MotiView>
    </ScrollView>
  );
}
