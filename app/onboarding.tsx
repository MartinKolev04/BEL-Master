import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { LoadingSpinner } from '../src/components/ui';
import { useTranslation } from '../src/i18n';
import { OnboardingScreen } from '../src/screens/Onboarding';
import { useAuth } from '../src/store/AuthContext';
import { useUserProfile } from '../src/store/UserProfileContext';

export default function OnboardingPage() {
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
  if (profile?.grade) return <Redirect href="/(tabs)" />;

  return <OnboardingScreen />;
}
