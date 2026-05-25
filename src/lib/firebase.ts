/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const databaseId = (firebaseConfigJson as any).firestoreDatabaseId;

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Caching store for Google Sheets Access Token with localStorage persistence
let cachedSheetsAccessToken: string | null = null;
try {
  cachedSheetsAccessToken = localStorage.getItem('nine_sheets_access_token');
} catch (e) {
  console.warn('localStorage is not accessible:', e);
}

export const setCachedSheetsToken = (token: string | null) => {
  cachedSheetsAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('nine_sheets_access_token', token);
    } else {
      localStorage.removeItem('nine_sheets_access_token');
    }
  } catch (e) {
    console.warn('Failed to interact with localStorage:', e);
  }
};

export const getCachedSheetsToken = () => {
  return cachedSheetsAccessToken;
};

export const signInWithGoogle = async () => {
  try {
    console.log('Firebase Auth Trigger Context:', {
      origin: window.location.origin,
      host: window.location.host,
      hostname: window.location.hostname,
      firebaseConfigAuthDomain: firebaseConfig.authDomain,
      userAgent: navigator.userAgent,
      isInIframe: window.self !== window.top
    });
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedSheetsToken(credential.accessToken);
    }
    return result;
  } catch (error: any) {
    console.error('Firebase Auth Error details:', {
      code: error.code,
      message: error.message,
      origin: window.location.origin,
      host: window.location.host,
      hostname: window.location.hostname,
      fullError: error
    });
    throw error;
  }
};

export default app;