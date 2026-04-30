import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/ui';
import { useTranslation } from '../../../i18n';
import { authService } from '../../../services/firebase/AuthService';
import { userProfileRepository } from '../../../services/repositories/UserProfileRepository';
import type { UserProfile } from '../../../types';

const INPUT_CLASSES =
  'w-full p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white';

export function EmailAuthForm() {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (isRegister && password !== confirmPassword) {
      setError(t.auth.passwordsMismatch);
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        const user = await authService.registerWithEmail({ email, password });
        const profile: UserProfile = {
          uid: user.uid,
          displayName: email.split('@')[0] || t.auth.defaultDisplayName,
          email,
          xp: 0,
          level: 1,
          grade: null,
          streak: 0,
          lastActive: new Date().toISOString(),
          achievements: [],
        };
        await userProfileRepository.create(profile);
      } else {
        await authService.signInWithEmail({ email, password });
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="w-full mb-6">
      <View className="w-full mb-3">
        <TextInput
          placeholder={t.auth.emailPlaceholder}
          placeholderTextColor="#9CA3AF"
          className={INPUT_CLASSES}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
        />
      </View>
      <View className="w-full mb-3">
        <TextInput
          ref={passwordRef}
          placeholder={t.auth.passwordPlaceholder}
          placeholderTextColor="#9CA3AF"
          className={INPUT_CLASSES}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType={isRegister ? 'next' : 'done'}
          onSubmitEditing={() => {
            if (isRegister) confirmRef.current?.focus();
            else handleSubmit();
          }}
          blurOnSubmit={!isRegister}
        />
      </View>
      {isRegister && (
        <View className="w-full mb-3">
          <TextInput
            ref={confirmRef}
            placeholder={t.auth.confirmPasswordPlaceholder}
            placeholderTextColor="#9CA3AF"
            className={INPUT_CLASSES}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>
      )}
      {error ? <Text className="text-error text-sm font-bold mb-3">{error}</Text> : null}
      <Button onPress={handleSubmit} disabled={loading}>
        {loading ? t.auth.loadingButton : isRegister ? t.auth.register : t.auth.signIn}
      </Button>

      <Pressable onPress={() => setIsRegister(!isRegister)} className="mt-6 self-center">
        <Text className="text-primary font-bold underline">
          {isRegister ? t.auth.toggleToSignIn : t.auth.toggleToRegister}
        </Text>
      </Pressable>
    </View>
  );
}
