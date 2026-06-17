import { LogOut, Trash2, Key, Moon, CloudOff } from 'lucide-react';

interface SettingsPanelProps {
  onLogout: () => void;
}

export function SettingsPanel({ onLogout }: SettingsPanelProps) {
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">App Settings</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Configuration</h3>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition-colors border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-sm">Firebase Config / API Keys</span>
              </div>
            </button>
            <div className="w-full flex items-center justify-between p-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-sm">Dark Mode</span>
              </div>
              <div className="w-10 h-6 bg-blue-600 rounded-full flex items-center p-1 justify-end">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
            <div className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <CloudOff className="w-5 h-5 text-neutral-400" />
                <div>
                  <span className="font-medium text-sm block text-left">Offline Queue</span>
                  <span className="text-[10px] text-neutral-500">0 pending operations</span>
                </div>
              </div>
              <div className="w-10 h-6 bg-neutral-700 rounded-full flex items-center p-1 justify-start">
                <div className="w-4 h-4 bg-neutral-400 rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Data</h3>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition-colors">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-sm">Clear Local Cache</span>
              </div>
            </button>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl p-4 font-bold transition-colors flex items-center justify-center gap-2 mt-4"
        >
          <LogOut className="w-5 h-5" /> Secure Logout
        </button>
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] text-neutral-600 font-mono">App Version 1.0.0 (Build 42)</p>
        <p className="text-[10px] text-neutral-600 font-mono mt-1">Firebase Admin PWA</p>
      </div>
    </div>
  );
}
