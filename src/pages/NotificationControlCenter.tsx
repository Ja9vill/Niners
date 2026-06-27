import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Shield, 
  ShieldAlert, 
  Cpu, 
  RefreshCw, 
  Radio, 
  CheckCircle, 
  Wifi, 
  MessageSquare, 
  Search, 
  Send, 
  Check, 
  AlertTriangle, 
  Users, 
  Settings, 
  Smartphone, 
  Clock, 
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Storage } from '../lib/storage';
import { getRoleBadgeStyle, ROLE_BADGE_BASE_CLASS } from '../lib/roleBadge';

interface NotificationRule {
  id: string;
  label: string;
  description: string;
  targets: string[];
  when: 'immediately' | 'daily' | 'weekly';
  active: boolean;
}

interface UserLedgerEntry {
  poppoId: string;
  nickname: string;
  role: string;
  hasWebPush: boolean;
  hasFcm: boolean;
  hasAllowed: boolean;
  notificationRequestedByDirector: boolean;
}

export const NotificationControlCenter = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'users'>('rules');
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [users, setUsers] = useState<UserLedgerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Web Push Status States
  const [swStatus, setSwStatus] = useState<'unsupported' | 'unregistered' | 'registered'>('unregistered');
  const [pushStatus, setPushStatus] = useState<'unsubscribed' | 'subscribed' | 'blocked' | 'loading'>('loading');
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  
  // Loading States
  const [isRulesLoading, setIsRulesLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [requestingUserId, setRequestingUserId] = useState<string | null>(null);
  
  const authState = Storage.getAuthState();
  const token = authState.token || '';

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  });

  const addLog = (msg: string) => {
    setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Helper function to decode VAPID public key
  const urlB64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Check registration and subscription status of current browser
  const checkBrowserStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSwStatus('unsupported');
      setPushStatus('unsubscribed');
      addLog('Web Push is not supported in this browser.');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        setSwStatus('registered');
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setPushStatus('subscribed');
          addLog('Service worker and Push Subscription found.');
        } else {
          setPushStatus('unsubscribed');
          addLog('Service worker registered, but not subscribed to push.');
        }
      } else {
        setSwStatus('unregistered');
        setPushStatus('unsubscribed');
        addLog('Service worker not registered.');
      }
    } catch (err: any) {
      console.error('Error checking sw/push status:', err);
      addLog(`Status check failed: ${err.message}`);
    }
  };

  // Fetch all notification rules
  const fetchRules = async () => {
    setIsRulesLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      addLog('Failed to fetch notification types.');
    } finally {
      setIsRulesLoading(false);
    }
  };

  // Fetch all users with device registration status
  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetch('/api/notifications/users', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      addLog('Failed to fetch users ledger.');
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    checkBrowserStatus();
    fetchRules();
    fetchUsers();

    // Listen to real-time notification messages sent from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        setLastNotification(event.data.payload);
        addLog(`Push received: "${event.data.payload.title}"`);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Also check localstorage if last notification is saved
    try {
      const cached = localStorage.getItem('last_received_push');
      if (cached) setLastNotification(JSON.parse(cached));
    } catch (e) {}

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Register current browser to VAPID push
  const subscribePush = async () => {
    setPushStatus('loading');
    addLog('Requesting notification permission...');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('blocked');
        addLog('Notification permission denied.');
        return;
      }

      addLog('Registering service worker (sw.js)...');
      const reg = await navigator.serviceWorker.register('/sw.js');
      setSwStatus('registered');

      addLog('Fetching VAPID Public Key...');
      const keyRes = await fetch('/api/push/public-key');
      if (!keyRes.ok) throw new Error('Failed to fetch VAPID public key');
      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        throw new Error('VAPID public key empty or not set on backend');
      }

      addLog('Creating Push Subscription...');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey)
      });

      addLog('Sending subscription to backend...');
      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          poppo_id: authState.poppo_id || null
        })
      });

      if (subRes.ok) {
        setPushStatus('subscribed');
        addLog('Web Push Subscription completed and synced successfully!');
        // Refresh users list since current user's registration status might have changed
        fetchUsers();
      } else {
        throw new Error('Backend rejected push subscription');
      }
    } catch (err: any) {
      console.error('Push registration error:', err);
      setPushStatus('unsubscribed');
      addLog(`Registration failed: ${err.message}`);
    }
  };

  const reRegisterPush = async () => {
    addLog('Re-registering push subscription...');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          addLog('Unsubscribing existing registration...');
          await sub.unsubscribe();
        }
      }
      await subscribePush();
    } catch (err: any) {
      console.error('Error during re-registration:', err);
      addLog(`Re-registration failed: ${err.message}`);
    }
  };

  // Update notification rule properties
  const updateRule = async (updatedRule: NotificationRule) => {
    setSavingRuleId(updatedRule.id);
    try {
      const res = await fetch('/api/notifications/update-rule', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          id: updatedRule.id,
          active: updatedRule.active,
          targets: updatedRule.targets,
          when: updatedRule.when
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRules(prev => prev.map(r => r.id === updatedRule.id ? data.item : r));
        addLog(`Updated configuration for trigger: ${updatedRule.label}`);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update rule');
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Failed to update rule ${updatedRule.id}: ${err.message}`);
    } finally {
      setSavingRuleId(null);
    }
  };

  // Toggle active state of a rule
  const handleToggleActive = (rule: NotificationRule) => {
    const next = { ...rule, active: !rule.active };
    setRules(prev => prev.map(r => r.id === rule.id ? next : r));
    updateRule(next);
  };

  // Toggle target role on a rule
  const handleToggleTarget = (rule: NotificationRule, role: string) => {
    const nextTargets = rule.targets.includes(role)
      ? rule.targets.filter(t => t !== role)
      : [...rule.targets, role];
    const next = { ...rule, targets: nextTargets };
    setRules(prev => prev.map(r => r.id === rule.id ? next : r));
    updateRule(next);
  };

  // Handle dropdown changes for when to send
  const handleWhenChange = (rule: NotificationRule, when: 'immediately' | 'daily' | 'weekly') => {
    const next = { ...rule, when };
    setRules(prev => prev.map(r => r.id === rule.id ? next : r));
    updateRule(next);
  };

  // Send a test notification
  const handleSendTest = async (type: string, label: string) => {
    addLog(`Sending test push for: ${label}...`);
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'NINE Test Notification',
          body: `Test broadcast for rule: ${label}. This alerts verified endpoints.`,
          url: '/notifications-control',
          type: type
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        addLog(`Test push successfully broadcasted!`);
      } else if (data.status === 'ignored') {
        addLog(`Ignored: ${data.message} (Is it active?)`);
      } else {
        addLog(`Push failed: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Test send failed: ${err.message}`);
    }
  };

  // Request a user to register their device
  const handleSendDeviceRequest = async (userPoppoId: string, nickname: string) => {
    setRequestingUserId(userPoppoId);
    addLog(`Sending device registration request to ${nickname}...`);
    try {
      const res = await fetch('/api/notifications/request-device', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetPoppoId: userPoppoId })
      });
      
      if (res.ok) {
        setUsers(prev => prev.map(u => u.poppoId === userPoppoId ? { ...u, notificationRequestedByDirector: true } : u));
        addLog(`Requested device enrollment for user ${nickname} (${userPoppoId})`);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Request rejected by server');
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Request failed: ${err.message}`);
    } finally {
      setRequestingUserId(null);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return u.poppoId.includes(query) || u.nickname.toLowerCase().includes(query);
  });

  // Roles to display in trigger setup
  const SYSTEM_ROLES = ['director', 'admin', 'manager', 'agent', 'host'];

  return (
    <div className="space-y-6 pb-20 text-left text-[#F0EFE8] max-w-6xl mx-auto select-none">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <h1 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
            <Bell className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] animate-pulse" size={16} />
            Notification Control Center
          </h1>
          <p className="text-[10px] text-[#A09E9A] uppercase tracking-wider font-semibold">
            Administrative triggers panel & device registration manager
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#0D0D14] border border-white/10 rounded-xl p-1 gap-1 self-start">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[#D4AF37] text-[#0D0D14]'
                : 'text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/5'
            }`}
          >
            <Settings size={12} />
            Rules Config
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#D4AF37] text-[#0D0D14]'
                : 'text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/5'
            }`}
          >
            <Users size={12} />
            Device Ledger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active configs based on tab selection */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <motion.div
                key="rules-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)] animate-pulse"></span>
                  <h3 className="font-black text-xs uppercase tracking-widest text-[#D4AF37]">Feature Notification Triggers</h3>
                </div>

                {isRulesLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 border border-white/5 rounded-2xl bg-[#13131E]/40">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
                    <span className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider">Synchronizing Rules...</span>
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-12 text-[#A09E9A]/30 italic text-xs border border-white/5 rounded-2xl bg-[#13131E]/40">
                    No notification rules loaded.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rules.map(rule => (
                      <div
                        key={rule.id}
                        className={`p-5 rounded-2xl border transition-all duration-300 ${
                          rule.active 
                            ? 'bg-gradient-to-br from-[#D4AF37]/5 via-[#13131E] to-[#13131E] border-[#D4AF37]/30 shadow-md shadow-[#D4AF37]/2'
                            : 'bg-[#13131E]/40 border-white/5 opacity-70'
                        }`}
                      >
                        {/* Header: Rule Title + Active Switch */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-[#F0EFE8] flex items-center gap-2">
                              {rule.label}
                              {savingRuleId === rule.id && (
                                <RefreshCw className="w-3 h-3 animate-spin text-[#D4AF37]" />
                              )}
                            </h4>
                            <p className="text-[11px] text-[#A09E9A] leading-relaxed">{rule.description}</p>
                          </div>
                          
                          <button
                            onClick={() => handleToggleActive(rule)}
                            className={`px-3 py-1 border text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors cursor-pointer shrink-0 ${
                              rule.active 
                                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/35' 
                                : 'bg-white/5 border-white/10 text-[#A09E9A] hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {rule.active ? 'Active' : 'Inactive'}
                          </button>
                        </div>

                        {rule.active && (
                          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Notify Targets Block */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A] block">Who Should Be Notified?</label>
                              <div className="flex flex-wrap gap-1.5">
                                {SYSTEM_ROLES.map(role => {
                                  const isSelected = rule.targets.includes(role);
                                  return (
                                    <button
                                      key={role}
                                      onClick={() => handleToggleTarget(rule, role)}
                                      className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-white/10 border-[#D4AF37]/50 text-[#D4AF37]'
                                          : 'bg-black/20 border-white/5 text-[#A09E9A] hover:border-white/10'
                                      }`}
                                    >
                                      {role}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Notify Frequency Block */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A] block">When Should It Be Sent?</label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <select
                                    title="Frequency selector"
                                    value={rule.when}
                                    onChange={(e) => handleWhenChange(rule, e.target.value as any)}
                                    className="w-full appearance-none bg-black/30 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-[#F0EFE8] outline-none cursor-pointer"
                                  >
                                    <option value="immediately" className="bg-[#1A1A28]">Immediately upon event</option>
                                    <option value="daily" className="bg-[#1A1A28]">Daily Summary (10:00 AM)</option>
                                    <option value="weekly" className="bg-[#1A1A28]">Weekly digest</option>
                                  </select>
                                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A09E9A]">
                                    <Clock size={12} />
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => handleSendTest(rule.id, rule.label)}
                                  className="px-3 py-2 bg-white/5 border border-white/10 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 text-white/70 hover:text-[#D4AF37] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Send size={10} />
                                  Test
                                </button>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <motion.div
                key="users-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 animate-fade-in"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)] animate-pulse"></span>
                    <h3 className="font-black text-xs uppercase tracking-widest text-[#D4AF37]">User Device Ledger</h3>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A09E9A]">
                      <Search size={12} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search Poppo ID or Nickname..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0D0D14] border border-white/10 focus:border-[#D4AF37]/40 rounded-xl pl-8 pr-4 py-1.5 text-xs text-white outline-none transition-colors"
                    />
                  </div>
                </div>

                {isUsersLoading && users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 border border-white/5 rounded-2xl bg-[#13131E]/40">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
                    <span className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider">Loading Device Catalog...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-[#A09E9A]/30 italic text-xs border border-white/5 rounded-2xl bg-[#13131E]/40">
                    No users matching the query found.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#13131E]/40 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase tracking-[0.2em]">
                          <th className="px-4 py-3">Nickname</th>
                          <th className="px-4 py-3">Poppo ID</th>
                          <th className="px-4 py-3">System Role</th>
                          <th className="px-4 py-3">Platforms</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs font-semibold">
                        {filteredUsers.map(user => (
                          <tr key={user.poppoId} className="hover:bg-white/[0.01] transition-colors border-b border-white/5 last:border-0">
                            <td className="px-4 py-3.5 text-[#F0EFE8] font-bold">
                              {user.nickname}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[#D4AF37] font-black text-sm">
                              {user.poppoId}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`${ROLE_BADGE_BASE_CLASS} ${getRoleBadgeStyle(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex gap-2">
                                <span className={`flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                  user.hasWebPush 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-black/20 text-[#A09E9A]/40 border-white/5'
                                }`}>
                                  Web Push
                                </span>
                                <span className={`flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                  user.hasFcm 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-black/20 text-[#A09E9A]/40 border-white/5'
                                }`}>
                                  FCM (App)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {user.hasAllowed ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                  <UserCheck size={10} />
                                  Allowed
                                </span>
                              ) : user.notificationRequestedByDirector ? (
                                <span className="inline-flex items-center gap-1.5 text-[#D4AF37] text-[10px] font-black uppercase tracking-wider bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/20 animate-pulse">
                                  <Clock size={10} />
                                  Pending Check
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSendDeviceRequest(user.poppoId, user.nickname)}
                                  disabled={requestingUserId === user.poppoId}
                                  className="px-2.5 py-1.5 bg-[#D4AF37] hover:bg-[#bfa032] text-black font-black uppercase tracking-wider text-[10px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ml-auto shadow-sm"
                                >
                                  {requestingUserId === user.poppoId ? (
                                    <RefreshCw size={10} className="animate-spin" />
                                  ) : (
                                    <Smartphone size={10} />
                                  )}
                                  Send Request
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Right Column: Web Push details for the admin browser & logs */}
        <div className="space-y-6">
          
          {/* Browser Web Push Status */}
          <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-br from-[#13131E] to-[#0A0B0E] border border-white/5 shadow-2xl">
            <h4 className="font-black text-xs uppercase tracking-widest text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] mb-4">My Browser Device</h4>

            <div className="space-y-4">
              {/* SW registration status */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-wide">Worker Registration</span>
                <div className="flex items-center gap-1.5">
                  {swStatus === 'registered' ? (
                    <>
                      <Cpu size={10} className="text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Installed</span>
                    </>
                  ) : swStatus === 'unsupported' ? (
                    <>
                      <ShieldAlert size={10} className="text-red-400" />
                      <span className="text-[10px] font-black text-red-400 uppercase">Unsupported</span>
                    </>
                  ) : (
                    <>
                      <Shield size={10} className="text-yellow-400" />
                      <span className="text-[10px] font-black text-yellow-400 uppercase">Missing</span>
                    </>
                  )}
                </div>
              </div>

              {/* Push subscription status */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-wide">Client Subscription</span>
                <div className="flex items-center gap-1.5">
                  {pushStatus === 'subscribed' ? (
                    <>
                      <Wifi size={10} className="text-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Subscribed</span>
                    </>
                  ) : pushStatus === 'blocked' ? (
                    <>
                      <BellOff size={10} className="text-red-400" />
                      <span className="text-[10px] font-black text-red-400 uppercase">Blocked</span>
                    </>
                  ) : pushStatus === 'loading' ? (
                    <>
                      <RefreshCw size={10} className="text-yellow-400 animate-spin" />
                      <span className="text-[10px] font-black text-yellow-400 uppercase">Loading</span>
                    </>
                  ) : (
                    <>
                      <Radio size={10} className="text-yellow-400" />
                      <span className="text-[10px] font-black text-yellow-400 uppercase">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {pushStatus === 'subscribed' ? (
                  <button
                    onClick={reRegisterPush}
                    className="w-full py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-xl text-xs font-black uppercase text-[#D4AF37] transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={12} />
                    Re-register Browser Push
                  </button>
                ) : (
                  <button
                    onClick={subscribePush}
                    disabled={swStatus === 'unsupported'}
                    className="w-full py-2 bg-[#D4AF37] hover:bg-[#bfa032] text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    Enable Web Push Alerting
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Last Received Notification */}
          <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-br from-[#13131E] to-[#0A0B0E] border border-white/5 shadow-2xl">
            <h4 className="font-black text-xs uppercase tracking-widest text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] mb-4">Last Client Push</h4>
            {lastNotification ? (
              <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <MessageSquare size={12} className="text-[#D4AF37]" />
                  <p className="text-xs font-black text-[#F0EFE8]">{lastNotification.title}</p>
                </div>
                <p className="text-[10px] text-[#A09E9A] leading-relaxed pl-6">{lastNotification.body}</p>
                {lastNotification.url && (
                  <a
                    href={lastNotification.url}
                    className="inline-block text-[9px] font-black uppercase tracking-wider text-cyan-400 hover:underline pl-6"
                  >
                    View Destination Link &rarr;
                  </a>
                )}
              </div>
            ) : (
              <p className="text-center py-6 text-[#A09E9A]/30 italic text-xs">No alerts received this session.</p>
            )}
          </div>

          {/* Console Activity Logs */}
          <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-br from-[#13131E] to-[#0A0B0E] border border-white/5 shadow-2xl">
            <h4 className="font-black text-xs uppercase tracking-widest text-[#A09E9A]/60 mb-3">Push Logger</h4>
            <div className="h-40 overflow-y-auto pr-1 space-y-1.5 font-mono text-[8px] text-[#A09E9A]/80 custom-scrollbar">
              {logMessages.map((log, i) => (
                <div key={i} className="py-1 border-b border-white/5 truncate">
                  {log}
                </div>
              ))}
              {logMessages.length === 0 && (
                <p className="text-center py-10 text-[#A09E9A]/30 italic">Console logger idle.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
