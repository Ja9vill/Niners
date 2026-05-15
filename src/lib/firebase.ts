import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  signOut,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Codes where a popup attempt should fall back to a full-page redirect.
// `auth/internal-error` is Firebase's catch-all when the popup handler at
// <authDomain>/__/auth/handler can't complete OAuth — typically because the
// current origin isn't an Authorized Domain, third-party cookies are blocked,
// or the popup was closed before the handshake finished. Redirect avoids the
// cross-window cookie path entirely and works reliably on Cloud Run domains
// once they're added to Firebase Auth → Authorized Domains.
const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/internal-error',
]);

const isUnauthorizedDomain = (code: string) => code === 'auth/unauthorized-domain';

export const friendlyAuthError = (error: any): string => {
  const code: string = error?.code || '';
  switch (code) {
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked. Trying full-page redirect instead — please wait.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing. Please try again.';
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact a director for assistance.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password. Email accounts must already exist — contact a director if you need access.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'This sign-in method is not enabled for the NINERS app. Ask a director to enable Google sign-in in Firebase Console → Authentication → Sign-in method.';
    case 'auth/unauthorized-domain':
      return `This site (${typeof window !== 'undefined' ? window.location.hostname : 'unknown'}) is not authorized for Google sign-in. A director must add it under Firebase Console → Authentication → Settings → Authorized domains.`;
    case 'auth/internal-error':
      return 'Google sign-in could not complete. This is usually because the app domain is not on the Firebase Authorized Domains list, or third-party cookies are blocked. Retrying with full-page redirect…';
    default:
      return error?.message || 'Sign-in failed. Please try again.';
  }
};

// Log non-secret diagnostic context so we can debug auth issues from the
// browser console without exposing API keys or tokens.
const logAuthDiagnostic = (stage: string, error: any) => {
  const ctx = {
    stage,
    code: error?.code,
    message: error?.message,
    origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  };
  console.error('[Firebase Auth]', ctx);
};

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  } catch (error: any) {
    const code: string = error?.code || '';
    if (code === 'auth/cancelled-popup-request') return null;
    logAuthDiagnostic('popup', error);

    if (isUnauthorizedDomain(code)) {
      // No point retrying redirect — the domain rejection happens server-side
      // at the auth handler regardless of popup vs. redirect.
      throw new Error(friendlyAuthError(error));
    }

    if (POPUP_FALLBACK_CODES.has(code)) {
      try {
        // signInWithRedirect navigates away; resolution happens via
        // getRedirectResult() on the next page load.
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr: any) {
        logAuthDiagnostic('redirect', redirectErr);
        throw new Error(friendlyAuthError(redirectErr));
      }
    }

    throw new Error(friendlyAuthError(error));
  }
};

// Completes the redirect-based sign-in started by signInWithGoogle when the
// popup path failed. Returns the signed-in user if a redirect just completed,
// or null on a normal page load. Errors are logged but not rethrown so a
// failed redirect doesn't break the rest of app init.
export const completeRedirectSignIn = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error: any) {
    logAuthDiagnostic('redirect-result', error);
    return null;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    logAuthDiagnostic('email', error);
    throw new Error(friendlyAuthError(error));
  }
};

export const signOutFirebase = () => signOut(auth);
