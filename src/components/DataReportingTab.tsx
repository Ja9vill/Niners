import React, { useState } from 'react';
import { Shield, Send, Activity, Target, Heart, Lock, AlertCircle } from 'lucide-react';
import { Storage } from '../lib/storage';
import { Host, PKEntry, ExposureEntry, FanbaseHealthEntry, EventType } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const DataReportingTab = () => {
  const auth = Storage.getAuthState();
  const [activeForm, setActiveForm] = useState<'pk' | 'exposure' | 'fanbase'>('pk');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const isTalent = auth.role === 'Talent';

  const validatePKDates = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return "Start date must be before end date.";
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) return "Range must not exceed 1 month.";
    if (start.getMonth() !== end.getMonth()) return "Range must not cross into a second month.";
    
    return null;
  };

  const handleSubmitPK = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    const formData = new FormData(e.currentTarget);
    const hostId = isTalent ? auth.poppo_id : formData.get('hostId') as string;
    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;

    const dateError = validatePKDates(startDate, endDate);
    if (dateError) {
      setErrors([dateError]);
      return;
    }
    
    const newEntry: PKEntry = {
      id: crypto.randomUUID(),
      poppo_id: hostId,
      start_date: startDate,
      end_date: endDate,
      win_percentage: Number(formData.get('win%')),
      pk_score: Number(formData.get('score')),
      sessions: Number(formData.get('sessions') || 1),
      submitted_by: auth.name,
      submitted_role: auth.role,
      timestamp: new Date().toISOString()
    };

    const current = Storage.getPKData(hostId);
    Storage.setPKData(hostId, [newEntry, ...current]);
    Storage.addLog('Data Reporting', `Submitted PK data for host ${hostId}`, auth.name);
    
    setSuccess('PK Data submitted successfully!');
    e.currentTarget.reset();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmitExposure = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hostId = isTalent ? auth.poppo_id : formData.get('hostId') as string;

    const newEntry: ExposureEntry = {
      id: crypto.randomUUID(),
      poppo_id: hostId,
      event_type: formData.get('type') as string,
      event_date: formData.get('date') as string,
      description: formData.get('notes') as string,
      submitted_by: auth.name,
      submitted_role: auth.role,
      timestamp: new Date().toISOString()
    };

    const current = Storage.getExposures(hostId);
    Storage.setExposures(hostId, [newEntry, ...current]);
    Storage.addLog('Data Reporting', `Submitted Exposure data for host ${hostId}`, auth.name);

    setSuccess('Exposure Data submitted successfully!');
    e.currentTarget.reset();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmitFanbase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hostId = isTalent ? auth.poppo_id : formData.get('hostId') as string;

    const newEntry: FanbaseHealthEntry = {
      id: crypto.randomUUID(),
      hostId,
      subscribers: Number(formData.get('subscribers')),
      gcMembers: Number(formData.get('gcMembers')),
      preStreamUpdate: formData.get('preStream') as string,
      postStreamUpdate: formData.get('postStream') as string,
      submittedBy: auth.name,
      submittedAt: new Date().toISOString()
    };

    const current = Storage.getFanbaseHealth(hostId);
    Storage.setFanbaseHealth(hostId, [newEntry, ...current]);
    Storage.addLog('Data Reporting', `Submitted Fanbase Health for host ${hostId}`, auth.name);

    setSuccess('Fanbase Health data submitted successfully!');
    e.currentTarget.reset();
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Data Reporting</h2>
          <p className="text-xs text-slate-500 font-medium">Auto-populating as <span className="text-indigo-400">{auth.name} ({auth.role})</span></p>
        </div>
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
           <button 
             onClick={() => { setActiveForm('pk'); setErrors([]); }}
             className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeForm === 'pk' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white")}
           >
             Random PK
           </button>
           <button 
             onClick={() => { setActiveForm('exposure'); setErrors([]); }}
             className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeForm === 'exposure' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white")}
           >
             Exposures
           </button>
           <button 
             onClick={() => { setActiveForm('fanbase'); setErrors([]); }}
             className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeForm === 'fanbase' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white")}
           >
             Fanbase Health
           </button>
        </div>
      </div>

      {success && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Activity size={14} />
          </div>
          {success}
        </motion.div>
      )}

      {errors.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold space-y-1">
          {errors.map((err, i) => <div key={i} className="flex items-center gap-2"><AlertCircle size={14} /> {err}</div>)}
        </motion.div>
      )}

      <div className="glass-card !p-8">
        {activeForm === 'pk' && (
          <form onSubmit={handleSubmitPK} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-purple-500/20 rounded-2xl">
                <Target className="text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Random PK Reporting</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Monthly Performance Sync</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Host Poppo ID</label>
                <input 
                  name="hostId" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  className="w-full glass-input font-mono" 
                  placeholder="e.g. 7721054" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Total PK Score</label>
                <input name="score" type="number" required className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Start Date</label>
                <input name="start_date" type="date" required className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">End Date</label>
                <input name="end_date" type="date" required className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Win Percentage (%)</label>
                <input name="win%" type="number" min="0" max="100" required className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Total Sessions</label>
                <input name="sessions" type="number" required defaultValue="1" className="w-full glass-input" placeholder="1" />
              </div>
            </div>
            <button type="submit" className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-transform">Verify & Submit to Dashboard</button>
          </form>
        )}

        {activeForm === 'exposure' && (
          <form onSubmit={handleSubmitExposure} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-cyan-500/20 rounded-2xl">
                <Activity className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Exposure & Visibility Log</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Platform Presence Metrics</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Host Poppo ID</label>
                <input 
                  name="hostId" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  className="w-full glass-input font-mono" 
                  placeholder="e.g. 7721054" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Event Type</label>
                <select name="type" className="w-full glass-input font-bold">
                  <option value="Party Livehouse">Party Livehouse</option>
                  <option value="Poppo Official Event">Poppo Official Event</option>
                  <option value="Collaboration">Collaboration</option>
                  <option value="Platform Feature">Platform Feature</option>
                  <option value="Solo Livehouse">Solo Livehouse</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Event Date</label>
                <input name="date" type="date" required className="w-full glass-input" />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Observational Notes</label>
                <textarea name="notes" className="w-full glass-input h-32 resize-none" placeholder="Details about performance or ranking..." />
              </div>
            </div>
            <button type="submit" className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20">Log Visibility Event</button>
          </form>
        )}

        {activeForm === 'fanbase' && (
          <form onSubmit={handleSubmitFanbase} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-pink-500/20 rounded-2xl">
                <Heart className="text-pink-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Fanbase Health Pulse</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Community Engagement KPI</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Host Poppo ID</label>
                <input 
                  name="hostId" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  className="w-full glass-input font-mono" 
                  placeholder="e.g. 7721054" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Fanclub Subscribers</label>
                <input name="subscribers" type="number" required className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Fanclub GC Members</label>
                <input name="gcMembers" type="number" required className="w-full glass-input" placeholder="0" />
              </div>
              <div className="grid grid-cols-1 gap-8 col-span-full">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">GC Pre-stream Update</label>
                   <input name="preStream" className="w-full glass-input" placeholder="Topic discussed before stream..." />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">GC Post-stream Update</label>
                   <textarea name="postStream" className="w-full glass-input h-32 resize-none" placeholder="Summary or feedback shared in GC..." />
                 </div>
              </div>
            </div>
            <button type="submit" className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-pink-500/20">Sync Health Data</button>
          </form>
        )}
      </div>
    </div>
  );
};
