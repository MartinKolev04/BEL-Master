import React from 'react';
import { Text, View } from 'react-native';
import { Button } from './ui';
import { bg } from '../i18n/locales/bg';

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: unknown, errorInfo: unknown): void {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  private handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const message =
        (this.state.error as Error | null)?.message ?? bg.app.errorBoundaryDefault;
      return (
        <View className="flex-1 flex-col items-center justify-center p-8">
          <Text className="text-2xl font-bold text-error mb-4 text-center">
            {bg.app.errorBoundaryTitle}
          </Text>
          <Text className="text-gray-500 mb-8 text-center">{message}</Text>
          <Button onPress={this.handleRestart}>{bg.app.restart}</Button>
        </View>
      );
    }
    return this.props.children;
  }
}
