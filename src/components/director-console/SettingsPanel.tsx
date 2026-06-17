import React from 'react';
import { LogOut, Trash2, Key, Moon, CloudOff } from 'lucide-react';

export function SettingsPanel() {
  const onLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      window.location.href = '/';
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-[#F5F5F5]">App Settings</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-[#B0B0B0] uppercase tracking-[0.2em]">Configuration</h3>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors border-b border-white/5">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm text-[#F5F5F5]">Firebase Config / API Keys</span>
              </div>
            </button>
            <div className="w-full flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-indigo-500" />
                <span className="font-bold text-sm text-[#F5F5F5]">Dark Mode</span>
              </div>
              <div className="w-10 h-6 bg-indigo-600 rounded-full flex items-center p-1 justify-end">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
            <div className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <CloudOff className="w-5 h-5 text-[#B0B0B0]" />
                <div>
                  <span className="font-bold text-sm block text-left text-[#F5F5F5]">Offline Queue</span>
                  <span className="text-[10px] text-[#B0B0B0] font-mono">0 pending operations</span>
                </div>
              </div>
              <div className="w-10 h-6 bg-black/40 border border-white/10 rounded-full flex items-center p-1 justify-start">
                <div className="w-4 h-4 bg-[#B0B0B0] rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-[#B0B0B0] uppercase tracking-[0.2em]">Data</h3>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-sm text-[#F5F5F5]">Clear Local Cache</span>
              </div>
            </button>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl p-4 font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mt-4"
        >
          <LogOut className="w-5 h-5" /> Secure Logout
        </button>
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] text-[#B0B0B0] font-mono">App Version 1.0.0 (Build 42)</p>
        <p className="text-[10px] text-[#B0B0B0] font-mono mt-1">Firebase Admin PWA</p>
      </div>
    </div>
  );
}
