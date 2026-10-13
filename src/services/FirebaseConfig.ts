import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  initializeAuth,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

/**
 * Firebase Client Configuration for project: couplesify-9805b
 * 
 * You can provide your Firebase Web API key below or update it anytime!
 */
export const FIREBASE_CLIENT_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCOxHP1EBuIW0D-nEk1WKgmVcM8zwowc2I',
  authDomain: 'couplesify-9805b.firebaseapp.com',
  projectId: 'couplesify-9805b',
  storageBucket: 'couplesify-9805b.firebasestorage.app',
  messagingSenderId: '569443926944',
  appId: '1:569443926944:web:9f41ea7f5b1db1a6d55ac5',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isInitialized = false;

try {
  if (getApps().length === 0) {
    app = initializeApp(FIREBASE_CLIENT_CONFIG);
  } else {
    app = getApp();
  }

  // Initialize Auth with persistence appropriate for web/native
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
      });
    } catch {
      auth = getAuth(app);
    }
  }

  db = getFirestore(app);
  isInitialized = true;
} catch (error) {
  console.warn('Firebase initialization deferred / fallback mode:', error);
  isInitialized = false;
}

export { app, auth, db, isInitialized };
export default {
  app,
  auth,
  db,
  isInitialized,
  projectId: FIREBASE_CLIENT_CONFIG.projectId,
};
