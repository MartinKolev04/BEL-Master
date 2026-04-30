import type { ReactNode } from 'react';
import { I18nProvider } from '../i18n';
import { AuthProvider } from '../store/AuthContext';
import { ThemeProvider } from '../store/ThemeContext';
import { UserProfileProvider } from '../store/UserProfileContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <UserProfileProvider>{children}</UserProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
