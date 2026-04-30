import { MotiView } from 'moti';
import { Text, View } from 'react-native';
import { Card } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { GRADES } from '../../constants/grades';
import { useTranslation } from '../../i18n';
import { userProfileRepository } from '../../services/repositories/UserProfileRepository';
import { useUserProfile } from '../../store/UserProfileContext';
import type { Grade } from '../../types';

interface GradeOption {
  id: Grade;
  labelKey: 'grade7' | 'grade10' | 'grade12';
  descKey: 'grade7Desc' | 'grade10Desc' | 'grade12Desc';
}

const OPTIONS: GradeOption[] = [
  { id: '7', labelKey: 'grade7', descKey: 'grade7Desc' },
  { id: '10', labelKey: 'grade10', descKey: 'grade10Desc' },
  { id: '12', labelKey: 'grade12', descKey: 'grade12Desc' },
];

export function OnboardingScreen() {
  const { profile, setProfile } = useUserProfile();
  const { t } = useTranslation();

  if (!profile) return null;

  const handleSelect = async (grade: Grade) => {
    await userProfileRepository.setGrade(profile.uid, grade);
    setProfile({ ...profile, grade });
  };

  void GRADES;

  return (
    <MotiView
      from={{ opacity: 0, translateX: 50 }}
      animate={{ opacity: 1, translateX: 0 }}
      className="flex-1 flex-col p-8 bg-white dark:bg-bg-dark"
    >
      <Text className="text-3xl font-black mb-2 mt-8 dark:text-white">{t.onboarding.welcome}</Text>
      <Text className="text-gray-500 dark:text-gray-400 mb-12">{t.onboarding.chooseGrade}</Text>

      <View className="flex-1">
        {OPTIONS.map((option) => (
          <Card
            key={option.id}
            onPress={() => handleSelect(option.id)}
            className="p-6 flex-row items-center gap-4 mb-4"
          >
            <View className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl items-center justify-center">
              <Text className="text-primary font-black">{option.id}</Text>
            </View>
            <View>
              <Text className="font-bold text-lg dark:text-white">{t.onboarding[option.labelKey]}</Text>
              <Text className="text-sm text-gray-400 dark:text-gray-500">
                {t.onboarding[option.descKey]}
              </Text>
            </View>
            <View className="ml-auto">
              <ChevronRight className="text-gray-300 dark:text-gray-600" />
            </View>
          </Card>
        ))}
      </View>
    </MotiView>
  );
}
