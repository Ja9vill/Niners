import React, { useState, useEffect } from 'react';
import { CreateMemberForm } from '../components/CreateMemberForm';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';

export const ProvisionUser = () => {
  const [hosts, setHosts] = useState<Host[]>([]);

  useEffect(() => {
    FirebaseService.getAllRoleMetadata().then(setHosts);
  }, []);

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0A0A0F] text-[#F0EFE8] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#D4AF37]">
            Provision User
          </h1>
          <p className="text-[#A09E9A] text-sm mt-1 tracking-wide">
            Add new users to the system manually.
          </p>
        </div>
      </div>
      
      <div className="max-w-2xl">
        <CreateMemberForm existingHosts={hosts} />
      </div>
    </div>
  );
};
