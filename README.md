# БЕЛ Мастер

React Native (Expo) + Expo Router + NativeWind app for preparing for the Bulgarian Language and Literature exams (7th, 10th and 12th grade).

## Stack

- Expo SDK 51 with Expo Router (file-based navigation under `app/`)
- React Native 0.74 + TypeScript
- NativeWind v4 (Tailwind classes on React Native components)
- Firebase (Auth + Firestore) with AsyncStorage persistence
- Google Gemini for spell-checking and quiz generation
- Moti / Reanimated for animations
- expo-image-picker for the camera-based text scanner

## Layout

```
app/                       Expo Router file tree
  _layout.tsx              Providers + ErrorBoundary + root Stack
  index.tsx                Auth-state redirector
  (auth)/                  Unauthenticated routes
  (tabs)/                  Authenticated tab navigator
  onboarding.tsx
  multiplayer.tsx
  quiz/[category].tsx

src/
  components/              UI primitives + ErrorBoundary + icon shim
  constants/               grades, categories, achievements, admin
  data/                    static seeds (literary works, initial test)
  errors/                  AppError + typed subclasses
  hooks/                   useQuestions, useScanner, useLeaderboard, …
  i18n/                    bg/en dictionaries + I18nProvider
  navigation/              ROUTES + custom BottomTabBar
  providers/               AppProviders (compose all contexts)
  screens/                 Auth, Onboarding, Home, Library, Leaderboard,
                           Profile, Scanner, Multiplayer, Quiz
  services/                ai/GeminiService, firebase/{client,auth,firestore},
                           repositories/* (OOP repos)
  store/                   AuthContext, ThemeContext, UserProfileContext
  theme/                   colour palette + spacing tokens
  types/                   shared TS types
  utils/                   cn helper
```

## Run locally

Prerequisites: Node 18+, an iOS simulator / Android emulator, or the Expo Go app.

1. `npm install`
2. Set `EXPO_PUBLIC_GEMINI_API_KEY` in `.env.local`
3. `npm run start` and open in iOS, Android, or web

## Build

- `npm run ios` / `npm run android` / `npm run web`
