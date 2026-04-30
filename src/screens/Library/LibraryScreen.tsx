import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenHeader } from '../../components/ui';
import { BookOpen } from '../../components/icons';
import { literaryWorksByGrade, type LiteraryWork } from '../../data/literaryWorks';
import { useLiteraryWorkDetails } from '../../hooks/useLiteraryWorkDetails';
import { useTranslation } from '../../i18n';
import { ROUTES } from '../../navigation/routes';
import { useUserProfile } from '../../store/UserProfileContext';
import { WorkCard } from './components/WorkCard';
import { WorkDetails } from './components/WorkDetails';

export function LibraryScreen() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const { t } = useTranslation();
  const [selectedWork, setSelectedWork] = useState<LiteraryWork | null>(null);
  const { details, loading, fetch, clear } = useLiteraryWorkDetails();

  if (!profile) return null;

  const works = literaryWorksByGrade[profile.grade || '7'];

  const handleWorkClick = (work: LiteraryWork) => {
    setSelectedWork(work);
    fetch(work.title, work.author);
  };

  const handleBackToList = () => {
    setSelectedWork(null);
    clear();
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
          title={t.library.title}
          icon={<BookOpen className="text-secondary" size={32} />}
        />

        {selectedWork ? (
          <WorkDetails
            work={selectedWork}
            details={details}
            loading={loading}
            onBack={handleBackToList}
          />
        ) : (
          <View>
            {works.map((work, i) => (
              <View key={i} className="mb-4">
                <WorkCard work={work} onPress={() => handleWorkClick(work)} />
              </View>
            ))}
          </View>
        )}
      </MotiView>
    </ScrollView>
  );
}
