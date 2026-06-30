import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "./auth";

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export async function verifyIdToken(idToken: string) {
  return getAdminAuth().verifyIdToken(idToken);
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split("Bearer ")[1];
}
