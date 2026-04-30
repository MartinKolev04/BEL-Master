import type { ReactNode } from 'react';
import { Pressable, Text, type PressableProps, type ViewStyle } from 'react-native';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'error' | 'outline';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
  type?: 'button' | 'submit';
  onClick?: () => void;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  error: 'bg-error',
  outline: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
};

const VARIANT_TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  accent: 'text-white',
  error: 'text-white',
  outline: 'text-black dark:text-white',
};

const SHADOW_STYLE: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 0,
  elevation: 4,
};

export function Button({
  children,
  className,
  variant = 'primary',
  disabled,
  onClick,
  onPress,
  ...rest
}: ButtonProps) {
  const handlePress: PressableProps['onPress'] = (event) => {
    onPress?.(event);
    onClick?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        variant === 'outline' ? undefined : SHADOW_STYLE,
        pressed ? { transform: [{ translateY: 4 }], shadowOpacity: 0 } : null,
      ]}
      className={cn(
        'w-full flex-row items-center justify-center px-6 py-3 rounded-xl',
        VARIANT_CLASSES[variant],
        disabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text className={cn('font-bold text-base', VARIANT_TEXT_CLASSES[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
