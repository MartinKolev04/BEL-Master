export const ROUTES = {
  AUTH: '/auth',
  ONBOARDING: '/onboarding',
  HOME: '/',
  QUIZ: '/quiz',
  QUIZ_WITH_CATEGORY: '/quiz/[category]',
  MULTIPLAYER: '/multiplayer',
  LEADERBOARD: '/leaderboard',
  SCANNER: '/scanner',
  PROFILE: '/profile',
  LIBRARY: '/library',
} as const;

export type RouteValue = (typeof ROUTES)[keyof typeof ROUTES];
