import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission, messaging } from '../lib/firebase';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Storage } from '../lib/storage';

export const NotificationPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const authState = Storage.getAuthState();

  useEffect(() => {
    // Only show if authenticated and messaging is supported and permission is default
    if (authState.level > 0 && messaging && Notification.permission === 'default') {
      const hasDismissed = localStorage.getItem('dismissed_fcm_prompt');
      if (!hasDismissed) {
        setShowPrompt(true);
      } else if (authState.poppo_id) {
        // If dismissed, check if director explicitly requested device enrollment
        const checkDirectorRequest = async () => {
          try {
            const userRef = doc(db, 'users', authState.poppo_id);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData?.notificationRequestedByDirector === true) {
                setShowPrompt(true);
              }
            }
          } catch (err) {
            console.error('Failed to query director notification request:', err);
          }
        };
        checkDirectorRequest();
      }
    }
  }, [authState.level, authState.poppo_id]);

  const handleEnable = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token && authState.poppo_id) {
        // Save to users collection and clear director request flag
        const userRef = doc(db, 'users', authState.poppo_id);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token),
          notificationRequestedByDirector: false
        });
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
    } finally {
      setShowPrompt(false);
      localStorage.setItem('dismissed_fcm_prompt', 'true');
    }
  };

  const handleDismiss = async () => {
    setShowPrompt(false);
    localStorage.setItem('dismissed_fcm_prompt', 'true');
    if (authState.poppo_id) {
      try {
        const userRef = doc(db, 'users', authState.poppo_id);
        await updateDoc(userRef, {
          notificationRequestedByDirector: false
        });
      } catch (err) {
        console.error('Failed to clear request flag on dismiss:', err);
      }
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#1A1A28] border border-indigo-500/30 rounded-2xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-full">
            <Bell size={20} className="text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#F0EFE8]">Enable Notifications</h4>
            <p className="text-xs text-[#A09E9A] mt-1">
              Enable notifications to receive important agency alerts.
            </p>
          </div>
        </div>
        <button title="Dismiss" onClick={handleDismiss} className="text-[#A09E9A] hover:text-[#F0EFE8]">
          <X size={16} />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button 
          onClick={handleEnable}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-2 rounded-xl transition-colors"
        >
          Enable Notifications
        </button>
        <button 
          onClick={handleDismiss}
          className="flex-1 bg-black/20 hover:bg-black/40 text-[#A09E9A] text-xs font-bold py-2 rounded-xl transition-colors border border-white/5"
        >
          Not Now
        </button>
      </div>
    </div>
  );
};
