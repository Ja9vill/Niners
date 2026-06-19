import React, { useEffect, useState } from 'react';
import { Storage } from '../lib/storage';
import { DashboardLayout } from './DashboardLayout';
import { PublicLayout } from './PublicLayout';

export const SmartRoute = ({ 
  publicElement, 
  privateElement 
}: { 
  publicElement: React.ReactNode; 
  privateElement: React.ReactNode; 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authState = Storage.getAuthState();
    setIsAuthenticated(authState.level > 0 && !!authState.token);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-transparent">
        <div className="w-8 h-8 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? (
    <DashboardLayout>{privateElement}</DashboardLayout>
  ) : (
    <PublicLayout>{publicElement}</PublicLayout>
  );
};
