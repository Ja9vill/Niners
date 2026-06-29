import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ListTodo, Award, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { Task, Host, TopNinersEarningsSummary, AwardBadge, AwardAssignment, LivehouseRequest, ManagerNote } from '../types';
import { Storage } from '../lib/storage';
import { cn } from '../lib/utils';
import { SingleDatePicker } from '../components/InteractiveDatePicker';

export const DirectorOperations = () => {
  const [activeTab, setActiveTab] = useState<'feedback' | 'livehouse'>('feedback');
  const [localAuth, setLocalAuth] = useState(Storage.getAuthState());
  const [livehouseRequests, setLivehouseRequests] = useState<LivehouseRequest[]>([]);
  const [managerNotes, setManagerNotes] = useState<ManagerNote[]>([]);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [proposingAltReq, setProposingAltReq] = useState<LivehouseRequest | null>(null);
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('');
  const [altReason, setAltReason] = useState('');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [assignRoleFilter, setAssignRoleFilter] = useState<string>('All');

  const loadData = async () => {
    try {
      const lr = await FirebaseService.getLivehouses();
      setLivehouseRequests(lr.filter(r => r.status !== 'Completed'));
      const mn = await FirebaseService.getManagerNotes();
      setManagerNotes(mn);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to load operations data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const auditLogAction = async (actionType: string, beforeValue: any, afterValue: any) => {
    try {
      let systemDescription = `Administrative action performed: ${actionType}`;
      await FirebaseService.logSystemActivity(systemDescription, 'Info');
    } catch (err) {
      console.error("Audit log failed", err);
    }
  };

  // LIVEHOUSE
  const handleApproveLivehouse = async (req: LivehouseRequest) => {
    try {
      const updated = { ...req, status: 'Approved' as const };
      await FirebaseService.updateLivehouseStatus(req.id, 'Approved');
      showSuccess('Livehouse request approved.');
      loadData();
    } catch (err) {
      setErrorMessage('Failed to approve request');
    }
  };

  const handleDenyLivehouse = async (req: LivehouseRequest) => {
    try {
      await FirebaseService.updateLivehouseStatus(req.id, 'Denied');
      showSuccess('Livehouse request denied.');
      loadData();
    } catch (err) {
      setErrorMessage('Failed to deny request');
    }
  };

  const submitAltProposal = async () => {
    if (!proposingAltReq || !altDate || !altTime) return;
    try {
      const updated: LivehouseRequest = {
        ...proposingAltReq,
        status: 'Proposal Sent',
        proposedDate: altDate,
        proposedTimeslot: altTime,
        rejectionReason: altReason
      };
      await FirebaseService.saveLivehouses([updated]);
      showSuccess('Alternate proposal sent to host.');
      setProposingAltReq(null);
      loadData();
    } catch (err) {
      setErrorMessage('Failed to send proposal');
    }
  };

  const filteredAssignHosts = hosts.filter(h => {
    const roleLower = String(h.role || '').toLowerCase().replace('_', ' ');
    if (roleLower === 'director') return false;

    if (assignRoleFilter === 'All') return true;
    if (assignRoleFilter === 'Host' && (roleLower === 'host' || roleLower === 'talent')) return true;
    const filterRoleLower = assignRoleFilter.toLowerCase().replace('_', ' ');
    return roleLower === filterRoleLower;
  });

  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle size={16} className="text-red-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase text-red-400">System Alert</p>
              <p className="text-[10px] text-red-300 font-mono leading-relaxed">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400">✕</button>
          </motion.div>
        )}
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-tight">{successMessage}</p>
            <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-400">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="font-bold text-2xl flex items-center gap-2 text-[#F0EFE8]">
            <Briefcase size={24} className="text-indigo-400" />
            Director Operations
          </h3>
          <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">Centralized control panel for Livehouses, Tasks, Feedback and Awards</p>
        </div>

        <div className="flex gap-1.5 bg-[#13131E] p-1.5 rounded-xl border border-white/5 w-fit overflow-x-auto">
          {(['feedback', 'livehouse'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                activeTab === tab ? "bg-indigo-600 text-white shadow-md font-extrabold border border-white/5" : "text-[#A09E9A] hover:text-[#F0EFE8]"
              )}
            >
              {tab === 'feedback' ? 'Feedbacks' : 'Livehouse'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
      ) : (
        <div className="space-y-6">

          {activeTab === 'feedback' && (
            <div className="tech-card">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-white/5 mb-4">Manager Feedback Logs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase">
                      <th className="px-6 py-4">Submitter</th>
                      <th className="px-6 py-4">Host Target</th>
                      <th className="px-6 py-4">Feedback details</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {managerNotes.length === 0 ? (
                      <tr><td colSpan={4} className="py-12 text-center text-[#A09E9A]/20">No feedback logs recorded yet.</td></tr>
                    ) : (
                      managerNotes.map(note => (
                        <tr key={note.id}>
                          <td className="px-6 py-4 font-bold text-indigo-400">{note.managerName}</td>
                          <td className="px-6 py-4 font-bold text-[#F0EFE8]">{note.hostNickname}</td>
                          <td className="px-6 py-4 text-slate-300 whitespace-pre-wrap max-w-md">{note.content}</td>
                          <td className="px-6 py-4 font-mono text-[#A09E9A]/60">{new Date(note.timestamp).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'livehouse' && (
            <div className="tech-card">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-white/5 mb-4">Livehouse Queue</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase">
                      <th className="px-6 py-4">Host Details</th>
                      <th className="px-6 py-4">Proposed DateTime</th>
                      <th className="px-6 py-4">Livehouse Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {livehouseRequests.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-[#A09E9A]/30">No livehouse requests in the queue.</td></tr>
                    ) : (
                      livehouseRequests.map(req => (
                        <tr key={req.id}>
                          <td className="px-6 py-4"><div className="font-bold text-[#F0EFE8]">{req.name}</div><div className="text-[10px] text-indigo-400">ID: {req.poppoId}</div></td>
                          <td className="px-6 py-4"><div className="text-[#F0EFE8]">{req.date || req.proposedDate}</div><div className="text-[10px] text-[#A09E9A]/50">{req.timeslot || req.proposedTimeslot}</div></td>
                          <td className="px-6 py-4 capitalize text-[#A09E9A]">{req.livehouseType || 'SOLO LIVEHOUSE'}</td>
                          <td className="px-6 py-4"><span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">{req.status}</span></td>
                          <td className="px-6 py-4 text-right">
                            {(req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal') && (
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => handleApproveLivehouse(req)} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase">Approve</button>
                                <button onClick={() => setProposingAltReq(req)} className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase">Propose Alt</button>
                                <button onClick={() => handleDenyLivehouse(req)} className="px-2.5 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-300 rounded-lg text-[9px] font-black uppercase">Deny</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {proposingAltReq && (
        <div className="fixed inset-0 bg-[#0D0D14]/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#1A1A28] border border-white/10 max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="text-md font-black text-[#F0EFE8] uppercase">Propose Alternative Time</h3>
            <div className="space-y-3">
              <input type="date" value={altDate} onChange={e => setAltDate(e.target.value)} className="w-full glass-input text-xs" />
              <input type="text" placeholder="Time slot (e.g. 14:00 - 15:00)" value={altTime} onChange={e => setAltTime(e.target.value)} className="w-full glass-input text-xs" />
              <textarea placeholder="Reason for change..." value={altReason} onChange={e => setAltReason(e.target.value)} className="w-full glass-input text-xs h-20" />
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setProposingAltReq(null)} className="px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
                <button onClick={submitAltProposal} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black">Send Proposal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
