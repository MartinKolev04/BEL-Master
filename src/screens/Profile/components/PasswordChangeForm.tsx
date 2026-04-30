import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/ui';
import { useTranslation } from '../../../i18n';
import { authService } from '../../../services/firebase/AuthService';

const INPUT_CLASSES =
  'w-full p-3 rounded-xl border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white';

export function PasswordChangeForm() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setError(t.profile.passwordChangeError);
    }
  };

  return (
    <View className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
      <View className="mb-3">
        <TextInput
          placeholder={t.profile.currentPassword}
          placeholderTextColor="#9CA3AF"
          className={INPUT_CLASSES}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
      </View>
      <View className="mb-3">
        <TextInput
          placeholder={t.profile.newPassword}
          placeholderTextColor="#9CA3AF"
          className={INPUT_CLASSES}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
      </View>
      {error ? <Text className="text-error text-xs font-bold mb-3">{error}</Text> : null}
      {success ? (
        <Text className="text-primary text-xs font-bold mb-3">{t.profile.passwordChanged}</Text>
      ) : null}
      <Button onPress={handleSubmit}>{t.app.save}</Button>
    </View>
  );
}
