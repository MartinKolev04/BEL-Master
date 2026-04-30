import { Redirect } from 'expo-router';
import { MultiplayerScreen } from '../src/screens/Multiplayer';
import { useAuth } from '../src/store/AuthContext';
import { useUserProfile } from '../src/store/UserProfileContext';

export default function MultiplayerPage() {
  const { firebaseUser } = useAuth();
  const { profile } = useUserProfile();

  if (!firebaseUser) return <Redirect href="/(auth)/auth" />;
  if (profile && !profile.grade) return <Redirect href="/onboarding" />;

  return <MultiplayerScreen />;
}
