import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with the provisioned named database ID
export const db = getFirestore(app, firebaseConfigData.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Firestore error handler helper with context
export function handleFirestoreError(error: unknown, operation: string): string {
  console.error(`Firestore Error [${operation}]:`, error);
  if (error instanceof Error) {
    return error.message;
  }
  return `An unexpected error occurred during ${operation}`;
}

export default app;
