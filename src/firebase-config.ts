/**
 * Firebase Configuration
 * 
 * Initializes Firebase services:
 * - Core Firebase App
 * - Authentication
 * - Analytics (if supported)
 * 
 * Configuration is loaded from environment variables
 * for security and deployment flexibility.
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

try {
  const analyticsInit = async () => {
    const isAnalyticsSupported = await isSupported();
    if (isAnalyticsSupported) {
      return getAnalytics(app);
    }
    return null;
  };
  analyticsInit();
} catch (error) {}

const auth = getAuth(app);

export { app, auth };