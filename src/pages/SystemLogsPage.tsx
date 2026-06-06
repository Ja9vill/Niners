import React from 'react';
import { Storage } from '../lib/storage';
import { SystemLogsViewer } from '../components/SystemLogsViewer';

export const SystemLogsPage = () => {
  const auth = Storage.getAuthState();

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0A0A0F] text-[#F0EFE8] overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#D4AF37]">
            System Logs
          </h1>
          <p className="text-[#A09E9A] text-sm mt-1 tracking-wide">
            View sitewide activity and audit logs.
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <SystemLogsViewer />
      </div>
    </div>
  );
};
