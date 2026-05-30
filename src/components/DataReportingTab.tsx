/* eslint-disable i18next/no-literal-string */
import React, { useState, useEffect } from 'react';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { 
  Send, 
  Activity, 
  Target, 
  Heart, 
  Camera, 
  Calendar, 
  ShieldCheck, 
  Users, 
  AlertCircle,
  Plus,
  X,
  Clock,
  Coins
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Host } from '../types';

export const DataReportingTab = () => {
  const auth = Storage.getAuthState();
  const [activeForm, setActiveForm] = useState<'fanbase' | 'pk' | 'exposure' | 'weekly' | 'monthly'>('fanbase');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<Host[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  const isTalent = auth.role === 'Talent';

  useEffect(() => {
    // Load active hosts for popups and lists
    const load = async () => {
      try {
        const raw = await FirebaseService.getAllHosts();
        setHosts(raw);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleCreateSubmission = (formName: string, payload: any) => {
    // Save to local logs & push as an update
    const submissions = JSON.parse(localStorage.getItem('nine_submissions_log') || '[]');
    const newSubmission = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      submittedBy: auth.name,
      role: auth.role,
      formName,
      status: 'SUCCESS',
      payload
    };
    localStorage.setItem('nine_submissions_log', JSON.stringify([newSubmission, ...submissions]));
    Storage.addNotification({
      title: 'Reporting Saved',
      message: `${formName} submitted successfully for Poppo ID #${payload.poppo_id || payload.hostId || 'Agency'}.`,
      type: 'success'
    });
    Storage.addLog('Submission', `Logged ${formName} entry`, auth.name);
    setSuccess(`${formName} saved successfully to active worksheets!`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleAddAttendee = (host: Host) => {
    if (!selectedAttendees.some(h => h.id === host.id)) {
      setSelectedAttendees([...selectedAttendees, host]);
    }
    setAttendeeSearch('');
  };

  const handleRemoveAttendee = (hostId: string) => {
    setSelectedAttendees(selectedAttendees.filter(h => h.id !== hostId));
  };

  // 1. Fanbase Reporting Submit
  const handleFanbaseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    const formData = new FormData(e.currentTarget);
    const fromDate = formData.get('from_date') as string;
    const toDate = formData.get('to_date') as string;
    const poppo_id = isTalent ? auth.poppo_id : formData.get('poppo_id') as string;
    const nickname = formData.get('nickname') as string;

    if (new Date(fromDate) > new Date(toDate)) {
      setErrors(['From Date cannot be later than To Date']);
      return;
    }

    const payload = {
      from_date: fromDate,
      to_date: toDate,
      poppo_id,
      nickname,
      subscribers: Number(formData.get('subscribers')),
      gcMembers: Number(formData.get('gcMembers')),
      updatesByHost: Number(formData.get('updatesByHost') || 0),
      updatesByMembers: Number(formData.get('updatesByMembers') || 0),
      notes: formData.get('notes') as string
    };

    handleCreateSubmission('Fanbase Reporting', payload);
    e.currentTarget.reset();
  };

  // 2. Random PK Reporting Submit
  const handlePKSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    const formData = new FormData(e.currentTarget);
    const fromDate = formData.get('from_date') as string;
    const toDate = formData.get('to_date') as string;
    const poppo_id = isTalent ? auth.poppo_id : formData.get('poppo_id') as string;
    const nickname = formData.get('nickname') as string;

    if (new Date(fromDate) > new Date(toDate)) {
      setErrors(['From Date cannot be later than To Date']);
      return;
    }

    const payload = {
      from_date: fromDate,
      to_date: toDate,
      updated_by_role: auth.role,
      poppo_id,
      nickname,
      pk_sessions: Number(formData.get('sessions') || 1),
      pk_score: Number(formData.get('score')),
      win_percentage: Number(formData.get('win%')),
      notes: formData.get('notes') as string
    };

    handleCreateSubmission('Random PK Reporting', payload);
    e.currentTarget.reset();
  };

  // 3. Exposures Reporting Submit
  const handleExposureSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    const formData = new FormData(e.currentTarget);
    const eventDate = formData.get('event_date') as string;
    const poppo_id = isTalent ? auth.poppo_id : formData.get('poppo_id') as string;

    const payload = {
      timestamp: new Date().toISOString(),
      poppo_id,
      event_date: eventDate,
      event_type: formData.get('event_type') as string,
      description: formData.get('description') as string,
      attendance: selectedAttendees.map(h => ({ id: h.id, name: h.name }))
    };

    // Save actual exposure to the host's timeline as well
    const current = Storage.getExposures(poppo_id);
    const newExposure = {
      id: crypto.randomUUID(),
      poppo_id,
      event_type: payload.event_type,
      event_date: payload.event_date,
      description: payload.description,
      submitted_by: auth.name,
      submitted_role: auth.role,
      timestamp: payload.timestamp
    };
    Storage.setExposures(poppo_id, [newExposure, ...current]);

    handleCreateSubmission('Exposures Reporting', payload);
    setSelectedAttendees([]);
    e.currentTarget.reset();
  };

  // 4 & 5. Live Data Weekly/Monthly Submit
  const handleLiveDataSubmit = (e: React.FormEvent<HTMLFormElement>, isWeekly: boolean) => {
    e.preventDefault();
    setErrors([]);
    const formData = new FormData(e.currentTarget);
    const fromDate = formData.get('from_date') as string;
    const toDate = formData.get('to_date') as string;
    const poppo_id = isTalent ? auth.poppo_id : formData.get('poppo_id') as string;
    const nickname = formData.get('nickname') as string;

    if (new Date(fromDate) > new Date(toDate)) {
      setErrors(['From Date cannot be later than To Date']);
      return;
    }

    const payload = {
      from_date: fromDate,
      to_date: toDate,
      poppo_id,
      nickname,
      total_duration: formData.get('duration') as string, // e.g. "HH:MM:SS" or numerical hours
      total_earnings: Number(formData.get('earnings') || 0),
      avg_online_users: Number(formData.get('online_users') || 0),
      new_fans: Number(formData.get('new_fans') || 0),
      new_fanclub_members: Number(formData.get('new_fanclub') || 0),
      gifting_count: Number(formData.get('gifting_count') || 0),
      unfollowers: Number(formData.get('unfollowers') || 0),
      total_points: Number(formData.get('total_points') || 0),
      notes: formData.get('notes') as string
    };

    handleCreateSubmission(isWeekly ? 'Live Data Weekly Reporting' : 'Live Data Monthly Reporting', payload);
    e.currentTarget.reset();
  };

  const filteredHosts = hosts.filter(h => 
    h.name.toLowerCase().includes(attendeeSearch.toLowerCase()) || 
    h.id.includes(attendeeSearch)
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Operational Reporting</h2>
          <p className="text-xs text-slate-500 font-medium">Logged in: <span className="text-indigo-400 font-bold">{auth.name} ({auth.role})</span></p>
        </div>
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
           {[
             { id: 'fanbase', label: 'Fanbase', icon: Heart },
             { id: 'pk', label: 'Random PK', icon: Target },
             { id: 'exposure', label: 'Exposures', icon: Camera },
             { id: 'weekly', label: 'Weekly Live', icon: Clock },
             { id: 'monthly', label: 'Monthly Live', icon: Coins }
           ].map((tab) => {
             const Icon = tab.icon;
             return (
               <button 
                 key={tab.id}
                 onClick={() => { setActiveForm(tab.id as any); setErrors([]); }}
                 className={cn(
                   "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", 
                   activeForm === tab.id 
                     ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                     : "text-slate-400 hover:text-white"
                 )}
               >
                 <Icon size={12} />
                 {tab.label}
               </button>
             );
           })}
        </div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-semibold flex items-center gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck size={14} />
            </div>
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold space-y-1"
          >
            {errors.map((err, i) => <div key={i} className="flex items-center gap-2"><AlertCircle size={14} /> {err}</div>)}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card !p-8">
        {/* Form 1: Fanbase Reporting */}
        {activeForm === 'fanbase' && (
          <form onSubmit={handleFanbaseSubmit} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-pink-500/25 rounded-2xl">
                <Heart className="text-pink-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Fanbase Reporting</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Audited Community Metrics</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">From Date</label>
                <input name="from_date" type="date" required aria-label="From Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">To Date</label>
                <input name="to_date" type="date" required aria-label="To Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Poppo ID</label>
                <input 
                  name="poppo_id" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  className="w-full glass-input font-mono" 
                  placeholder="e.g. 19381364" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Nickname</label>
                <input 
                  name="nickname" 
                  required 
                  defaultValue={isTalent ? auth.name : ''}
                  className="w-full glass-input" 
                  placeholder="e.g. Host Joy" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Fanclub Subscribers</label>
                <input name="subscribers" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Fanclub GC Members</label>
                <input name="gcMembers" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">GC Updates by Host</label>
                <input name="updatesByHost" type="number" min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">GC Updates by Members</label>
                <input name="updatesByMembers" type="number" min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Notes</label>
                <textarea name="notes" className="w-full glass-input h-24 resize-none" placeholder="Enter supportive remarks, fan insights or details..." />
              </div>
            </div>

            <button type="submit" className="w-full btn-primary py-4 text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-600/20">
              Submit Fanbase Report
            </button>
          </form>
        )}

        {/* Form 2: Random PK Reporting */}
        {activeForm === 'pk' && (
          <form onSubmit={handlePKSubmit} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-indigo-500/25 rounded-2xl">
                <Target className="text-indigo-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Random PK Reporting</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Interactive Game Logs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">From Date</label>
                <input name="from_date" type="date" required aria-label="From Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">To Date</label>
                <input name="to_date" type="date" required aria-label="To Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Updated By (Logged Role)</label>
                <input name="updated_by_role" disabled value={auth.role} aria-label="Updated By (Logged Role)" className="w-full glass-input text-slate-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Poppo ID</label>
                <input 
                  name="poppo_id" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  className="w-full glass-input font-mono" 
                  placeholder="e.g. 19381364" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Nickname</label>
                <input 
                  name="nickname" 
                  required 
                  defaultValue={isTalent ? auth.name : ''}
                  className="w-full glass-input" 
                  placeholder="Host Display Nickname" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">PK Session Count</label>
                <input name="sessions" type="number" required min="1" className="w-full glass-input" placeholder="1" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">PK Score Total</label>
                <input name="score" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1 font-sans">PK Win Percentage (%)</label>
                <input name="win%" type="number" required min="0" max="100" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Notes</label>
                <textarea name="notes" className="w-full glass-input h-24 resize-none" placeholder="Notes about competitor, matching quality..." />
              </div>
            </div>

            <button type="submit" className="w-full btn-primary py-4 text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-600/20">
              Submit Random PK Report
            </button>
          </form>
        )}

        {/* Form 3: Exposures Reporting */}
        {activeForm === 'exposure' && (
          <form onSubmit={handleExposureSubmit} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-cyan-500/25 rounded-2xl">
                <Camera className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Exposures Reporting</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Publicity & Official Activities</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Timestamp</label>
                <input disabled value={new Date().toLocaleString()} aria-label="Timestamp" className="w-full glass-input text-slate-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Host Poppo ID</label>
                <input 
                  name="poppo_id" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  className="w-full glass-input font-mono" 
                  placeholder="e.g. 19381364" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Event Date</label>
                <input name="event_date" type="date" required aria-label="Event Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Event Type</label>
                <select name="event_type" aria-label="Event Type" className="w-full glass-input font-bold">
                  <option value="Solo Livehouse">Solo Livehouse</option>
                  <option value="Party Livehouse">Party Livehouse</option>
                  <option value="Poppo Official Event">Poppo Official Event</option>
                  <option value="Collaboration">Collaboration</option>
                  <option value="Platform Feature">Platform Feature</option>
                </select>
              </div>

              {/* Agency Attendance - Selector */}
              <div className="space-y-3 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">
                  Agency Attendance (Multi-add Selector)
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    className="w-full glass-input"
                    placeholder="Search by host name or Poppo ID to add..."
                  />
                  {attendeeSearch && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl z-50 p-2 space-y-1">
                      {filteredHosts.slice(0, 10).map(host => (
                        <button
                          key={host.id}
                          type="button"
                          onClick={() => handleAddAttendee(host)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg flex items-center justify-between"
                        >
                          <span>{host.name}</span>
                          <span className="font-mono text-slate-500">ID: {host.id}</span>
                        </button>
                      ))}
                      {filteredHosts.length === 0 && (
                        <p className="text-slate-500 text-xs p-2 italic">No matching hosts found</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedAttendees.map(host => (
                    <span 
                      key={host.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/35 text-indigo-300 rounded-full text-xs font-bold"
                    >
                      {host.name} ({host.id})
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAttendee(host.id)}
                        aria-label={`Remove ${host.name} from attendees`}
                        className="text-indigo-400 hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {selectedAttendees.length === 0 && (
                    <p className="text-slate-500 text-xs italic pl-1">No attendees selected yet</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Description</label>
                <textarea name="description" required className="w-full glass-input h-24 resize-none" placeholder="Highlights of the official coverage, features..." />
              </div>
            </div>

            <button type="submit" className="w-full btn-primary py-4 text-xs font-black uppercase tracking-wider shadow-xl shadow-cyan-600/20">
              Log Exposure Report
            </button>
          </form>
        )}

        {/* Form 4: Live Data Weekly Reporting */}
        {activeForm === 'weekly' && (
          <form onSubmit={(e) => handleLiveDataSubmit(e, true)} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-violet-500/25 rounded-2xl">
                <Clock className="text-violet-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Live Data Weekly Reporting</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Weekly Performance Sync</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">From Date</label>
                <input name="from_date" type="date" required aria-label="From Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">To Date</label>
                <input name="to_date" type="date" required aria-label="To Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Poppo ID</label>
                <input 
                  name="poppo_id" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  aria-label="Poppo ID"
                  placeholder="e.g. 19381364"
                  className="w-full glass-input font-mono" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Nickname</label>
                <input 
                  name="nickname" 
                  required 
                  defaultValue={isTalent ? auth.name : ''}
                  aria-label="Nickname"
                  placeholder="Host Display Nickname"
                  className="w-full glass-input" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Live Duration (HH:MM:SS)</label>
                <input name="duration" placeholder="e.g. 52:16:48" required className="w-full glass-input font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Earnings</label>
                <input name="earnings" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Average Online Users</label>
                <input name="online_users" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">New Fans</label>
                <input name="new_fans" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">New Fanclub Members</label>
                <input name="new_fanclub" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Gifting Count</label>
                <input name="gifting_count" type="number" min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Unfollowers</label>
                <input name="unfollowers" type="number" min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Total Points</label>
                <input name="total_points" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Notes</label>
                <textarea name="notes" className="w-full glass-input h-24 resize-none" placeholder="Weekly notes..." />
              </div>
            </div>

            <button type="submit" className="w-full btn-primary py-4 text-xs font-black uppercase tracking-wider shadow-xl shadow-purple-600/20">
              Submit Weekly Live Report
            </button>
          </form>
        )}

        {/* Form 5: Live Data Monthly Reporting */}
        {activeForm === 'monthly' && (
          <form onSubmit={(e) => handleLiveDataSubmit(e, false)} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="p-3 bg-emerald-500/25 rounded-2xl">
                <Coins className="text-emerald-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Live Data Monthly Reporting</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Monthly Performance Ledger</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">From Date</label>
                <input name="from_date" type="date" required aria-label="From Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">To Date</label>
                <input name="to_date" type="date" required aria-label="To Date" className="w-full glass-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Poppo ID</label>
                <input 
                  name="poppo_id" 
                  required={!isTalent} 
                  disabled={isTalent} 
                  defaultValue={isTalent ? auth.poppo_id : ''} 
                  aria-label="Poppo ID"
                  placeholder="e.g. 19381364"
                  className="w-full glass-input font-mono" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Nickname</label>
                <input 
                  name="nickname" 
                  required 
                  defaultValue={isTalent ? auth.name : ''}
                  aria-label="Nickname"
                  placeholder="Host Display Nickname"
                  className="w-full glass-input" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Live Duration (HH:MM:SS)</label>
                <input name="duration" placeholder="e.g. 263:09:36" required className="w-full glass-input font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Earnings</label>
                <input name="earnings" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Average Online Users</label>
                <input name="online_users" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">New Fans</label>
                <input name="new_fans" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">New Fanclub Members</label>
                <input name="new_fanclub" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Gifting Count</label>
                <input name="gifting_count" type="number" min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Unfollowers</label>
                <input name="unfollowers" type="number" min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Total Points</label>
                <input name="total_points" type="number" required min="0" className="w-full glass-input" placeholder="0" />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Notes</label>
                <textarea name="notes" className="w-full glass-input h-24 resize-none" placeholder="Monthly notes..." />
              </div>
            </div>

            <button type="submit" className="w-full btn-primary py-4 text-xs font-black uppercase tracking-wider shadow-xl shadow-emerald-600/20">
              Submit Monthly Live Report
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
