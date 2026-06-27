import React from 'react';
import { useParams } from 'react-router-dom';

export const UserPublicProfile = () => {
  const { poppoId } = useParams<{ poppoId: string }>();
  return (
    <div className="min-h-screen bg-[#0A0604] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#FFD700] uppercase tracking-widest">
          User Profile
        </h1>
        <p className="text-[#A09E9A] mt-2">Poppo ID: {poppoId}</p>
      </div>
    </div>
  );
};
