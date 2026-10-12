import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Frontend Firebase configuration for smart-examination-dac73
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'smart-examination-dac73.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'smart-examination-dac73',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'smart-examination-dac73.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '942734749702',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export function assertFirebaseClientConfiguration(): void {
  const required: Array<[string, string | undefined]> = [
    ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
  ];
  const missing = required.filter(([, value]) => !value?.trim()).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Firebase web app configuration is missing: ${missing.join(', ')}. Add these values to the project .env file and restart the dev server.`);
  }
}

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Connectivity check helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'health', 'ping'));
    return true;
  } catch (err: any) {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is operating offline or uncredentialed.');
    }
    return false;
  }
}
