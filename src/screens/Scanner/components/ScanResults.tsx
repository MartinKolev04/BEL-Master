import { ActivityIndicator, Image, Text, View } from 'react-native';
import { Button } from '../../../components/ui';
import { CheckCircle2, ChevronRight } from '../../../components/icons';
import type { SpellingScanResult } from '../../../services/ai/GeminiService';
import { useTranslation } from '../../../i18n';

interface ScanResultsProps {
  image: string;
  result: SpellingScanResult | null;
  analyzing: boolean;
  onReset: () => void;
}

export function ScanResults({ image, result, analyzing, onReset }: ScanResultsProps) {
  const { t } = useTranslation();

  return (
    <View>
      <Image
        source={{ uri: image }}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 16, marginBottom: 24 }}
        resizeMode="cover"
      />

      {analyzing ? (
        <View className="p-8 items-center">
          <ActivityIndicator size="large" color="#58cc02" style={{ marginBottom: 16 }} />
          <Text className="text-gray-500 dark:text-gray-400">{t.scanner.analyzing}</Text>
        </View>
      ) : result ? (
        <View>
          <View className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700 mb-4">
            <Text className="font-bold text-sm text-gray-400 dark:text-gray-500 uppercase mb-2">
              {t.scanner.extractedText}
            </Text>
            <Text className="text-sm dark:text-gray-200">{result.extractedText}</Text>
          </View>

          <Text className="font-bold dark:text-white mb-3">
            {t.scanner.detectedErrors(result.errors.length)}
          </Text>
          {result.errors.length === 0 ? (
            <View className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border-2 border-green-100 dark:border-green-800 flex-row items-center gap-3 mb-4">
              <CheckCircle2 className="text-green-700 dark:text-green-400" />
              <Text className="text-green-700 dark:text-green-400">{t.scanner.noErrors}</Text>
            </View>
          ) : (
            <View className="mb-4">
              {result.errors.map((err, i) => (
                <View
                  key={i}
                  className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border-2 border-red-100 dark:border-red-800 mb-3"
                >
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="line-through text-red-400 dark:text-red-500">
                      {err.original}
                    </Text>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                    <Text className="font-bold text-green-600 dark:text-green-400">
                      {err.correction}
                    </Text>
                  </View>
                  <Text className="text-xs text-red-700 dark:text-red-300">{err.reason}</Text>
                </View>
              ))}
            </View>
          )}

          <Button variant="outline" onPress={onReset}>
            {t.scanner.rescan}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
