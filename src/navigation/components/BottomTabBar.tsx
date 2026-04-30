import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Camera,
  Home as HomeIcon,
  Trophy,
  User as UserIcon,
} from '../../components/icons';
import { useTranslation } from '../../i18n';
import { TabButton } from './TabButton';

const ICONS_BY_ROUTE: Record<string, ReactElement> = {
  index: <HomeIcon />,
  library: <BookOpen />,
  scanner: <Camera />,
  leaderboard: <Trophy />,
  profile: <UserIcon />,
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const labels: Record<string, string> = {
    index: t.navigation.home,
    library: t.navigation.library,
    scanner: t.navigation.scanner,
    leaderboard: t.navigation.leaderboard,
    profile: t.navigation.profile,
  };

  return (
    <View
      className="bg-white dark:bg-gray-900 border-t-2 border-gray-100 dark:border-gray-800 px-6 pt-3 flex-row justify-between items-center max-w-[480px] mx-auto w-full"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {state.routes.map((route, idx) => {
        const isFocused = state.index === idx;
        const icon = ICONS_BY_ROUTE[route.name];
        if (!icon) return null;
        return (
          <TabButton
            key={route.key}
            active={isFocused}
            icon={icon}
            label={labels[route.name]}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            }}
          />
        );
      })}
    </View>
  );
}
