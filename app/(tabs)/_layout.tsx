import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';
import { LoadingSpinner } from '../../src/components/ui';
import { BottomTabBar } from '../../src/navigation/components/BottomTabBar';
import { useTranslation } from '../../src/i18n';
import { useAuth } from '../../src/store/AuthContext';
import { useUserProfile } from '../../src/store/UserProfileContext';

export default function TabsLayout() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { t } = useTranslation();

  if (authLoading || profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-bg-dark">
        <LoadingSpinner label={t.app.loading} />
      </View>
    );
  }

  if (!firebaseUser) return <Redirect href="/(auth)/auth" />;
  if (profile && !profile.grade) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'home' }} />
      <Tabs.Screen name="library" options={{ title: 'library' }} />
      <Tabs.Screen name="scanner" options={{ title: 'scanner' }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'leaderboard' }} />
      <Tabs.Screen name="profile" options={{ title: 'profile' }} />
    </Tabs>
  );
}
