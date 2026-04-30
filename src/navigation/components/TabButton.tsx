import { cloneElement, type ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '../../utils/cn';

interface TabButtonProps {
  active: boolean;
  icon: ReactElement;
  onPress: () => void;
  label?: string;
}

export function TabButton({ active, icon, onPress, label }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        'p-2 rounded-xl',
        active && 'bg-primary/10 dark:bg-primary/20',
      )}
    >
      {cloneElement(icon, {
        size: 28,
        className: active ? 'text-primary' : 'text-gray-400 dark:text-gray-500',
      } as any)}
    </Pressable>
  );
}
