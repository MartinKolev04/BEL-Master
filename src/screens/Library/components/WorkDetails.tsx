import { MotiView } from 'moti';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ArrowLeft, BookOpen, User as UserIcon, Users, Zap } from '../../../components/icons';
import type { LiteraryWork } from '../../../data/literaryWorks';
import { useTranslation } from '../../../i18n';
import type { LiteraryWorkDetails as LiteraryWorkDetailsData } from '../../../services/ai/GeminiService';

interface WorkDetailsProps {
  work: LiteraryWork;
  details: LiteraryWorkDetailsData | null;
  loading: boolean;
  onBack: () => void;
}

export function WorkDetails({ work, details, loading, onBack }: WorkDetailsProps) {
  const { t } = useTranslation();

  return (
    <MotiView
      from={{ opacity: 0, translateX: 50 }}
      animate={{ opacity: 1, translateX: 0 }}
    >
      <Pressable onPress={onBack} className="flex-row items-center gap-2 mb-6">
        <ArrowLeft size={20} className="text-secondary" />
        <Text className="text-secondary font-bold">{t.library.backToList}</Text>
      </Pressable>

      <View className="p-6 bg-secondary/5 rounded-3xl border-2 border-secondary/20 mb-6">
        <Text className="text-2xl font-black text-secondary mb-1">{work.title}</Text>
        <Text className="text-lg font-bold text-gray-600 dark:text-gray-300">{work.author}</Text>
      </View>

      {loading ? (
        <View className="p-12 items-center">
          <ActivityIndicator size="large" color="#1cb0f6" style={{ marginBottom: 16 }} />
          <Text className="text-gray-400">{t.library.aiAnalyzing}</Text>
        </View>
      ) : details ? (
        <View>
          <Section title={t.library.summary} icon={<BookOpen size={20} className="text-secondary" />} body={details.summary} />
          <Section title={t.library.analysis} icon={<Zap size={20} className="text-secondary" />} body={details.analysis} />
          <Section title={t.library.characters} icon={<Users size={20} className="text-secondary" />} body={details.characters} />
          <Section title={t.library.aboutAuthor} icon={<UserIcon size={20} className="text-secondary" />} body={details.authorInfo} />
        </View>
      ) : null}
    </MotiView>
  );
}

function Section({ title, icon, body }: { title: string; icon: ReactNode; body: string }) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center gap-2 mb-3">
        {icon}
        <Text className="text-lg font-black text-secondary">{title}</Text>
      </View>
      <View className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
        <Text className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{body}</Text>
      </View>
    </View>
  );
}
