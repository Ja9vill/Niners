import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Shield, ShieldAlert, Cpu, RefreshCw, Radio, CheckCircle, Wifi, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Storage } from '../lib/storage';

interface NotificationType {
  id: string;
  label: string;
  description: string;
  active: boolean;
}

export const NotificationControlCenter = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [swStatus, setSwStatus] = useState<'unsupported' | 'unregistered' | 'registered'>('unregistered');
  const [pushStatus, setPushStatus] = useState<'unsubscribed' | 'subscribed' | 'blocked' | 'loading'>('loading');
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

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

  const addLog = (msg: string) => {
    setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Check registration and subscription status
  const checkStatus = async () => {
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

  // Fetch all notification types
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      addLog('Failed to fetch notification types.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    fetchNotifications();

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

  // Subscribe to web push
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
      const authState = Storage.getAuthState();
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

  // Activate a notification type
  const handleActivate = async (id: string) => {
    setIsActionLoading(id);
    try {
      const res = await fetch('/api/notifications/activate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, active: true } : n))
        );
        addLog(`Activated notification type: ${id}`);
      }
    } catch (err) {
      console.error(err);
      addLog(`Failed to activate type: ${id}`);
    } finally {
      setIsActionLoading(null);
    }
  };

  // Revoke a notification type
  const handleRevoke = async (id: string) => {
    setIsActionLoading(id);
    try {
      const res = await fetch('/api/notifications/revoke', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, active: false } : n))
        );
        addLog(`Revoked notification type: ${id}`);
      }
    } catch (err) {
      console.error(err);
      addLog(`Failed to revoke type: ${id}`);
    } finally {
      setIsActionLoading(null);
    }
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
          body: `This is a test notification for the active type: ${label}`,
          url: '/notifications-control',
          type: type
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        addLog(`Test notification successfully sent!`);
      } else if (data.status === 'ignored') {
        addLog(`Ignored: ${data.message}`);
      } else {
        addLog(`Push failed: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Test send failed: ${err.message}`);
    }
  };

  const activeNotifications = notifications.filter(n => n.active);
  const recommendedNotifications = notifications.filter(n => !n.active);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#D4AF37]" />
        <p className="text-sm font-bold text-[#A09E9A] uppercase tracking-widest">Loading Control Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-xl flex items-center gap-2 text-[#F0EFE8]">
            <Bell className="text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]" size={24} />
            Notification Control Center
          </h3>
          <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">
            Configure system-wide triggers & manage Web Push subscriptions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center: Notifications Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 2 — Active Notifications */}
          <div className="glass-card p-5 relative overflow-hidden transition-all duration-500" style={{
            background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(250, 204, 21, 0.3)',
            borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
            borderColor: 'rgba(234, 179, 8, 0.2)',
            boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
          }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse shadow-[0_0_8px_rgba(255,184,0,0.8)]"></span>
              <h4 className="font-black text-sm uppercase tracking-widest text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]">Active Triggers</h4>
              <span className="text-[10px] text-[#A09E9A] font-mono ml-2">({activeNotifications.length})</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {activeNotifications.map(n => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 rounded-xl flex items-center justify-between gap-4 border transition-all duration-300 bg-gradient-to-r from-[#FFB800]/10 via-[#FFB800]/2 to-[#1A1A28]/40 border-[#FFB800]/30 shadow-md shadow-[#FFB800]/5"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-black text-[#F0EFE8]">{n.label}</p>
                      <p className="text-[10px] text-[#A09E9A] leading-relaxed">{n.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleSendTest(n.id, n.label)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-[#FFB800]/10 border border-white/10 hover:border-[#FFB800]/30 text-white/60 hover:text-[#FFB800] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        title="Send test push to verified endpoints"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleRevoke(n.id)}
                        disabled={isActionLoading === n.id}
                        className="px-4 py-1.5 bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-black uppercase tracking-wider text-[10px] rounded-lg transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {isActionLoading === n.id ? '...' : 'Revoke'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {activeNotifications.length === 0 && (
                <div className="text-center py-8 text-[#A09E9A]/30 italic text-xs">
                  No active notification types. Activate recommended templates below.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 1 — Recommended Notifications */}
          <div className="glass-card p-5 relative overflow-hidden transition-all duration-500" style={{
            background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(250, 204, 21, 0.3)',
            borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
            borderColor: 'rgba(234, 179, 8, 0.2)',
            boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
          }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A09E9A] shadow-[0_0_8px_rgba(160,158,154,0.8)]"></span>
              <h4 className="font-black text-sm uppercase tracking-widest text-[#A09E9A]/80">Recommended Templates</h4>
              <span className="text-[10px] text-[#A09E9A] font-mono ml-2">({recommendedNotifications.length})</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {recommendedNotifications.map(n => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 rounded-xl flex items-center justify-between gap-4 border transition-all duration-300 bg-white/[0.01] hover:bg-white/[0.03] border-white/5 hover:border-white/10"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#F0EFE8]">{n.label}</p>
                      <p className="text-[10px] text-[#A09E9A]/70 leading-relaxed">{n.description}</p>
                    </div>
                    <button
                      onClick={() => handleActivate(n.id)}
                      disabled={isActionLoading === n.id}
                      className="px-4 py-1.5 bg-[#FFB800] hover:bg-[#FFD700] text-black font-black uppercase tracking-wider text-[10px] rounded-lg transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
                    >
                      {isActionLoading === n.id ? '...' : 'Activate'}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {recommendedNotifications.length === 0 && (
                <div className="text-center py-8 text-[#A09E9A]/30 italic text-xs">
                  All templates have been activated.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Web Push Connection Details & Logger */}
        <div className="space-y-6">
          {/* SECTION 3 — Web Push Status */}
          <div className="glass-card p-5 relative overflow-hidden transition-all duration-500" style={{
            background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(250, 204, 21, 0.3)',
            borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
            borderColor: 'rgba(234, 179, 8, 0.2)',
            boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
          }}>
            <h4 className="font-black text-sm uppercase tracking-widest text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.4)] mb-4">Web Push Status</h4>

            <div className="space-y-4">
              {/* SW registration status */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-wide">Service Worker</span>
                <div className="flex items-center gap-1.5">
                  {swStatus === 'registered' ? (
                    <>
                      <Cpu size={12} className="text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Registered</span>
                    </>
                  ) : swStatus === 'unsupported' ? (
                    <>
                      <ShieldAlert size={12} className="text-red-400" />
                      <span className="text-[10px] font-black text-red-400 uppercase">Unsupported</span>
                    </>
                  ) : (
                    <>
                      <Shield size={12} className="text-yellow-400" />
                      <span className="text-[10px] font-black text-yellow-400 uppercase">Unregistered</span>
                    </>
                  )}
                </div>
              </div>

              {/* Push subscription status */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-wide">Subscription</span>
                <div className="flex items-center gap-1.5">
                  {pushStatus === 'subscribed' ? (
                    <>
                      <Wifi size={12} className="text-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Subscribed</span>
                    </>
                  ) : pushStatus === 'blocked' ? (
                    <>
                      <BellOff size={12} className="text-red-400" />
                      <span className="text-[10px] font-black text-red-400 uppercase">Blocked</span>
                    </>
                  ) : pushStatus === 'loading' ? (
                    <>
                      <RefreshCw size={12} className="text-yellow-400 animate-spin" />
                      <span className="text-[10px] font-black text-yellow-400 uppercase">Loading</span>
                    </>
                  ) : (
                    <>
                      <Radio size={12} className="text-yellow-400" />
                      <span className="text-[10px] font-black text-yellow-400 uppercase">Not Subscribed</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {pushStatus === 'subscribed' ? (
                  <button
                    onClick={reRegisterPush}
                    className="w-full py-2 bg-gradient-to-br from-[#FFB800]/10 to-transparent hover:from-[#FFB800]/20 hover:to-transparent border border-[#FFB800]/30 hover:border-[#FFB800]/60 rounded-xl text-xs font-black uppercase text-[#FFB700] transition-all cursor-pointer select-none text-center shadow-[inset_0_0_10px_rgba(255,184,0,0.1)] flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={12} />
                    Re-register Web Push
                  </button>
                ) : (
                  <button
                    onClick={subscribePush}
                    disabled={swStatus === 'unsupported'}
                    className="w-full py-2 bg-[#FFB800] hover:bg-[#FFD700] text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    Enable Web Push
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Last Received Notification */}
          <div className="glass-card p-5 relative overflow-hidden transition-all duration-500" style={{
            background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(250, 204, 21, 0.3)',
            borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
            borderColor: 'rgba(234, 179, 8, 0.2)',
            boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
          }}>
            <h4 className="font-black text-sm uppercase tracking-widest text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.4)] mb-4">Last Push Received</h4>
            {lastNotification ? (
              <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#FFB800]" />
                  <p className="text-xs font-black text-[#F0EFE8]">{lastNotification.title}</p>
                </div>
                <p className="text-[10px] text-[#A09E9A] leading-relaxed pl-6">{lastNotification.body}</p>
                {lastNotification.url && (
                  <a
                    href={lastNotification.url}
                    className="inline-block text-[9px] font-black uppercase tracking-wider text-cyan-400 hover:underline pl-6"
                  >
                    Destination Link &rarr;
                  </a>
                )}
              </div>
            ) : (
              <p className="text-center py-6 text-[#A09E9A]/30 italic text-xs">No notifications received in this session.</p>
            )}
          </div>

          {/* Activity Logs */}
          <div className="glass-card p-5 relative overflow-hidden transition-all duration-500" style={{
            background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(250, 204, 21, 0.3)',
            borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
            borderColor: 'rgba(234, 179, 8, 0.2)',
            boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
          }}>
            <h4 className="font-black text-sm uppercase tracking-widest text-[#A09E9A]/60 mb-3">Push Logger</h4>
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
