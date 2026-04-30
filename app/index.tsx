import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { LoadingSpinner } from '../src/components/ui';
import { useTranslation } from '../src/i18n';
import { useAuth } from '../src/store/AuthContext';
import { useUserProfile } from '../src/store/UserProfileContext';

export default function Index() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { t } = useTranslation();

  if (authLoading || (firebaseUser && profileLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-bg-dark">
        <Text className="text-primary font-bold text-2xl">{t.app.loading}</Text>
      </View>
    );
  }

  if (!firebaseUser) {
    return <Redirect href="/(auth)/auth" />;
  }

  if (profile && !profile.grade) {
    return <Redirect href="/onboarding" />;
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-bg-dark">
        <LoadingSpinner label={t.app.loading} />
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}
