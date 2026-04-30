import { Pressable, Text, View } from 'react-native';
import { GRADES } from '../../../constants/grades';
import { useTranslation } from '../../../i18n';
import { cn } from '../../../utils/cn';
import type { Grade } from '../../../types';

interface GradeEditorProps {
  currentGrade: Grade | null;
  onSelect: (grade: Grade) => void;
}

export function GradeEditor({ currentGrade, onSelect }: GradeEditorProps) {
  const { t } = useTranslation();

  return (
    <View className="mb-8 p-6 bg-secondary/5 rounded-3xl border-2 border-secondary/20">
      <Text className="font-bold mb-4 dark:text-white">{t.profile.chooseGrade}</Text>
      <View className="flex-row gap-3">
        {GRADES.map((grade) => (
          <Pressable
            key={grade}
            onPress={() => onSelect(grade)}
            className={cn(
              'flex-1 py-3 rounded-xl border-2 items-center',
              currentGrade === grade
                ? 'bg-secondary border-secondary'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
            )}
          >
            <Text
              className={cn(
                'font-bold',
                currentGrade === grade
                  ? 'text-white'
                  : 'text-gray-400 dark:text-gray-500',
              )}
            >
              {grade}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
