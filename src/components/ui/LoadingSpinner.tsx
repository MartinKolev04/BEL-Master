import { ActivityIndicator, Text, View } from 'react-native';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
}

const PRIMARY = '#58cc02';
const SECONDARY = '#1cb0f6';

const SIZE_PIXELS: Record<NonNullable<LoadingSpinnerProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

export function LoadingSpinner({
  size = 'md',
  className,
  label,
  variant = 'primary',
}: LoadingSpinnerProps) {
  const color = variant === 'primary' ? PRIMARY : SECONDARY;
  return (
    <View className={cn('flex-col items-center justify-center', className)}>
      <ActivityIndicator size={SIZE_PIXELS[size]} color={color} style={{ marginBottom: 16 }} />
      {label ? <Text className="text-gray-500">{label}</Text> : null}
    </View>
  );
}
