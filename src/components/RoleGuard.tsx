import React, { useState, useEffect } from 'react';
import { Storage } from '../lib/storage';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Navigate } from 'react-router-dom';

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
}

/**
 * Helper to decode and parse a JWT payload client-side.
 */
function parseJwt(token: string) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Custom hook to retrieve the current user's role and SuperAdmin status from
 * the Firebase auth token or session storage.
 */
export function useUserRole() {
  const [role, setRole] = useState<string>(() => {
    const authState = Storage.getAuthState();
    if (authState.mockRole) return String(authState.role || '').toLowerCase();
    if (authState.token) {
      const claims = parseJwt(authState.token);
      if (claims?.role) return String(claims.role).toLowerCase();
    }
    return String(authState.role || '').toLowerCase();
  });

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    const authState = Storage.getAuthState();
    if (authState.mockRole) return String(authState.role || '').toLowerCase() === 'director';
    if (authState.token) {
      const claims = parseJwt(authState.token);
      if (claims) {
        return claims.isSuperAdmin === true || String(claims.role).toLowerCase() === 'director';
      }
    }
    return String(authState.role || '').toLowerCase() === 'director';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const authState = Storage.getAuthState();
      if (authState.mockRole) {
        setRole(String(authState.role || '').toLowerCase());
        setIsSuperAdmin(String(authState.role || '').toLowerCase() === 'director');
        return;
      }
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const claims = tokenResult.claims;
          const userRole = String(claims.role || '').toLowerCase();
          const adminClaim = claims.isSuperAdmin === true || userRole === 'director';
          
          setRole(userRole);
          setIsSuperAdmin(adminClaim);
        } catch (err) {
          console.error('[useUserRole] Failed to fetch token claims:', err);
          const authState = Storage.getAuthState();
          setRole(String(authState.role || '').toLowerCase());
          setIsSuperAdmin(String(authState.role || '').toLowerCase() === 'director');
        }
      } else {
        setRole('');
        setIsSuperAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { role, isSuperAdmin };
}

/**
 * RoleGuard Component
 * 
 * Conditionally renders children if the authenticated user has one of the allowed roles,
 * or if the user is a SuperAdmin (isSuperAdmin claim).
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ roles, children }) => {
  const { role, isSuperAdmin } = useUserRole();

  // Normalize allowed roles list
  const allowedRoles = roles.map(r => String(r || '').trim().toLowerCase());

  // Grant access if the user has an allowed role, or is a SuperAdmin override
  if (isSuperAdmin || allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return <Navigate to="/app/unauthorized" replace />;
};

/**
 * Custom hook to check if the authenticated user has the 'Director' role or isSuperAdmin.
 */
export function useRoleGuard(): boolean {
  const { role, isSuperAdmin } = useUserRole();
  return role === 'director' || isSuperAdmin;
}


