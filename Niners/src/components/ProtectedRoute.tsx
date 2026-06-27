import React from 'react';

interface ProtectedRouteProps {
  appAuthState: 'LOADING' | 'AUTHENTICATED' | 'FORCE_PASSWORD_CHANGE' | 'UNAUTHENTICATED';
  activeTab: string;
  setActiveTab: (tab: any) => void;
  children: React.ReactNode;
}

/**
 * ProtectedRoute Navigation Guard
 * 
 * Intercepts routing based on appAuthState:
 * - If FORCE_PASSWORD_CHANGE, forces redirection to the update-password page
 *   and blocks child rendering.
 * - If AUTHENTICATED, permits normal rendering of child dashboard routes.
 * - If UNAUTHENTICATED, redirects user to the main/login view.
 * 
 * Crucially, the update-password page itself is excluded from this guard logic
 * to prevent infinite redirect loops.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  appAuthState,
  activeTab,
  setActiveTab,
  children,
}) => {
  // 1. Loading state validation
  if (appAuthState === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-transparent min-h-[50vh]">
        <div className="w-12 h-12 border-2 rounded-full animate-spin app-loader-spinner" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5A5865] mt-4">Validating Secure Session</p>
      </div>
    );
  }

  // 2. Force password change redirection
  // Excluded check: if activeTab is already 'update-password', bypass redirect to prevent infinite loops
  if (appAuthState === 'FORCE_PASSWORD_CHANGE') {
    if (activeTab !== 'update-password') {
      // Defer state update to next tick to avoid React render lifecycle warning
      setTimeout(() => setActiveTab('update-password'), 0);
      return null;
    }
  }

  // 3. Unauthenticated session redirection
  if (appAuthState === 'UNAUTHENTICATED') {
    if (activeTab !== 'home' && activeTab !== 'update-password') {
      setTimeout(() => setActiveTab('home'), 0);
      return null;
    }
  }

  // 4. Authenticated rendering
  return <>{children}</>;
};
