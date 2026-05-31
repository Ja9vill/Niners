import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export const Overview = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="text-indigo-500" size={24} />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Dashboard Overview</h2>
      </div>
      <div className="p-8 bg-[#11111A] border border-white/5 rounded-2xl text-center">
        <p className="text-slate-400">Welcome to the Nine Streaming Dashboard.</p>
        <p className="text-xs text-slate-500 mt-2">The legacy overview logic has been backed up to NineDashboardV1.tsx.</p>
      </div>
    </div>
  );
};
