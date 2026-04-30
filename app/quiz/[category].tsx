import { Redirect } from 'expo-router';
import { QuizScreen } from '../../src/screens/Quiz';
import { useAuth } from '../../src/store/AuthContext';
import { useUserProfile } from '../../src/store/UserProfileContext';

export default function QuizPage() {
  const { firebaseUser } = useAuth();
  const { profile } = useUserProfile();

  if (!firebaseUser) return <Redirect href="/(auth)/auth" />;
  if (profile && !profile.grade) return <Redirect href="/onboarding" />;

  return <QuizScreen />;
}
