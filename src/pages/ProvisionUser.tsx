import React from 'react';
import { UserPlus } from 'lucide-react';

export const ProvisionUser = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <UserPlus className="text-[#D4AF37]" size={24} />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Provision User</h2>
      </div>
      <div className="bg-[#1A1A28] border border-[#D4AF37]/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
        <p className="text-[#A09E9A] text-sm italic">User provision capabilities coming soon.</p>
      </div>
    </div>
  );
};
