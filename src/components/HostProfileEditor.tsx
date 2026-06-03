import React, { useState, useEffect } from 'react';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';
import { HostProfileView } from './HostProfileView';

export const HostProfileEditor = () => {
  const authState = Storage.getAuthState();
  const poppoId = authState.poppo_id || authState.name; // Use poppo_id or name if poppo_id is not set
  
  const [isLoading, setIsLoading] = useState(true);
  const [host, setHost] = useState<Host | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const users = await FirebaseService.getAllRoleMetadata();
      const myProfile = users.find(u => (u.poppo_id === poppoId || u.id === poppoId)) as Host;
      
      if (myProfile) {
        setHost({
          ...myProfile,
          id: myProfile.poppo_id || myProfile.id || poppoId,
          name: myProfile.nickname || myProfile.name || authState.name,
          nickname: myProfile.nickname || myProfile.name || authState.name,
        });
      } else {
        // Fallback profile if metadata is not found
        setHost({
          id: poppoId,
          name: authState.name,
          nickname: authState.nickname || authState.name,
          role: authState.role as any || 'Talent',
          team: 'Unassigned',
          manager: 'Nine Management',
          tier_pay: 'N/A',
          status: 'Active',

          level: authState.level || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Host);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      setErrorMsg("Failed to load your profile data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/45">Loading profile...</p>
      </div>
    );
  }

  if (errorMsg || !host) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-red-400 font-bold">
        {errorMsg || "Profile not found"}
      </div>
    );
  }

  return (
    <div className="w-full">
      <HostProfileView 
        host={host} 
        isReadOnly={true} 
        onProfileUpdated={loadProfile} 
      />
    </div>
  );
};
