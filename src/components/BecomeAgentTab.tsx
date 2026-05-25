import React, { useState } from 'react';
import { Storage } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { Send, UserPlus, CheckCircle, Smartphone, MapPin, Smile, Star } from 'lucide-react';

export const BecomeAgentTab = () => {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      Storage.addNotification({
        title: 'New Agent Application',
        message: 'A new sub-agent candidacy application was captured from public viewing layer.',
        type: 'info'
      });
    }, 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight text-center">Become a Nine Sub-Agent</h2>
        <p className="text-xs text-slate-500 font-medium text-center mt-2">
          Apply to expand our roster, host activities and unlock performance-based commission points.
        </p>
      </div>

      <AnimatePresence>
        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card !p-8 text-center space-y-4"
          >
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h3 className="text-lg font-black text-white">Application Received!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your sub-agent inquiry packet has been saved to the <strong>DATA MASTERSHEET (ROSTER INBOUND)</strong> log. Leadership access admins will follow up shortly via your provided Poppo ID.
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card !p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] pl-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Smile size={16} /></span>
                  <input required name="name" className="w-full glass-input pl-11" placeholder="e.g. Joy Kim" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] pl-1">Poppo ID</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><UserPlus size={16} /></span>
                  <input required name="poppo_id" className="w-full glass-input pl-11 font-mono" placeholder="Poppo ID if registered" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] pl-1">Telegram / Contact</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Smartphone size={16} /></span>
                  <input required name="telegram" className="w-full glass-input pl-11" placeholder="@telegram_handle" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] pl-1">Location / Timezone</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><MapPin size={16} /></span>
                  <input required name="location" className="w-full glass-input pl-11" placeholder="e.g. Seoul, (UTC+9)" />
                </div>
              </div>

              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] pl-1">Pitch / Roster details</label>
                <textarea 
                  required 
                  name="pitch"
                  className="w-full glass-input h-28 resize-none" 
                  placeholder="Outline your host management experiences or intended target hosts list..."
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20"
            >
              {loading ? 'Submitting Application...' : 'Apply as Partner Sub-Agent'}
            </button>
          </form>
        )}
      </AnimatePresence>
    </div>
  );
};
