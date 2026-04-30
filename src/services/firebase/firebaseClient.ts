import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAuth, type Auth } from 'firebase/auth';
// `getReactNativePersistence` is exported by firebase/auth at runtime but
// is intentionally omitted from the public type definitions.
// @ts-expect-error see comment above
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from '../../../firebase-applet-config.json';

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db: Firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
