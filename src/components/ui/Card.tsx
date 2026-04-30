import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '../../utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  onPress?: () => void;
  active?: boolean;
}

const BASE = 'p-4 border-2 rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';
const ACTIVE = 'border-secondary bg-secondary/10 dark:bg-secondary/20';

export function Card({ children, className, onClick, onPress, active }: CardProps) {
  const handlePress = onPress ?? onClick;
  const classes = cn(BASE, active && ACTIVE, className);

  if (handlePress) {
    return (
      <Pressable onPress={handlePress} className={classes}>
        {children}
      </Pressable>
    );
  }

  return <View className={classes}>{children}</View>;
}
