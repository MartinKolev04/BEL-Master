import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { userProfileRepository } from '../services/repositories/UserProfileRepository';
import { questionsRepository } from '../services/repositories/QuestionsRepository';
import { isAdminEmail } from '../constants/admin';
import type { UserProfile } from '../types';
import { useAuth } from './AuthContext';
import { useTranslation } from '../i18n';

interface UserProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { firebaseUser } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    const existing = await userProfileRepository.get(uid);
    if (existing) {
      setProfile(existing);
      return;
    }

    const fallback: UserProfile = {
      uid,
      displayName:
        firebaseUser?.displayName ||
        firebaseUser?.email?.split('@')[0] ||
        t.auth.defaultDisplayName,
      email: firebaseUser?.email || '',
      xp: 0,
      level: 1,
      grade: null,
      streak: 0,
      lastActive: new Date().toISOString(),
      achievements: [],
    };
    await userProfileRepository.create(fallback);
    setProfile(fallback);
  }, [firebaseUser, t.auth.defaultDisplayName]);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (isAdminEmail(firebaseUser.email)) {
      questionsRepository.seedInitialData().catch((error) => {
        console.error('Admin seed failed:', error);
      });
    }
    load(firebaseUser.uid)
      .catch((error) => {
        console.error('User profile load failed:', error);
      })
      .finally(() => setLoading(false));
  }, [firebaseUser, load]);

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    const fresh = await userProfileRepository.get(firebaseUser.uid);
    if (fresh) setProfile(fresh);
  }, [firebaseUser]);

  const value = useMemo<UserProfileContextValue>(
    () => ({ profile, loading, refresh, setProfile }),
    [profile, loading, refresh],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within a UserProfileProvider.');
  return ctx;
}
