import { initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';
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

// Public reCAPTCHA Enterprise site key bound to the Firebase project
// `gen-lang-client-0222945352` (key id: `ninedashrecapt`). Identity Platform
// requires this when App Check enforcement is enabled on Firebase Auth — every
// createAuthUri / signInWithIdp call must carry a valid App Check token or
// Identity Toolkit returns HTTP 401 with `Firebase App Check token is invalid`.
// Site keys are public values, safe to ship to the browser.
const APP_CHECK_SITE_KEY = '6LfqX-wsAAAAAGeVHsRVuRvGgnT5e_ubHVNZQbvj';

const app = initializeApp(firebaseConfig);

// Initialise App Check *immediately* after initializeApp and *before* any auth
// call. Browser-only — skip on the server build (SSR / esbuild bundle) where
// `window` and `document` are undefined.
let appCheck: AppCheck | null = null;
let appCheckInitError: Error | null = null;
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err: any) {
    // Don't crash the app — record the error so the auth flow can surface a
    // helpful diagnosis instead of a generic auth/internal-error.
    appCheckInitError = err instanceof Error ? err : new Error(String(err));
    console.error('[Firebase App Check] initialization failed', appCheckInitError);
  }
}
export { appCheck };
export const getAppCheckInitError = (): Error | null => appCheckInitError;

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
  const message: string = error?.message || '';
  // App Check enforcement on Identity Platform: Identity Toolkit returns HTTP
  // 401 with detail `Firebase App Check token is invalid`. This is *not* a bad
  // API key — the key is fine, but the request lacks (or carries an invalid)
  // App Check token. Match before the API-key check so we surface the right
  // diagnosis.
  const looksLikeAppCheckRejection =
    /app[- ]?check/i.test(message) ||
    code === 'auth/firebase-app-check-token-is-invalid';
  if (looksLikeAppCheckRejection) {
    return `Firebase App Check token is invalid or missing (HTTP 401 from Identity Toolkit). The request reached Identity Toolkit but App Check enforcement rejected it. App Check must initialize successfully (reCAPTCHA Enterprise site key, browser context) before any auth call. Check: (1) the reCAPTCHA Enterprise site key is correct and registered with App Check for project ${firebaseConfig.projectId}, (2) this domain is on the reCAPTCHA Enterprise key's allow-list, (3) App Check initializeAppCheck() ran without error before signInWithGoogle.`;
  }
  // 401 / "API key not valid" / "invalid API key" surface from Identity Toolkit
  // as auth/internal-error or auth/api-key-not-valid (Firebase v10+). The
  // message text is the reliable signal.
  const looksLikeBadApiKey =
    code === 'auth/api-key-not-valid' ||
    code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' ||
    /api[- ]?key/i.test(message) && /not valid|invalid/i.test(message) ||
    /identitytoolkit/i.test(message) && /401|unauthor/i.test(message);
  if (looksLikeBadApiKey) {
    return `Firebase API key was rejected (HTTP 401 from Identity Toolkit). The deployed key may be invalid, restricted, or for the wrong project (${firebaseConfig.projectId}). A director must verify Firebase Console → Project Settings → Your apps → Web app config, and check Google Cloud Console → APIs & Services → Credentials → API key restrictions allow Identity Toolkit API and the app's referrer.`;
  }
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
      // auth/internal-error is the generic bucket Firebase uses for almost
      // everything that fails at the Identity Toolkit transport layer —
      // including a rejected API key and a blocked domain. Mention both so
      // the user/director can check the right thing.
      return 'Google sign-in could not complete. Common causes: (1) Firebase API key is invalid or restricted (Identity Toolkit returned 401), (2) this domain is not on Firebase Authorized Domains, or (3) third-party cookies are blocked.';
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

// Best-effort pre-flight probe against Identity Toolkit using the configured
// API key. Detects the common "deployed key is invalid / restricted / from
// the wrong project" failure mode that surfaces as a 401 on createAuthUri
// before any OAuth window is opened. Returns null on success; otherwise a
// human-readable diagnosis suitable for the AuthGate banner.
//
// Only the public web-app config (API key + authDomain + projectId) is sent.
// No tokens or secrets are transmitted.
export const validateFirebaseAuthConfig = async (): Promise<string | null> => {
  if (typeof fetch === 'undefined') return null;
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) {
    return `Firebase config is missing apiKey. Check firebase-applet-config.json or the deployment env.`;
  }
  // Surface a clear App Check init failure before we probe Identity Toolkit —
  // a missing/failed App Check setup is the most common cause of a 401 with
  // detail `Firebase App Check token is invalid` even when apiKey is correct.
  if (appCheckInitError) {
    return `Firebase App Check failed to initialize: ${appCheckInitError.message}. App Check must initialize before any Firebase Auth call, or Identity Toolkit will reject requests with HTTP 401 "Firebase App Check token is invalid". Verify the reCAPTCHA Enterprise site key is correct, the site key is registered under App Check for project ${firebaseConfig.projectId}, and the current origin (${typeof window !== 'undefined' ? window.location.origin : 'unknown'}) is on the key's allow-list.`;
  }
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'preflight-check@example.invalid',
        continueUri: typeof window !== 'undefined' ? window.location.origin : 'https://invalid.local',
      }),
    });
    if (res.ok) return null;
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || '';
    } catch {
      /* ignore parse errors */
    }
    if (res.status === 400 && /INVALID_IDENTIFIER|MISSING_CONTINUE_URI|INVALID_EMAIL/i.test(detail)) {
      // 400 here means the API key is accepted — server just rejected our
      // synthetic identifier. That's the success signal for a preflight.
      return null;
    }
    // App Check enforcement: 401 with `Firebase App Check token is invalid`
    // (or any mention of App Check). This is the live failure mode — the
    // committed API key is fine; Identity Toolkit rejects because the
    // unauthenticated preflight has no App Check token.
    if (/app[- ]?check/i.test(detail)) {
      // The Firebase SDK itself attaches an App Check token on real auth
      // calls — a bare fetch() preflight cannot, so this rejection is
      // *expected* and is NOT a blocker for real sign-in. Don't return an
      // error; let the real signInWithGoogle proceed.
      console.info('[Firebase Auth] preflight 401 from App Check enforcement (expected on bare fetch); real auth path attaches a token.');
      return null;
    }
    if (res.status === 401 || res.status === 403 || /API key|API_KEY/i.test(detail)) {
      return `Firebase API key was rejected by Identity Toolkit (HTTP ${res.status}${detail ? `: ${detail}` : ''}). The deployed key may be invalid, restricted to other referrers, or for the wrong project (${firebaseConfig.projectId}). A director must (1) confirm the web app config in Firebase Console → Project Settings → Your apps matches this build, (2) ensure the Identity Toolkit API is enabled, and (3) check Google Cloud Console → APIs & Services → Credentials → API key restrictions allow this app's HTTP referrers.`;
    }
    return `Firebase Identity Toolkit preflight failed (HTTP ${res.status}${detail ? `: ${detail}` : ''}).`;
  } catch (err: any) {
    // Network-level failure — don't block sign-in on this; let the real flow surface the error.
    console.warn('[Firebase Auth] preflight network error', err?.message || err);
    return null;
  }
};
