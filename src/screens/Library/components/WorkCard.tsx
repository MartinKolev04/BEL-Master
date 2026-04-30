import { Text, View } from 'react-native';
import { Card } from '../../../components/ui';
import type { LiteraryWork } from '../../../data/literaryWorks';

interface WorkCardProps {
  work: LiteraryWork;
  onPress: () => void;
}

export function WorkCard({ work, onPress }: WorkCardProps) {
  return (
    <Card className="p-6" onPress={onPress}>
      <Text className="text-xl font-bold text-secondary mb-1">{work.title}</Text>
      <Text className="font-medium text-gray-700 dark:text-gray-300">{work.author}</Text>
      <View className="mt-4 flex-row items-center gap-2">
        <View className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
          <Text className="text-[10px] font-bold text-gray-400 uppercase">{work.period}</Text>
        </View>
        {work.gradeLabel ? (
          <View className="px-2 py-1 bg-secondary/10 rounded-full">
            <Text className="text-[10px] font-bold text-secondary uppercase">{work.gradeLabel}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
