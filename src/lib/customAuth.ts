import { signInWithCustomToken, signOut, updatePassword, User, UserCredential } from "firebase/auth";
import { auth } from "./firebase";
import { Storage } from "./storage";

export interface AuthSuccessState {
  status: 'SUCCESS';
  user: User;
}

export interface AuthMigrationRequiredState {
  status: 'MIGRATION_REQUIRED';
  user: User;
}

export type AuthServiceResponse = AuthSuccessState | AuthMigrationRequiredState;

interface BackendLoginResponse {
  success: boolean;
  customToken: string;
  poppoId: string;
  user?: any;
}

/**
 * Utility helper to execute a fetch request with a strict client-side timeout limit.
 * Utilizes AbortController to abort requests that exceed the specified timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Connection timed out. The server did not respond within ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export class PoppoAuthService {
  private auth = auth;
  private backendUrl = '/api/auth/login-with-poppo';

  /**
   * Phase 1: Checks if a Poppo ID exists and whether it is a first-time account.
   * Returns { exists, is_first_login } — no auth token needed.
   */
  public async checkUsername(poppoId: string): Promise<{ exists: boolean; is_first_login: boolean; blocked?: boolean }> {
    const response = await fetchWithTimeout('/api/auth/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poppoId }),
    });
    
    const text = await response.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Not JSON
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `Server error (${response.status}): ${text || 'Empty response'}`);
    }
    return data;
  }

  /**
   * Phase 2a: Sets a first-time user's password and automatically logs them in.
   * Calls /api/auth/set-initial-password, then signs into Firebase with the returned custom token.
   */
  public async setInitialPassword(
    poppoId: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<AuthServiceResponse> {
    const response = await fetchWithTimeout('/api/auth/set-initial-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poppoId, newPassword, confirmPassword }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Identity registration failed.');
    }

    // Sign into Firebase with the returned custom token
    let userCredential;
    try {
      userCredential = await signInWithCustomToken(this.auth, data.customToken);
    } catch (fbError: any) {
      throw this.translateFirebaseError(fbError);
    }

    const user = userCredential.user;

    if (data.user) {
      const u = data.user;
      Storage.setAuthState({
        level: u.level,
        role: u.role,
        name: u.nickname || 'Member',
        poppo_id: u.poppo_id,
        nickname: u.nickname,
        status: u.status,
        manager_assigned: u.manager_assigned,
        anchor_team: u.anchor_team,
        profile_photo: u.profile_photo,
        token: u.token,
      });
    }

    return { status: 'SUCCESS', user };
  }

  /**
   * Orchestrates the complete authentication flow.
   * Fetches custom token, authenticates with Firebase, evaluates password migration state, and handles failures.
   */
  public async authenticateWithPoppo(poppoId: string, tempPassword: string): Promise<AuthServiceResponse> {
    try {
      // 1. Fetch custom token from backend with a built-in retry mechanism
      const loginData = await this.fetchCustomTokenWithRetry(poppoId, tempPassword);

      // 2. Perform Firebase Auth Sign-in
      let userCredential: UserCredential;
      try {
        userCredential = await signInWithCustomToken(this.auth, loginData.customToken);
      } catch (fbError: any) {
        throw this.translateFirebaseError(fbError);
      }

      const user = userCredential.user;

      // Update local storage session state
      if (loginData.user) {
        const u = loginData.user;
        const newState = {
          level: u.level,
          role: u.role,
          name: u.nickname || 'Member',
          poppo_id: u.poppo_id,
          nickname: u.nickname,
          status: u.status,
          manager_assigned: u.manager_assigned,
          anchor_team: u.anchor_team,
          profile_photo: u.profile_photo,
          token: u.token,
        };
        Storage.setAuthState(newState);
      }

      // 3. Inspect migration status (if temporary password must be replaced)
      const requiresMigration = await this.checkMigrationStatus(user);
      if (requiresMigration) {
        return {
          status: 'MIGRATION_REQUIRED',
          user,
        };
      }

      return {
        status: 'SUCCESS',
        user,
      };

    } catch (error: any) {
      // 4. Clean up all local states on failure to avoid data leaks
      await this.wipeLocalAuthState();
      throw error;
    }
  }

  /**
   * Finalizes the legacy-to-permanent password migration.
   * Upgrades the user's password locally in Firebase and synchronizes the migration status to the backend.
   */
  public async finalizePasswordMigration(newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = this.auth.currentUser;
    
    if (!user) {
      throw new Error('No active authentication session found. Please sign in again.');
    }

    // Password strength validation
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (newPassword.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long.`);
    }
    if (!hasUppercase) {
      throw new Error('Password must contain at least one uppercase letter.');
    }
    if (!hasNumber) {
      throw new Error('Password must contain at least one number.');
    }

    try {
      // Upgrade password on the Firebase Authentication servers
      try {
        await updatePassword(user, newPassword);
      } catch (firebaseError: any) {
        const code = firebaseError?.code || '';
        console.error('[PoppoAuthService] Firebase updatePassword failed:', firebaseError);

        if (code === 'auth/weak-password') {
          throw new Error('The chosen password is too weak. Please include symbols or more complex characters.');
        }
        if (code === 'auth/requires-recent-login') {
          throw new Error(
            'Security Action Required: Changing your password requires a recent login. ' +
            'Please log out, sign back in with your credentials, and try again immediately.'
          );
        }
        throw new Error(firebaseError.message || 'Failed to update password in Firebase Auth.');
      }

      // Retrieve fresh ID token
      const idToken = await user.getIdToken(true);

      // Sync state with backend — send new password so it gets hashed & saved to Firestore
      try {
        const response = await fetchWithTimeout('/api/auth/mark-migration-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ newPassword }),
        });

        const text = await response.text();
        let data: any = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            // Not JSON
          }
        }

        if (!response.ok) {
          const errMsg = data?.error || `Server error (${response.status}): ${text || 'Empty response'}`;
          console.warn('[PoppoAuthService] Backend sync failed (non-fatal):', errMsg);
          // Password is already upgraded in Firebase Auth — don't block the user
          return {
            success: true,
            message: 'Warning: Password upgraded, but backend sync failed. Contact admin if login issues persist.',
          };
        }

        return {
          success: true,
          message: 'Account migration complete. Your account is now fully secured.',
        };
      } catch (syncError: any) {
        console.warn('[PoppoAuthService] Backend sync request failed (non-fatal):', syncError.message || syncError);
        // Password is already upgraded in Firebase Auth — don't block the user
        return {
          success: true,
          message: 'Warning: Password upgraded, but backend sync failed. Contact admin if login issues persist.',
        };
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Helper utility to perform exponential-backoff retries for backend fetch calls.
   */
  private async fetchCustomTokenWithRetry(
    poppoId: string, 
    tempPassword: string, 
    retries = 3, 
    delayMs = 1000
  ): Promise<BackendLoginResponse> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(this.backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poppoId, tempPassword }),
        });

        const text = await response.text();
        let data: any = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            // Not JSON
          }
        }

        if (response.ok) {
          return data as BackendLoginResponse;
        }

        if (response.status === 400) {
          throw new Error(data?.error || 'Invalid input format.');
        }
        if (response.status === 401) {
          throw new Error(data?.error || 'Invalid ID or password.');
        }
        if (response.status === 429) {
          throw new Error(data?.error || 'Too many login attempts. Please try again in 15 minutes.');
        }

        throw new Error(data?.error || `Server returned code: ${response.status} - ${text || 'Empty response'}`);
      } catch (err: any) {
        if (err.message.includes('Invalid') || err.message.includes('Too many') || err.message.includes('format') || err.message.includes('Server returned code')) {
          throw err;
        }

        if (attempt < retries) {
          console.warn(`[PoppoAuthService] Fetch attempt ${attempt} failed. Retrying in ${delayMs}ms...`);
          await new Promise((res) => setTimeout(res, delayMs));
          delayMs *= 1.5;
        } else {
          throw new Error('Network connection failed. Please check your internet connection.');
        }
      }
    }
    throw new Error('Failed to connect to the login service.');
  }

  /**
   * Decodes custom Claims inside the Firebase ID Token to determine if password migration is forced.
   */
  private async checkMigrationStatus(user: User): Promise<boolean> {
    try {
      const tokenResult = await user.getIdTokenResult(true);
      // Only require migration when the backend explicitly set tempPasswordRequired = true
      return tokenResult.claims.tempPasswordRequired === true;
    } catch (err) {
      // If token refresh fails, do NOT block login — just skip migration check
      console.warn('[PoppoAuthService] checkMigrationStatus token refresh failed (non-fatal):', err);
      return false;
    }
  }

  /**
   * Maps Firebase SDK internal errors to human-readable strings.
   */
  private translateFirebaseError(error: any): Error {
    const code = error?.code || '';
    const message = error?.message || 'Unknown error';
    console.error('[PoppoAuthService] Firebase Sign-in failed. Code:', code, 'Message:', message, error);
    
    const debugMessage = `[Firebase Client Error] Code: ${code} | Message: ${message}`;
    console.warn(debugMessage);

    switch (code) {
      case 'auth/invalid-custom-token':
        return new Error(`The secure login session could not be established. (${debugMessage})`);
      case 'auth/custom-token-mismatch':
        return new Error(`Session identification mismatch. (${debugMessage})`);
      case 'auth/network-request-failed':
        return new Error(`Unable to connect to Google Firebase authentication servers. (${debugMessage})`);
      default:
        return new Error(debugMessage);
    }
  }

  /**
   * Wipes client-side caches and signs out from Firebase to maintain zero local trace of failed authentication.
   */
  public async wipeLocalAuthState(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (signOutError) {
      console.error('[PoppoAuthService] Error executing security signout wipe:', signOutError);
    } finally {
      Storage.clearAuthState();
      localStorage.removeItem('poppo_auth_token');
      sessionStorage.removeItem('poppo_user_session');
    }
  }
}

// Keep legacy export for compatibility with anything importing it
export async function signInWithPoppoIdAndPassword(
  poppoId: string,
  password: string
): Promise<UserCredential> {
  const service = new PoppoAuthService();
  const res = await service.authenticateWithPoppo(poppoId, password);
  return { user: res.user, providerId: null, operationType: "signIn" } as any;
}
