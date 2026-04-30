import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui';
import { useTranslation } from '../../../i18n';
import { questionsRepository } from '../../../services/repositories/QuestionsRepository';

export function AdminPanel() {
  const { t } = useTranslation();

  const handleSeed = async () => {
    try {
      await questionsRepository.seedInitialData();
      Alert.alert(t.profile.refreshTestsSuccess);
    } catch (e) {
      Alert.alert(t.profile.refreshTestsError((e as Error).message));
    }
  };

  return (
    <View className="mb-8 p-4 bg-primary/10 rounded-2xl border-2 border-primary/20">
      <Text className="font-bold mb-2 text-primary">{t.profile.adminPanel}</Text>
      <Button onPress={handleSeed}>{t.profile.refreshTests}</Button>
    </View>
  );
}
