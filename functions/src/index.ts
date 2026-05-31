import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK
initializeApp();

// Strongly typed input request format
interface AuthenticatePoppoRequest {
  poppoId: string;
  password: string;
}

// Strongly typed output response format
interface AuthenticatePoppoResponse {
  customToken: string;
}

/**
 * Mock database verification helper.
 * Replace this with a secure database lookup (e.g. Firestore query) 
 * and compare passwords using bcrypt or scrypt.
 */
async function verifyPoppoCredentials(poppoId: string, password: string): Promise<boolean> {
  // In production: fetch user from Firestore and verify hashed password
  if (poppoId === "test-host" && password === "secure-password") {
    return true;
  }
  return false;
}

/**
 * 2nd-Gen HTTPS Callable Cloud Function for custom Poppo ID authentication.
 */
export const authenticatePoppoUser = onCall(
  async (request: CallableRequest<AuthenticatePoppoRequest>): Promise<AuthenticatePoppoResponse> => {
    const { data } = request;

    // 1. Input validation & type checks
    if (!data || typeof data.poppoId !== "string" || typeof data.password !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "The function must be called with valid 'poppoId' and 'password' strings."
      );
    }

    const poppoId = data.poppoId.trim();
    const password = data.password.trim();

    if (poppoId.length === 0 || password.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Poppo ID and password cannot be empty values."
      );
    }

    // 2. Validate credentials against target authentication store
    let isCredentialValid = false;
    try {
      isCredentialValid = await verifyPoppoCredentials(poppoId, password);
    } catch (dbError: any) {
      console.error("Database lookup error during credential validation:", dbError.message || dbError);
      throw new HttpsError(
        "internal",
        "An internal database lookup error occurred. Please try again later."
      );
    }

    if (!isCredentialValid) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication failed. Invalid Poppo ID or password."
      );
    }

    // 3. Mint custom Firebase Auth Token
    try {
      const auth = getAuth();
      const customToken = await auth.createCustomToken(poppoId);
      
      return { customToken };
    } catch (tokenError: any) {
      // Log full stack trace internally, hide internal SDK details from client
      console.error(`Failed to generate custom token for UID ${poppoId}:`, tokenError.message || tokenError);
      throw new HttpsError(
        "internal",
        "Failed to generate session token. Please contact site administrators."
      );
    }
  }
);
