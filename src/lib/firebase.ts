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

// True when the app is rendered inside an <iframe> (e.g. AI Studio preview,
// Cloud Workstations preview). signInWithRedirect cannot navigate the top
// window in that case, so a popup is the only path that reaches Google.
export const isInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

// Codes where a popup attempt should fall back to a full-page redirect.
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
      return 'Sign-in popup was blocked by the browser. Allow popups for this site and try again.';
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
      return 'Google sign-in is not enabled in Firebase. Ask a director to enable it in Firebase Console → Authentication → Sign-in method.';
    case 'auth/unauthorized-domain':
      return `This site (${typeof window !== 'undefined' ? window.location.hostname : 'unknown'}) is not on Firebase Authorized Domains. A director must add it under Firebase Console → Authentication → Settings → Authorized domains.`;
    case 'auth/internal-error':
      return 'Google sign-in could not complete. Usually the app domain is not on Firebase Authorized Domains, or third-party cookies are blocked.';
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
    inIframe: isInIframe(),
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  };
  console.error('[Firebase Auth]', ctx);
};

export type GoogleSignInOutcome =
  | { kind: 'success'; user: any }
  | { kind: 'redirecting' }
  | { kind: 'error'; message: string };

// Attempts Google sign-in using the strategy best suited to the runtime:
//   * Inside an iframe (AI Studio preview, Cloud Workstation preview, etc.)
//     signInWithRedirect cannot navigate the top frame, so we use a popup.
//   * On a normal top-level page we use signInWithRedirect which is more
//     reliable on Cloud Run domains than the popup handler.
// Always returns an outcome — never silently no-ops.
export const signInWithGoogle = async (): Promise<GoogleSignInOutcome> => {
  // Iframe path: popup is required because redirect won't navigate the parent.
  if (isInIframe()) {
    try {
      const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      return { kind: 'success', user: result.user };
    } catch (error: any) {
      const code: string = error?.code || '';
      if (code === 'auth/cancelled-popup-request') {
        // Another popup attempt superseded this one — treat as silent no-op.
        return { kind: 'redirecting' };
      }
      logAuthDiagnostic('popup-in-iframe', error);
      return { kind: 'error', message: friendlyAuthError(error) };
    }
  }

  // Top-level page: redirect is the more reliable Cloud Run path.
  try {
    await signInWithRedirect(auth, googleProvider);
    // signInWithRedirect should navigate away; we never reach here on success.
    return { kind: 'redirecting' };
  } catch (error: any) {
    const code: string = error?.code || '';
    logAuthDiagnostic('redirect', error);

    if (isUnauthorizedDomain(code)) {
      return { kind: 'error', message: friendlyAuthError(error) };
    }

    // Some environments reject redirect; try a popup as a last resort.
    if (POPUP_FALLBACK_CODES.has(code)) {
      try {
        const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        return { kind: 'success', user: result.user };
      } catch (popupErr: any) {
        logAuthDiagnostic('popup-fallback', popupErr);
        return { kind: 'error', message: friendlyAuthError(popupErr) };
      }
    }

    return { kind: 'error', message: friendlyAuthError(error) };
  }
};

// Completes the redirect-based sign-in started by signInWithGoogle. Returns
// the signed-in user if a redirect just completed, null on a normal page load,
// or throws so callers can surface the message instead of swallowing it.
export const completeRedirectSignIn = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error: any) {
    logAuthDiagnostic('redirect-result', error);
    throw new Error(friendlyAuthError(error));
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
