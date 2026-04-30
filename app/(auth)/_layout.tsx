import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { LoadingSpinner } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n';
import { useAuth } from '../../src/store/AuthContext';

export default function AuthLayout() {
  const { firebaseUser, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-bg-dark">
        <LoadingSpinner label={t.app.loading} />
      </View>
    );
  }

  if (firebaseUser) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
