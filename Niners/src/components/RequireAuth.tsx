import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Storage } from '../lib/storage';

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const authState = Storage.getAuthState();
  const location = useLocation();

  if (!authState.token && authState.level === 0) {
    // Redirect to login but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
