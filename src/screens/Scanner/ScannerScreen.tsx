import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { ScrollView, Text } from 'react-native';
import { ScreenHeader } from '../../components/ui';
import { Camera } from '../../components/icons';
import { useScanner } from '../../hooks/useScanner';
import { useTranslation } from '../../i18n';
import { ROUTES } from '../../navigation/routes';
import { ImageCapture } from './components/ImageCapture';
import { ScanResults } from './components/ScanResults';

export function ScannerScreen() {
  const router = useRouter();
  const { image, analyzing, result, captureFromDataUrl, reset } = useScanner();
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-bg-dark"
      contentContainerStyle={{ paddingBottom: 96, flexGrow: 1 }}
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-6"
      >
        <ScreenHeader
          onBack={() => router.replace(ROUTES.HOME as never)}
          title={t.scanner.title}
          icon={<Camera className="text-primary" size={32} />}
        />
        <Text className="text-gray-500 dark:text-gray-400 mb-8">{t.scanner.description}</Text>

        {!image ? (
          <ImageCapture onCapture={captureFromDataUrl} />
        ) : (
          <ScanResults image={image} result={result} analyzing={analyzing} onReset={reset} />
        )}
      </MotiView>
    </ScrollView>
  );
}
