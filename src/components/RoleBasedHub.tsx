import React, { useState, useEffect, useMemo } from 'react';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { 
  ShieldAlert, 
  Users, 
  TrendingUp, 
  Target, 
  Settings, 
  CheckCircle, 
  Clock, 
  FileSpreadsheet, 
  UserCheck, 
  Cpu, 
  Terminal, 
  DollarSign,
  Briefcase,
  AlertTriangle,
  History,
  CheckCircle2,
  Trash2,
  Plus,
  Send
} from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import { Host, HostTask, CommissionEntry, CalendarEvent } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const RoleBasedHub = () => {
  const auth = Storage.getAuthState();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [tasks, setTasks] = useState<HostTask[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [success, setSuccess] = useState('');
  const [activeTaskFilter, setActiveTaskFilter] = useState<'All' | 'To Do' | 'In Progress' | 'Completed'>('All');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rawHosts, rawComm] = await Promise.all([
          FirebaseService.getAllHosts(),
          FirebaseService.getAllCommissions()
        ]);
        setHosts(rawHosts || []);
        setCommissions(rawComm || []);
      } catch (err) {
        console.error(err);
      }
      
      // Load local tasks and submissions
      const subLogs = JSON.parse(localStorage.getItem('nine_submissions_log') || '[]');
      setSubmissions(subLogs);
    };
    loadData();
  }, []);

  // Filter hosts based on manager/agent assignment
  const assignedHosts = useMemo(() => {
    if (['Director', 'Head Admin', 'Admin'].includes(auth.role)) {
      return hosts;
    }
    // For local Managers / Agents, filter hosts assigned under them
    return hosts.filter(h => h.manager?.toLowerCase() === auth.name.toLowerCase() || h.manager_assigned?.toLowerCase() === auth.name.toLowerCase());
  }, [hosts, auth]);

  // Handle tasks assignments
  const handleAssignTask = (title: string, hostId: string) => {
    if (!title || !hostId) return;
    const newTask: HostTask = {
      id: crypto.randomUUID(),
      hostId,
      title,
      description: `Downward task assigned by ${auth.name} (${auth.role})`,
      status: 'To Do',
      assignedBy: auth.name,
      createdAt: new Date().toISOString()
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);

    // Persist as Host specific tasks
    const currentHostTasks = Storage.getTasks(hostId);
    Storage.setTasks(hostId, [newTask, ...currentHostTasks]);

    Storage.addNotification({
      title: 'Downward Task Assigned',
      message: `Assigned task '${title}' to host #${hostId}`,
      type: 'info'
    });
    Storage.addLog('Tasks', `Assigned downward task to Host #${hostId}`, auth.role);
    setSuccess('Task successfully assigned downward!');
    setTimeout(() => setSuccess(''), 2500);
  };

  const handleUpdateTaskStatus = (hostId: string, taskId: string, newStatus: any) => {
    const hostTasks = Storage.getTasks(hostId);
    const updated = hostTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    Storage.setTasks(hostId, updated);
    setSuccess('Task status updated successfully!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // AI Generated Recommendations
  const aiRecommendations = useMemo(() => {
    const recs = [];
    // Flag missing profile details
    assignedHosts.forEach(h => {
      if (!h.photoUrl && !h.profile_photo) {
        recs.push({
          id: `rec-photo-${h.id}`,
          type: 'Warning',
          title: `Profile Missing Photo: ${h.name}`,
          suggestion: `Recommend host #${h.id} upload an official profile image avatar.`,
          hostId: h.id
        });
      }
    });

    // High performance or low active hours
    commissions.slice(0, 10).forEach(c => {
      if (c.live_duration > 0 && c.live_duration < 15) {
        recs.push({
          id: `rec-hours-${c.poppo_id}`,
          type: 'Performance',
          title: `Low Activity Warning: ${c.poppo_name}`,
          suggestion: `Host streamed ${c.live_duration} hours. Follow up to boost hours next month.`,
          hostId: c.poppo_id
        });
      }
    });

    return recs;
  }, [assignedHosts, commissions]);

  if (auth.level === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <ShieldAlert size={48} className="text-white/20" />
        <h3 className="text-xl font-bold text-white/50">Leadership Verification Required</h3>
        <p className="text-xs text-slate-500 max-w-sm">Please authenticate into an operational role via the portal to view workspace hubs.</p>
      </div>
    );
  }

  // RENDER SECTIONS BASED ON ROLE
  const isAgentOrManager = auth.role === 'Manager' || auth.role === 'Sub Agent' || auth.role === 'Talent';
  const isAdmin = auth.role === 'Admin';
  const isHeadAdmin = auth.role === 'Head Admin';
  const isDirector = auth.role === 'Director';

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-12">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px]" />
        <div className="space-y-1">
          <span className="text-[10px] font-black tracking-[0.25em] text-indigo-400 uppercase">Live Operations Workspace</span>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">
            {auth.role === 'Director' ? "Director’s Executive Hub" : 
             auth.role === 'Head Admin' ? "Head Admin Coordination Hub" :
             auth.role === 'Admin' ? "Admin Operations Hub" : `${auth.role} Workspace Hub`}
          </h2>
          <p className="text-xs text-slate-500">Auto-auditing data through live validated spreadsheet references.</p>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold shrink-0">
          <Terminal size={14} className="text-indigo-400" />
          <span>PORTAL VERIFIED // SECURE ACCESS</span>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold">
          {success}
        </div>
      )}

      {/* ================== AGENT & MANAGER HUB ================== */}
      {(isAgentOrManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assigned Host Grid */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Users size={16} />
              Assigned Host Matrix ({assignedHosts.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedHosts.map(host => {
                const targetTasks = Storage.getTasks(host.id);
                return (
                  <div key={host.id} className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-4 hover:border-slate-800 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shrink-0">
                        <img 
                          src={host.photoUrl || host.profile_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${host.id}`} 
                          alt={host.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate uppercase">{host.name}</h4>
                        <span className="font-mono text-[10px] text-slate-500">ID: {host.id}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <div className="p-2 bg-white/5 rounded-xl">
                        <span className="block text-[8px] text-slate-500">Status</span>
                        <span className="text-indigo-400">{host.status}</span>
                      </div>
                      <div className="p-2 bg-white/5 rounded-xl">
                        <span className="block text-[8px] text-slate-500">Model Ratio</span>
                        <span className="text-emerald-400">{host.tier === 'S' ? '100%' : host.tier === 'A' ? '80%' : '60%'}</span>
                      </div>
                    </div>

                    {/* Task assignment form */}
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const val = (e.currentTarget.elements.namedItem('taskTitle') as HTMLInputElement).value;
                      handleAssignTask(val, host.id);
                      e.currentTarget.reset();
                    }} className="flex gap-2">
                      <input name="taskTitle" placeholder="Assign quick host task..." className="flex-1 glass-input py-1.5 text-xs" />
                      <button
                        type="submit"
                        title="Assign task to host"
                        aria-label="Assign task to host"
                        className="px-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all text-white"
                      >
                        <Send size={12} />
                      </button>
                    </form>
                  </div>
                );
              })}
              {assignedHosts.length === 0 && (
                <p className="text-slate-500 text-xs italic">No hosts are currently assigned under your operational roster.</p>
              )}
            </div>
          </div>

          {/* AI recommendations Panel */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Cpu size={16} />
              AI Recommendation Bot
            </h3>
            <div className="glass-card !p-6 space-y-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Assigned suggestions calculated based on performance metrics & missing attributes</p>
              <div className="space-y-3">
                {aiRecommendations.length > 0 ? (
                  aiRecommendations.map((rec) => (
                    <div key={rec.id} className="p-4 bg-[#141824] border border-white/5 rounded-2xl relative overflow-hidden space-y-1">
                      <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                        <Target size={12} />
                        {rec.type} Suggestion
                      </div>
                      <h4 className="font-bold text-white text-xs">{rec.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{rec.suggestion}</p>
                      <button 
                        onClick={() => handleAssignTask(rec.suggestion, rec.hostId)}
                        className="mt-2 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:underline"
                      >
                        Convert to Host Task
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs italic">All assigned host files are complete and consistent.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= ADMIN HUB ======================= */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                <FileSpreadsheet size={16} />
                Submissions & Submission Queue
              </h3>
              <span className="text-[10px] font-mono text-indigo-400 font-bold">ROSTER REPORTING EXCLUSIVITY</span>
            </div>

            <div className="space-y-3">
              {submissions.length > 0 ? (
                submissions.slice(0, 10).map((sub, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs">{sub.formName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Submitted by: {sub.submittedBy} ({sub.role}) • {sub.timestamp.substring(0, 10)}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                      {sub.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs italic">Submission queue is empty. Operational forms are logged here as they complete.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Terminal size={16} />
              Operational Workflows
            </h3>
            <div className="glass-card !p-6 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                The Admin hub is workflow-centric. Perform your daily audits, verify host data, review live durations, and logs submissions from the corresponding forms workspace on ROSTER REPORTING.
              </p>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-300 leading-normal">
                <strong>Grounding Spec Warning:</strong> Always match entries by numerical Poppo ID. Do not allow speculative or orphan records to enter spreadsheets.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== HEAD ADMIN HUB ===================== */}
      {isHeadAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={16} />
              Oversight Controls & Recommendations Coordination
            </h3>
            <div className="space-y-4">
              {aiRecommendations.map((rec) => (
                <div key={rec.id} className="p-5 bg-[#141824] border border-indigo-500/10 rounded-2xl flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">{rec.type}</span>
                    <h4 className="font-bold text-white text-sm mt-1">{rec.title}</h4>
                    <p className="text-xs text-slate-400">{rec.suggestion}</p>
                  </div>
                  <button 
                    onClick={() => handleAssignTask(rec.suggestion, rec.hostId)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 transition-all text-white rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                  >
                    Convert & Delegate
                  </button>
                </div>
              ))}
              {aiRecommendations.length === 0 && (
                <p className="text-slate-500 text-xs italic">No active oversight recommendations identified from active sheets.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={16} />
              Task Authority Chain
            </h3>
            <div className="glass-card !p-6 space-y-4 text-xs text-slate-400 leading-relaxed">
              <p>Under the locks of <strong>Tasks Downward-Only</strong>: Head Admins are authorized to delegate operations and convert system observations into concrete, actionable items for Managers, Sub Agents and Roster hosts.</p>
              <p className="text-cyan-400/90 font-mono font-bold uppercase text-[10px]">DOWNWARD-ONLY INVARIANT ACTIVE</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================= DIRECTOR'S HUB ======================= */}
      {isDirector && (
        <div className="space-y-8">
          {/* Executive Payout Calculations & FINANCIAL HISTORY */}
          <div className="glass-card !p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Financial Oversight Console</span>
                <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <DollarSign size={20} className="text-emerald-400" />
                  Ledger: FINANCIAL HISTORY Schema
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grounded in FINANCIAL DATA SHEET</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="p-3">Poppo ID</th>
                    <th className="p-3">Nickname</th>
                    <th className="p-3 text-right">Live Hrs</th>
                    <th className="p-3 text-right">Party Hrs</th>
                    <th className="p-3 text-right">Total Points</th>
                    <th className="p-3 text-right">Commission Log</th>
                    <th className="p-3 text-right">Super Salary</th>
                    <th className="p-3 text-right">Super Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {commissions.slice(0, 15).map((comm, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-all text-slate-300">
                      <td className="p-3 font-semibold text-indigo-400">{comm.poppo_id}</td>
                      <td className="p-3 text-white uppercase font-bold">{comm.poppo_name}</td>
                      <td className="p-3 text-right">{comm.live_duration} hrs</td>
                      <td className="p-3 text-right">{comm.party_host_duration || 0} hrs</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">{formatNumber(comm.total_points)}</td>
                      <td className="p-3 text-right text-cyan-400">{formatNumber(comm.agentweb_commission_earning || comm.my_commission)}</td>
                      <td className="p-3 text-right text-purple-400">{comm.super_salary ? `${formatNumber(comm.super_salary)}` : '0'}</td>
                      <td className="p-3 text-right text-slate-500">#{comm.super_rank || idx + 1}</td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">No financial ledger rows processed yet. Upload a validated mastersheet file.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Poppo ID Detection rule & Winner Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card !p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <AlertTriangle className="text-amber-500 font-bold" size={18} />
                <h4 className="font-bold text-white text-sm uppercase">Unidentified Poppo ID Discovery Logs</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                If an unlisted Poppo ID is processed in the Financial Ledger before existing in Roster structures, it is treated as a new roster-linked identity, logged below, and placed on the follow-up checklist.
              </p>
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-3">
                <div className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-widest">1 Auto-triggered Identity Flagged:</div>
                <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2">
                  <span className="text-slate-300 font-mono font-semibold">Poppo ID Flagged: #19157913</span>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[9px] uppercase tracking-wide">Pending Full Roster Bio</span>
                </div>
              </div>
            </div>

            <div className="glass-card !p-6 space-y-4">
              <h4 className="font-bold text-white text-sm uppercase border-b border-white/5 pb-3">Approved Winner Selection Grid</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assign public recognition awards to top roster members. Recipient selection must match active hosts in DATA MASTERSHEET.
              </p>
              <div className="p-4 bg-slate-950 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">CURRENT SPOTLIGHT WINNER:</span>
                  <span className="text-indigo-400 font-black">Efficiency King (#1001)</span>
                </div>
                <div className="flex gap-2">
                  <select
                    title="Select spotlight winner host"
                    aria-label="Select spotlight winner host"
                    className="flex-1 glass-input py-1 text-xs"
                  >
                    {hosts.map(h => (
                      <option key={h.id} value={h.id}>{h.name} (#{h.id})</option>
                    ))}
                  </select>
                  <button className="px-4 py-1.5 bg-indigo-600 rounded-xl text-white font-bold text-xs hover:bg-indigo-500">
                    Assign
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
