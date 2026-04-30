import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { ScrollView, Text, View } from 'react-native';
import { BookOpen, PenTool, Search, Users, Zap } from '../../components/icons';
import type { HomeQuizCategory } from '../../constants/categories';
import { useTranslation } from '../../i18n';
import { ROUTES } from '../../navigation/routes';
import { useUserProfile } from '../../store/UserProfileContext';
import { CategoryCard } from './components/CategoryCard';
import { StatsHeader } from './components/StatsHeader';

export function HomeScreen() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const { t } = useTranslation();

  if (!profile) return null;

  const startQuiz = (category: HomeQuizCategory) => {
    router.push(`${ROUTES.QUIZ}/${category}` as never);
  };

  const firstName = (profile.displayName || t.auth.defaultDisplayName).split(' ')[0];

  return (
    <ScrollView className="flex-1 bg-white dark:bg-bg-dark" contentContainerStyle={{ paddingBottom: 96 }}>
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        className="flex-1 p-6"
      >
        <StatsHeader profile={profile} />

        <View className="mb-8">
          <Text className="text-2xl font-black mb-2 dark:text-white">
            {t.home.greeting(firstName)}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400">
            {t.home.preparingFor(profile.grade ?? '?')}
          </Text>
        </View>

        <View>
          <View className="mb-4">
            <CategoryCard
              icon={<Zap size={32} />}
              title={t.home.grammarTitle}
              description={t.home.grammarDesc}
              onPress={() => startQuiz('grammar')}
            />
          </View>
          <View className="mb-4">
            <CategoryCard
              icon={<Search size={32} />}
              title={t.home.readingTitle}
              description={t.home.readingDesc}
              onPress={() => startQuiz('reading')}
              iconBgClass="bg-secondary/10 dark:bg-secondary/20"
              iconColorClass="text-secondary"
            />
          </View>
          <View className="mb-4">
            <CategoryCard
              icon={<BookOpen size={32} />}
              title={t.home.literatureTitle}
              description={t.home.literatureDesc}
              onPress={() => startQuiz('literature')}
              iconBgClass="bg-accent/10 dark:bg-accent/20"
              iconColorClass="text-accent"
            />
          </View>
          <View className="mb-4">
            <CategoryCard
              icon={<PenTool size={32} />}
              title={t.home.writingTitle}
              description={t.home.writingDesc}
              onPress={() => startQuiz('writing')}
              iconBgClass="bg-error/10 dark:bg-error/20"
              iconColorClass="text-error"
            />
          </View>
          <View className="mb-4">
            <CategoryCard
              icon={<Zap size={32} />}
              title={t.home.fullTestTitle}
              description={t.home.fullTestDesc}
              onPress={() => startQuiz('full_test')}
            />
          </View>
          <View className="mb-4">
            <CategoryCard
              icon={<BookOpen size={32} />}
              title={t.home.libraryShortcut}
              description={t.home.literatureDesc}
              onPress={() => router.push(ROUTES.LIBRARY as never)}
              iconBgClass="bg-secondary/10 dark:bg-secondary/20"
              iconColorClass="text-secondary"
            />
          </View>
          <View className="mb-4">
            <CategoryCard
              icon={<Users size={32} />}
              title={t.home.multiplayerShortcut}
              description={t.home.preparingFor(profile.grade ?? '?')}
              onPress={() => router.push(ROUTES.MULTIPLAYER as never)}
              iconBgClass="bg-accent/10 dark:bg-accent/20"
              iconColorClass="text-accent"
            />
          </View>
        </View>
      </MotiView>
    </ScrollView>
  );
}
