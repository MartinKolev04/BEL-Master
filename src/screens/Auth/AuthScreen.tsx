import { MotiView } from 'moti';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from '../../i18n';
import { BookOpen } from '../../components/icons';
import { EmailAuthForm } from './components/EmailAuthForm';

export function AuthScreen() {
  const { t } = useTranslation();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-bg-dark"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="items-center p-8"
          >
            <View
              className="w-24 h-24 bg-primary rounded-3xl items-center justify-center mb-6"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 8,
                transform: [{ rotate: '3deg' }],
              }}
            >
              <BookOpen size={48} className="text-white" />
            </View>
            <Text className="text-4xl font-black text-primary mb-2 tracking-tight text-center">
              {t.app.name}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 mb-8 text-lg text-center">
              {t.app.tagline}
            </Text>

            <EmailAuthForm />
          </MotiView>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
