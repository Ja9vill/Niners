import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ListTodo, Award, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { Task, Host, TopNinersEarningsSummary, AwardBadge, AwardAssignment, LivehouseRequest, ManagerNote } from '../types';
import { Storage } from '../lib/storage';
import { cn } from '../lib/utils';
import { SingleDatePicker } from '../components/InteractiveDatePicker';

export const DirectorOperations = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'awards' | 'feedback' | 'livehouse'>('tasks');
  const [localAuth, setLocalAuth] = useState(Storage.getAuthState());
  const [hosts, setHosts] = useState<Host[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [awards, setAwards] = useState<AwardBadge[]>([]);
  const [awardAssignments, setAwardAssignments] = useState<AwardAssignment[]>([]);
  const [livehouseRequests, setLivehouseRequests] = useState<LivehouseRequest[]>([]);
  const [managerNotes, setManagerNotes] = useState<ManagerNote[]>([]);
  const [earningsSummaries, setEarningsSummaries] = useState<TopNinersEarningsSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [taskDueDateVal, setTaskDueDateVal] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [newAwardName, setNewAwardName] = useState('');
  const [newAwardColor, setNewAwardColor] = useState('Gold');
  const [newAwardStartDate, setNewAwardStartDate] = useState('');
  const [newAwardEndDate, setNewAwardEndDate] = useState('');
  const [isCreatingAward, setIsCreatingAward] = useState(false);
  const [awardCreateMode, setAwardCreateMode] = useState<'single' | 'bulk'>('single');
  const [bulkMonth, setBulkMonth] = useState('06');
  const [bulkYear, setBulkYear] = useState('2026');

  const [assignAwardId, setAssignAwardId] = useState('');
  const [assignHostId, setAssignHostId] = useState('');
  const [assignRoleFilter, setAssignRoleFilter] = useState('All');
  const [awardStartDate, setAwardStartDate] = useState('');
  const [awardEndDate, setAwardEndDate] = useState('');
  const [isAssigningAward, setIsAssigningAward] = useState(false);

  useEffect(() => {
    if (assignAwardId) {
      const match = awards.find(a => a.id === assignAwardId);
      if (match) {
        setAwardStartDate(match.startDate || '');
        setAwardEndDate(match.endDate || '');
      }
    } else {
      setAwardStartDate('');
      setAwardEndDate('');
    }
  }, [assignAwardId, awards]);

  const [proposingAltReq, setProposingAltReq] = useState<LivehouseRequest | null>(null);
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('');
  const [altReason, setAltReason] = useState('');

  const loadData = async () => {
    try {
      const h = await FirebaseService.getHosts();
      setHosts(h);
      const t = await FirebaseService.getTasks();
      setTasks(t);
      const a = await FirebaseService.getAwards();
      setAwards(a);
      const aa = await FirebaseService.getAwardAssignments();
      setAwardAssignments(aa);
      const lr = await FirebaseService.getLivehouses();
      setLivehouseRequests(lr.filter(r => r.status !== 'Completed'));
      const mn = await FirebaseService.getManagerNotes();
      setManagerNotes(mn);
      const es = await FirebaseService.getTopNinersSummary(selectedMonth);
      setEarningsSummaries(es);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to load operations data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

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

  // TASKS
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDescription || !taskDueDateVal) return;
    setIsSubmittingTask(true);
    
    const newTask: Task = {
      taskId: crypto.randomUUID(),
      assignedToUserId: 'agency_wide', // Defaulting for simple task form
      relatedPoppoId: '',
      taskType: 'Operational',
      title: taskTitle,
      description: taskDescription,
      status: 'Assigned',
      dueDate: taskDueDateVal
    };

    try {
      await FirebaseService.saveTasks([newTask]);
      await auditLogAction('CREATE_TASK', null, newTask);
      showSuccess('Task assigned to agency queue.');
      setTaskTitle('');
      setTaskDescription('');
      loadData();
    } catch (err: any) {
      setErrorMessage("Failed to delegate task: " + (err.message || String(err)));
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleDirectorDeleteTask = async (taskId: string) => {
    if (!confirm('Hard delete this task assignment?')) return;
    try {
      await FirebaseService.deleteTask(taskId);
      showSuccess('Task removed.');
      loadData();
    } catch (err: any) {
      setErrorMessage("Failed to delete task: " + (err.message || String(err)));
    }
  };

  const handleCreateAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAwardName || !newAwardStartDate || !newAwardEndDate) return;
    setIsCreatingAward(true);
    try {
      const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const award: AwardBadge = {
        id: awardId,
        name: newAwardName,
        color: newAwardColor,
        startDate: newAwardStartDate,
        endDate: newAwardEndDate,
        createdAt: new Date().toISOString()
      };
      await FirebaseService.saveAwards([award]);
      showSuccess('Custom award tag created.');
      setNewAwardName('');
      setNewAwardStartDate('');
      setNewAwardEndDate('');
      loadData();
    } catch (err: any) {
      setErrorMessage('Failed to create award: ' + (err.message || String(err)));
    } finally {
      setIsCreatingAward(false);
    }
  };

  const handleBulkGenerateAwards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMonth || !bulkYear) return;
    setIsCreatingAward(true);
    try {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthIndex = parseInt(bulkMonth, 10) - 1;
      const monthName = months[monthIndex];
      const yearNum = parseInt(bulkYear, 10);

      // Compute start and end dates
      const pad = (n: number) => String(n).padStart(2, '0');
      const startDateStr = `${yearNum}-${pad(bulkMonth)}-01`;
      
      const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
      const endDateStr = `${yearNum}-${pad(bulkMonth)}-${pad(lastDay)}`;

      const newAwardsList: AwardBadge[] = [];

      for (let rank = 1; rank <= 9; rank++) {
        const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        
        let color = 'Gold';
        if (rank >= 4 && rank <= 6) color = 'Orange';
        else if (rank >= 7) color = 'Red';

        const newAward: AwardBadge = {
          id: awardId,
          name: `Top ${rank} Niner - ${monthName} ${bulkYear}`,
          color,
          startDate: startDateStr,
          endDate: endDateStr,
          createdAt: new Date().toISOString()
        };

        newAwardsList.push(newAward);
      }

      await FirebaseService.saveAwards(newAwardsList);
      await FirebaseService.logSystemActivity(`Director/Admin bulk generated Monthly Top Niners awards templates for ${monthName} ${bulkYear}`, 'Info');
      
      showSuccess(`Successfully generated 9 Monthly Top Niner awards for ${monthName} ${bulkYear}!`);
      loadData();
    } catch (err: any) {
      setErrorMessage('Failed to bulk generate awards: ' + (err.message || String(err)));
    } finally {
      setIsCreatingAward(false);
    }
  };

  const handleAssignAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignAwardId || !assignHostId || !awardStartDate || !awardEndDate) return;
    setIsAssigningAward(true);
    try {
      const award = awards.find(a => a.id === assignAwardId);
      const host = hosts.find(h => h.id === assignHostId);
      if (!award || !host) throw new Error('Invalid selection');

      const assignmentId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const assignment: AwardAssignment = {
        id: assignmentId,
        awardId: award.id,
        awardName: award.name,
        awardColor: award.color,
        hostId: host.id,
        hostNickname: host.nickname || host.name,
        startDate: awardStartDate,
        endDate: awardEndDate,
        assignedAt: new Date().toISOString()
      };
      await FirebaseService.saveAwardAssignments([assignment]);
      showSuccess('Award tag assigned to member.');
      setAssignHostId('');
      loadData();
    } catch (err: any) {
      setErrorMessage('Failed to assign award: ' + (err.message || String(err)));
    } finally {
      setIsAssigningAward(false);
    }
  };

  const handleRevokeAssignment = async (id: string) => {
    if (!confirm('Revoke this award tag assignment?')) return;
    try {
      await FirebaseService.deleteAwardAssignment(id);
      showSuccess('Award tag revoked.');
      loadData();
    } catch (err: any) {
      setErrorMessage('Failed to revoke award: ' + (err.message || String(err)));
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
          {(['tasks', 'awards', 'feedback', 'livehouse'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                activeTab === tab ? "bg-indigo-600 text-white shadow-md font-extrabold border border-white/5" : "text-[#A09E9A] hover:text-[#F0EFE8]"
              )}
            >
              {tab === 'tasks' ? 'Task Board' : tab === 'awards' ? 'Awards Desk' : tab === 'feedback' ? 'Feedbacks' : 'Livehouse'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'tasks' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="tech-card h-fit space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-white/5 pb-2">Delegate New Task</h4>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Task Title</label>
                    <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Boost solo live hours" className="w-full glass-input text-xs" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Guidelines</label>
                    <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Provide steps..." className="w-full glass-input text-xs h-24 resize-none" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Due Date</label>
                    <SingleDatePicker id="due-date" name="dueDate" value={taskDueDateVal} onChange={setTaskDueDateVal} required />
                  </div>
                  <button type="submit" disabled={isSubmittingTask} className="w-full py-2.5 btn-gold rounded-xl text-xs font-black uppercase text-[#0D0D14]">
                    {isSubmittingTask ? 'Assigning...' : 'Delegate Task'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 tech-card">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-white/5 mb-4">Active Agency Tasks</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase">
                        <th className="px-4 py-3">Host/Assignee</th>
                        <th className="px-4 py-3">Task Details</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tasks.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-[#A09E9A]/20">No active delegated tasks.</td></tr>
                      ) : (
                        tasks.map(t => (
                          <tr key={t.taskId}>
                            <td className="px-4 py-3 font-mono text-indigo-400 font-bold">{t.assigneeId || t.assignedToUserId}</td>
                            <td className="px-4 py-3"><div className="font-bold text-[#F0EFE8]">{t.title}</div><div className="text-[10px] text-[#A09E9A]/50">{t.taskType}</div></td>
                            <td className="px-4 py-3 font-mono text-[#A09E9A]/80">{t.dueDate}</td>
                            <td className="px-4 py-3"><span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">{t.status}</span></td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => handleDirectorDeleteTask(t.taskId)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'awards' && (
            <div className="space-y-8">
              {/* Row 1: Forms Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Block 1: Create Award Form */}
                <div className="tech-card space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Create Award Badge</h4>
                    <div className="flex gap-1 bg-[#0D0D14] p-1 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setAwardCreateMode('single')}
                        className={cn("px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                          awardCreateMode === 'single' ? "bg-indigo-600 text-white shadow-sm font-extrabold" : "text-[#A09E9A] hover:text-[#F0EFE8]")}
                      >
                        Single
                      </button>
                      <button
                        type="button"
                        onClick={() => setAwardCreateMode('bulk')}
                        className={cn("px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                          awardCreateMode === 'bulk' ? "bg-indigo-600 text-white shadow-sm font-extrabold" : "text-[#A09E9A] hover:text-[#F0EFE8]")}
                      >
                        Bulk Top 9
                      </button>
                    </div>
                  </div>

                  {awardCreateMode === 'single' ? (
                    <form onSubmit={handleCreateAward} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Award Title</label>
                        <input type="text" value={newAwardName} onChange={e => setNewAwardName(e.target.value)} placeholder="e.g. Star Host" className="w-full glass-input text-xs" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Tag Style Color</label>
                        <select value={newAwardColor} onChange={e => setNewAwardColor(e.target.value)} className="w-full glass-input text-xs">
                          <option value="Gold">🏆 Gold</option>
                          <option value="Purple">⭐ Purple</option>
                          <option value="Emerald">💚 Emerald</option>
                          <option value="Blue">💙 Blue</option>
                          <option value="Red">❤️ Red</option>
                          <option value="Orange">🧡 Orange</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Effectivity Period</label>
                        <div className="grid grid-cols-2 gap-3">
                          <SingleDatePicker id="new-start" name="newStart" value={newAwardStartDate} onChange={setNewAwardStartDate} required />
                          <SingleDatePicker id="new-end" name="newEnd" value={newAwardEndDate} onChange={setNewAwardEndDate} required />
                        </div>
                      </div>
                      <button type="submit" disabled={isCreatingAward} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md">
                        {isCreatingAward ? 'Creating...' : 'Create Award'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleBulkGenerateAwards} className="space-y-4 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Month</label>
                        <select
                          value={bulkMonth}
                          onChange={(e) => setBulkMonth(e.target.value)}
                          className="w-full glass-input text-xs cursor-pointer"
                        >
                          <option value="01">January</option>
                          <option value="02">February</option>
                          <option value="03">March</option>
                          <option value="04">April</option>
                          <option value="05">May</option>
                          <option value="06">June</option>
                          <option value="07">July</option>
                          <option value="08">August</option>
                          <option value="09">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Year</label>
                        <select
                          value={bulkYear}
                          onChange={(e) => setBulkYear(e.target.value)}
                          className="w-full glass-input text-xs cursor-pointer"
                        >
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                          <option value="2028">2028</option>
                          <option value="2029">2029</option>
                          <option value="2030">2030</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={isCreatingAward}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                      >
                        {isCreatingAward ? 'Generating...' : 'Bulk Generate Top 9 Badges'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Block 2: Assign Custom Award Form */}
                <div className="tech-card space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-white/5">Assign Custom Award</h4>
                  <form onSubmit={handleAssignAward} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Created Award</label>
                      <select value={assignAwardId} onChange={e => setAssignAwardId(e.target.value)} className="w-full glass-input text-xs" required>
                        <option value="">-- Select Award --</option>
                        {awards.map(a => <option key={a.id} value={a.id}>{a.name} ({a.color})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Filter by Role</label>
                      <select value={assignRoleFilter} onChange={e => setAssignRoleFilter(e.target.value)} className="w-full glass-input text-xs">
                        <option value="All">All Roles (Excl. Director)</option>
                        <option value="Host">Host / Talent</option>
                        <option value="Manager">Manager</option>
                        <option value="Agent">Agent</option>
                        <option value="Admin">Admin</option>
                        <option value="Head Admin">Head Admin</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Member</label>
                      <select value={assignHostId} onChange={e => setAssignHostId(e.target.value)} className="w-full glass-input text-xs" required>
                        <option value="">-- Choose Member --</option>
                        {filteredAssignHosts.map(h => <option key={h.id} value={h.id}>{h.nickname || h.name} - {h.id} ({String(h.role || 'Host').toUpperCase()})</option>)}
                      </select>
                    </div>
                    {assignAwardId && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Effectivity Period (Inherited from template)</label>
                        <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-lg border border-white/5 text-xs text-[#F0EFE8] font-mono">
                          <div>
                            <span className="text-[8px] text-[#A09E9A] block uppercase mb-0.5">Start Date</span>
                            {awardStartDate || 'N/A'}
                          </div>
                          <div>
                            <span className="text-[8px] text-[#A09E9A] block uppercase mb-0.5">End Date</span>
                            {awardEndDate || 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                    <button type="submit" disabled={isAssigningAward} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">
                      {isAssigningAward ? 'Assigning...' : 'Assign Award Badge'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Block 3: Split View List of Awards */}
              <div className="tech-card grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pane 1: Created Awards (Available for Assignment) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-[#D4AF37]/20 flex items-center justify-between">
                    <span>Available Awards (Templates)</span>
                    <span className="text-[10px] text-[#A09E9A]/60 font-mono">{awards.length} created</span>
                  </h4>
                  <div className="overflow-y-auto max-h-[400px] custom-scrollbar space-y-3 pr-2">
                    {awards.length === 0 ? (
                      <p className="text-xs text-[#A09E9A]/30 italic py-6 text-center">No awards badges created yet.</p>
                    ) : (
                      awards.map(a => {
                        let labelStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        if (a.color === 'Purple') labelStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                        else if (a.color === 'Emerald') labelStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        else if (a.color === 'Blue') labelStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        else if (a.color === 'Red') labelStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                        else if (a.color === 'Orange') labelStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

                        return (
                          <div key={a.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-white/[0.08]">
                            <div className="space-y-1 min-w-0">
                              <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-widest", labelStyle)}>
                                {a.name}
                              </span>
                              <div className="text-[10px] text-[#A09E9A] font-mono mt-1">
                                Period: {a.startDate || 'N/A'} to {a.endDate || 'N/A'}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setAssignAwardId(a.id);
                                document.getElementById('assign-host-id')?.focus();
                              }}
                              className="text-[9px] font-black uppercase text-[#D4AF37] hover:bg-[#D4AF37]/10 px-3 py-1.5 border border-[#D4AF37]/35 rounded-xl transition-all whitespace-nowrap"
                            >
                              Assign Award
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Pane 2: Active Award Assignments */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-[#D4AF37]/20 flex items-center justify-between">
                    <span>Active Award Assignments</span>
                    <span className="text-[10px] text-[#A09E9A]/60 font-mono">{awardAssignments.length} assigned</span>
                  </h4>
                  <div className="overflow-y-auto max-h-[400px] custom-scrollbar space-y-3 pr-2">
                    {awardAssignments.length === 0 ? (
                      <p className="text-xs text-[#A09E9A]/30 italic py-6 text-center">No awards currently assigned.</p>
                    ) : (
                      awardAssignments.map(a => {
                        let labelStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        if (a.awardColor === 'Purple') labelStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                        else if (a.awardColor === 'Emerald') labelStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        else if (a.awardColor === 'Blue') labelStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        else if (a.awardColor === 'Red') labelStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                        else if (a.awardColor === 'Orange') labelStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

                        return (
                          <div key={a.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-white/[0.08]">
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-bold text-[#F0EFE8] truncate">{a.hostNickname}</p>
                              <p className="text-[9px] text-[#A09E9A]/60 font-mono">ID: {a.hostId}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider", labelStyle)}>
                                  {a.awardName}
                                </span>
                                <span className="text-[10px] text-white/40 font-mono">
                                  {a.startDate} to {a.endDate}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeAssignment(a.id)}
                              className="text-[9px] font-black uppercase text-red-400 hover:bg-red-500/10 px-3 py-1.5 border border-red-500/35 rounded-xl transition-all whitespace-nowrap"
                            >
                              Revoke
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
