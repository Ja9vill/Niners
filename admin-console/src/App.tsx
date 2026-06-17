import { useState } from 'react';
import { Database, Users, Activity, HardDrive, Settings, Bell, ChevronRight, Search, ShieldAlert } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { FirestoreManager } from './components/FirestoreManager';
import { AuthManager } from './components/AuthManager';
import { FunctionsMonitor } from './components/FunctionsMonitor';
import { StorageManager } from './components/StorageManager';
import { AlertsDashboard } from './components/AlertsDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { LoginScreen } from './components/LoginScreen';

type Tab = 'firestore' | 'auth' | 'functions' | 'storage' | 'alerts' | 'settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('firestore');

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'firestore': return <FirestoreManager />;
      case 'auth': return <AuthManager />;
      case 'functions': return <FunctionsMonitor />;
      case 'storage': return <StorageManager />;
      case 'alerts': return <AlertsDashboard />;
      case 'settings': return <SettingsPanel onLogout={() => setIsAuthenticated(false)} />;
      default: return <FirestoreManager />;
    }
  };

  const navItems: { id: Tab; label: string; icon: any }[] = [
    { id: 'firestore', label: 'Data', icon: Database },
    { id: 'auth', label: 'Auth', icon: Users },
    { id: 'functions', label: 'Compute', icon: Activity },
    { id: 'storage', label: 'Files', icon: HardDrive },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-neutral-900/50 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-blue-500 w-5 h-5" />
          <span className="font-bold tracking-wide text-sm">DIRECTOR CONSOLE</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-neutral-400 font-mono uppercase">Live</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-neutral-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="h-16 shrink-0 border-t border-white/10 bg-neutral-900 flex justify-around items-center px-2 safe-pb">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-blue-500" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
