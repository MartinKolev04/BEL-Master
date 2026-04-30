import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, ScreenHeader } from '../../components/ui';
import { LogOut, Settings, User as UserIcon } from '../../components/icons';
import { isAdminEmail } from '../../constants/admin';
import { useTranslation } from '../../i18n';
import { ROUTES } from '../../navigation/routes';
import { authService } from '../../services/firebase/AuthService';
import { userProfileRepository } from '../../services/repositories/UserProfileRepository';
import { useAuth } from '../../store/AuthContext';
import { useUserProfile } from '../../store/UserProfileContext';
import type { Grade } from '../../types';
import { AchievementsGrid } from './components/AchievementsGrid';
import { AdminPanel } from './components/AdminPanel';
import { GradeEditor } from './components/GradeEditor';
import { PasswordChangeForm } from './components/PasswordChangeForm';

export function ProfileScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const { profile, setProfile } = useUserProfile();
  const { t } = useTranslation();
  const [editingGrade, setEditingGrade] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  if (!profile) return null;

  const handleLogout = () => authService.signOut();

  const handleGradeUpdate = async (grade: Grade) => {
    await userProfileRepository.setGrade(profile.uid, grade);
    setProfile({ ...profile, grade });
    setEditingGrade(false);
  };

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
          title={t.profile.title}
          trailing={
            <Pressable onPress={handleLogout} className="p-2 rounded-xl">
              <LogOut size={24} className="text-error" />
            </Pressable>
          }
        />

        <View className="flex-col items-center mb-8">
          <View
            className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-gray-900 overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {firebaseUser?.photoURL ? (
              <Image
                source={{ uri: firebaseUser.photoURL }}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <UserIcon size={48} className="text-gray-300 dark:text-gray-600" />
            )}
          </View>
          <Text className="text-xl font-bold text-black dark:text-white">
            {profile.displayName || t.auth.defaultDisplayName}
          </Text>
          <Text className="text-gray-400 dark:text-gray-500 text-sm">{profile.email}</Text>
        </View>

        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
            <Text className="text-xs text-gray-400 font-bold uppercase">{t.profile.statTotalXp}</Text>
            <Text className="text-xl font-black text-primary">{profile.xp}</Text>
          </View>
          <View className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
            <Text className="text-xs text-gray-400 font-bold uppercase">{t.profile.statGrade}</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-black text-secondary">{profile.grade || '?'}-ти</Text>
              <Pressable onPress={() => setEditingGrade(!editingGrade)}>
                <Settings size={16} className="text-gray-300 dark:text-gray-600" />
              </Pressable>
            </View>
          </View>
        </View>

        {editingGrade && <GradeEditor currentGrade={profile.grade} onSelect={handleGradeUpdate} />}

        {isAdminEmail(profile.email) && <AdminPanel />}

        <View className="mb-8">
          <Button
            variant="secondary"
            onPress={() => setShowPasswordChange(!showPasswordChange)}
            className="font-bold"
          >
            {t.profile.changePassword}
          </Button>
          {showPasswordChange && <PasswordChangeForm />}
        </View>

        <Text className="font-bold mb-4 dark:text-white">{t.profile.achievements}</Text>
        <AchievementsGrid />
      </MotiView>
    </ScrollView>
  );
}
