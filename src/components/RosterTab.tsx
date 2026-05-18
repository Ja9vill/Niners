import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Shield, MessageSquare, X, ListTodo, CheckCircle, TrendingUp, Users, Loader2 } from 'lucide-react';
import { Host, Position, BaseSalaryTier, HostStatus, AnchorType, TaskStatus, Tier, DirectorNote } from '../types';
import { Storage } from '../lib/storage';
import { SheetService } from '../lib/sheetService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';

const POSITIONS: Position[] = ['Talent', 'Manager', 'Admin', 'Head Admin', 'Director', 'Sub Agent', 'Police Admin'];
const STATUSES: HostStatus[] = ['Active', 'Inconsistent', 'Released', 'Inactive'];
const ANCHORS: AnchorType[] = ['Nine Agency', 'Sub Agency', 'External'];
const TEAMS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Director Only'];

export const RosterTab = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const auth = Storage.getAuthState();

  useEffect(() => {
    if (!isAdding && !editingHost) {
      setUploadedPhoto(null);
    }
  }, [isAdding, editingHost]);

  const [viewingNotes, setViewingNotes] = useState<string | null>(null);
  const [hostNotes, setHostNotes] = useState<DirectorNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [viewingTasks, setViewingTasks] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  const loadNotes = async (id: string) => {
    setIsLoadingNotes(true);
    try {
      const data = await SheetService.getNotesByHost(id);
      setHostNotes(data as DirectorNote[]);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  React.useEffect(() => {
    if (viewingNotes) {
      loadNotes(viewingNotes);
    } else {
      setHostNotes([]);
    }
  }, [viewingNotes]);

  const isDirector = auth.role === 'Director';

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await SheetService.getRoster();
        setHosts(data);
      } catch (err) {
        console.error("Failed to load roster:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const handleDataUpdate = () => {
      load();
    };

    window.addEventListener('data-updated', handleDataUpdate);
    return () => window.removeEventListener('data-updated', handleDataUpdate);
  }, []);

  const checkPassword = (type: 'Director' | 'Leadership') => {
    const password = prompt(`Which password are you using: 031907 or 19381364?`);
    const expected = type === 'Director' ? '031907' : '19381364';
    if (password === expected) return true;
    alert('Access Denied: Incorrect password for this role.');
    return false;
  };

  const handleSaveNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!viewingNotes) return;
    
    const formData = new FormData(e.currentTarget);
    const content = formData.get('note') as string;
    
    try {
      if (editingNoteId) {
        const note = hostNotes.find(n => n.id === editingNoteId);
        if (note) {
          await SheetService.saveNote({ ...note, content });
          Storage.addLog('Roster', `Updated note for host #${viewingNotes}`, auth.name);
        }
        setEditingNoteId(null);
        setEditNoteContent('');
      } else {
        const newNote = {
          id: crypto.randomUUID(),
          hostId: viewingNotes,
          type: 'Note',
          content,
          createdAt: new Date().toISOString()
        };
        
        await SheetService.saveNote(newNote);
        Storage.addLog('Roster', `Added note to host #${viewingNotes}`, auth.name);
      }
      loadNotes(viewingNotes);
      e.currentTarget.reset();
    } catch (err) {
      alert("Failed to save note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!viewingNotes || !confirm('Delete this note?')) return;
    try {
      await SheetService.deleteNote(noteId);
      Storage.addLog('Roster', `Deleted note from host #${viewingNotes}`, auth.name);
      loadNotes(viewingNotes);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const startEditingNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditNoteContent(content);
  };

  const handleSaveTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!viewingTasks) return;
    const formData = new FormData(e.currentTarget);
    const title = formData.get('task') as string;
    
    const newTask = {
      id: crypto.randomUUID(),
      hostId: viewingTasks,
      title,
      description: '',
      status: 'To Do' as const,
      assignedBy: auth.name,
      createdAt: new Date().toISOString()
    };
    
    const current = Storage.getTasks(viewingTasks);
    Storage.setTasks(viewingTasks, [newTask, ...current]);
    Storage.addLog('Roster', `Assigned task to host #${viewingTasks}`, auth.name);
    
    const host = hosts.find(h => h.id === viewingTasks);
    Storage.addNotification({
      title: 'Task Assigned',
      message: `Task "${title}" assigned to ${host?.name || viewingTasks}`,
      type: 'info'
    });

    e.currentTarget.reset();
  };

  const handleUpdateTaskStatus = (hostId: string, taskId: string, status: TaskStatus) => {
    const current = Storage.getTasks(hostId);
    const updated = current.map(t => t.id === taskId ? { ...t, status } : t);
    Storage.setTasks(hostId, updated);
    
    if (status === 'Completed') {
      const task = current.find(t => t.id === taskId);
      Storage.addNotification({
        title: 'Task Completed',
        message: `Task "${task?.title}" completed for ${hosts.find(h => h.id === hostId)?.name || hostId}`,
        type: 'success'
      });
    }

    setHosts([...hosts]); // Force refresh
  };

  const filteredHosts = hosts.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.id.includes(searchTerm)
  );

  const leadership = hosts.filter(h => ['Director', 'Head Admin', 'Admin', 'Manager', 'Police Admin'].includes(h.position));
  const talents = filteredHosts.filter(h => h.position === 'Talent');

  const [sortConfig, setSortConfig] = useState<{ key: keyof Host | 'role'; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof Host | 'role') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTalents = [...talents].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue = a[key as keyof Host];
    let bValue = b[key as keyof Host];
    
    if (aValue === undefined) aValue = '';
    if (bValue === undefined) bValue = '';

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const photoUrl = uploadedPhoto || (formData.get('photoUrl') as string);

    const newHost: Host = {
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      nickname: formData.get('nickname') as string || (formData.get('name') as string),
      position: formData.get('position') as Position,
      role: formData.get('position') as Position,
      team: formData.get('team') as string,
      manager: formData.get('manager') as string,
      anchor_type: formData.get('anchor_type') as AnchorType,
      base_salary_category: formData.get('base_salary_category') as BaseSalaryTier,
      status: formData.get('status') as HostStatus,
      level: Number(formData.get('level') || editingHost?.level || 1),
      tier: (formData.get('tier') as Tier) || editingHost?.tier || 'X',
      photoUrl: photoUrl,
      description: formData.get('description') as string,
      // Authentication
      password: editingHost?.password || '1212', // Temporary default
      is_temp_password: editingHost ? editingHost.is_temp_password : true,
      created_at: editingHost?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let updated;
    try {
      if (editingHost) {
        await SheetService.updateHost(newHost);
        updated = hosts.map(h => h.id === editingHost.id ? newHost : h);
        Storage.addLog('Roster', `Updated member ${newHost.name} (#${newHost.id})`, auth.name);
      } else {
        if (hosts.find(h => h.id === newHost.id)) {
          alert('Poppo ID already exists in Roster');
          return;
        }
        await SheetService.saveHosts([newHost]);
        updated = [...hosts, newHost];
        Storage.addLog('Roster', `Provisioned new member ${newHost.name} (#${newHost.id})`, auth.name);
      }

      setHosts(updated);
      setIsAdding(false);
      setEditingHost(null);
      setUploadedPhoto(null);
    } catch (err) {
      alert("Save failed: " + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Max 5MB.');
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimensions for profile photo
            const MAX_SIZE = 400;
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to JPEG
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUploadedPhoto(base64);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to process image. Please try another one.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const h = hosts.find(x => x.id === id);
      if (h) {
        await SheetService.updateHost({ ...h, status: 'Released' });
        const updated = hosts.filter(host => host.id !== id);
        setHosts(updated);
        Storage.addLog('Roster', `Released member ${h.name} (#${id})`, auth.name);
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  if (isLoading) return <div className="p-20 text-center text-white/20 italic">Loading Roster MasterSheet...</div>;

  return (
    <div className="space-y-8">
      {leadership.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Shield size={14} className="text-indigo-400" />
            Leadership & Administration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leadership.map(m => (
              <div key={m.id} className="glass-card !p-4 flex items-center gap-4 group bg-[#0F1117]">
                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0 border border-white/5">
                  {m.photoUrl ? (
                    <img src={m.photoUrl || undefined} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    m.name?.[0] || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate text-sm">{m.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{m.position}</span>
                  </div>
                </div>
                <button onClick={() => { setEditingHost(m); setIsAdding(true); }} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 rounded transition-all">
                  <Edit2 size={12} className="text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {hosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-dashed">
          <Users size={48} className="text-white/5 mb-4" />
          <h3 className="text-lg font-bold text-white/40">MasterSheet Empty</h3>
          <p className="text-xs text-white/20 max-w-xs mb-6">Initialize the agency by adding members or uploading a host roster in the Director Hub.</p>
          <button onClick={() => setIsAdding(true)} className="btn-primary px-8">Provision First Member</button>
        </div>
      )}

      <section className="glass-card !p-0 overflow-hidden bg-[#0F1117] border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full sm:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input type="text" placeholder="Filter roster..." className="w-full glass-input pl-10 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setIsAdding(true)} className="btn-primary w-full sm:w-auto">Add Member</button>
        </div>

        {/* Desktop View */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>Status</th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('nickname')}>Talent Profile</th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('role')}>Role</th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('team')}>Team</th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('base_salary_category')}>Base Policy</th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('manager')}>Management</th>
                <th className="px-6 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTalents.map(host => (
                <tr key={host.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest",
                      host.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" :
                      host.status === 'Inconsistent' ? "bg-amber-500/10 text-amber-500" :
                      host.status === 'Released' ? "bg-red-500/10 text-red-500" : "bg-white/5 text-white/40"
                    )}>{host.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/20 overflow-hidden shrink-0 border border-white/5 shadow-inner">
                        {host.photoUrl ? (
                          <img src={host.photoUrl || undefined} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          host.nickname?.[0] || '?'
                        )}
                      </div>
                      <div>
                        <div className="font-black text-white text-sm tracking-tight">{host.nickname}</div>
                        <div className="text-[10px] font-mono text-white/20 tracking-tighter">ID: {host.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{host.role || host.position}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/10">
                      {host.team || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">
                      {host.base_salary_category || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      <span className="text-xs font-bold text-white/40">{host.manager}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { if (checkPassword(isDirector ? 'Director' : 'Leadership')) setViewingNotes(host.id); }} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-cyan-400 transition-all" title="Secret Notes"><MessageSquare size={14}/></button>
                      <button onClick={() => setViewingTasks(host.id)} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-amber-400 transition-all" title="Assign Tasks"><ListTodo size={14}/></button>
                      <button onClick={() => { if (checkPassword(isDirector ? 'Director' : 'Leadership')) { setEditingHost(host); setIsAdding(true); } }} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-indigo-400 transition-all" title="Modify Record"><Edit2 size={14}/></button>
                      <button onClick={() => { if (checkPassword(isDirector ? 'Director' : 'Leadership')) handleDelete(host.id); }} className="p-2 hover:bg-red-500/10 rounded-xl text-white/20 hover:text-red-400 transition-all" title="Purge Record"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {sortedTalents.map(host => (
            <div key={host.id} className="glass-card hover:border-indigo-500/50 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/20 overflow-hidden border border-white/5 shadow-inner">
                    {host.photoUrl ? (
                      <img src={host.photoUrl || undefined} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      host.nickname?.[0] || '?'
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-white text-base tracking-tight">{host.nickname}</h4>
                    <p className="text-[10px] font-mono text-white/30">ID: {host.id}</p>
                  </div>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest",
                  host.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" :
                  host.status === 'Inconsistent' ? "bg-amber-500/10 text-amber-500" :
                  host.status === 'Released' ? "bg-red-500/10 text-red-500" : "bg-white/5 text-white/40"
                )}>{host.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-y-3 mb-4 text-[10px]">
                <div className="space-y-1">
                  <p className="text-white/20 uppercase tracking-widest font-bold font-mono">Role</p>
                  <p className="text-white/80 font-bold">{host.role || host.position}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/20 uppercase tracking-widest font-bold font-mono">Team</p>
                  <p className="text-indigo-400 font-bold">{host.team || 'Unassigned'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/20 uppercase tracking-widest font-bold font-mono">Management</p>
                  <p className="text-white/80 font-bold">{host.manager}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/20 uppercase tracking-widest font-bold font-mono">Policy</p>
                  <p className="text-white/80 font-bold">{host.base_salary_category || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-1">
                  <button onClick={() => { if (checkPassword(isDirector ? 'Director' : 'Leadership')) setViewingNotes(host.id); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/20 hover:text-cyan-400 transition-all border border-white/5"><MessageSquare size={14}/></button>
                  <button onClick={() => setViewingTasks(host.id)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/20 hover:text-amber-400 transition-all border border-white/5"><ListTodo size={14}/></button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { if (checkPassword(isDirector ? 'Director' : 'Leadership')) { setEditingHost(host); setIsAdding(true); } }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/20 hover:text-indigo-400 transition-all border border-white/5"><Edit2 size={14}/></button>
                  <button onClick={() => { if (checkPassword(isDirector ? 'Director' : 'Leadership')) handleDelete(host.id); }} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-white/20 hover:text-red-400 transition-all border border-red-500/10"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {viewingNotes && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingNotes(null)} className="absolute inset-0 bg-navy/80 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                   <h3 className="font-bold flex items-center gap-2">
                     <MessageSquare size={18} className="text-cyan-400" />
                     Host Notes: #{viewingNotes}
                   </h3>
                   <button onClick={() => setViewingNotes(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                   {isLoadingNotes ? (
                     <div className="py-12 flex flex-col items-center gap-3">
                       <Loader2 size={24} className="animate-spin text-cyan-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Syncing Notes...</span>
                     </div>
                   ) : hostNotes.map((note, i) => (
                     <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 group">
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{note.type}</span>
                             <span className="text-[10px] text-white/20">{new Date(note.createdAt).toLocaleString()}</span>
                           </div>
                           {isDirector && (
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditingNote(note.id, note.content)} className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-cyan-400 transition-colors">
                                   <Edit2 size={10} />
                                </button>
                                <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-red-400 transition-colors">
                                   <Trash2 size={10} />
                                </button>
                             </div>
                           )}
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed italic">"{note.content}"</p>
                     </div>
                   ))}
                   {hostNotes.length === 0 && !isLoadingNotes && (
                     <p className="text-center py-8 text-white/20 italic">No notes found for this host.</p>
                   )}
                </div>
                <form onSubmit={handleSaveNote} className="p-6 border-t border-white/5 bg-navy/40">
                   <div className="flex flex-col gap-3">
                      {editingNoteId && (
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Editing Note</span>
                           <button type="button" onClick={() => { setEditingNoteId(null); setEditNoteContent(''); }} className="text-[10px] text-white/30 hover:text-white">Cancel</button>
                        </div>
                      )}
                      <div className="flex gap-2">
                         <input name="note" required value={editNoteContent} onChange={(e) => setEditNoteContent(e.target.value)} placeholder={editingNoteId ? "Update note..." : "Add a manager note..."} className="flex-1 glass-input text-xs" />
                         <button type="submit" className="btn-primary px-4 py-2 text-xs">{editingNoteId ? 'Update' : 'Add Note'}</button>
                      </div>
                   </div>
                </form>
             </motion.div>
          </div>
        )}

        {viewingTasks && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingTasks(null)} className="absolute inset-0 bg-navy/80 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                   <h3 className="font-bold flex items-center gap-2">
                     <ListTodo size={18} className="text-amber-400" />
                     Host Tasks: #{viewingTasks}
                   </h3>
                   <button onClick={() => setViewingTasks(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                   {Storage.getTasks(viewingTasks).map((task, i) => (
                     <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 group">
                        <div className="flex justify-between items-start mb-2">
                           <div className="space-y-1">
                             <p className={cn(
                               "text-sm font-bold text-white/90",
                               task.status === 'Completed' && "line-through text-white/20"
                             )}>{task.title}</p>
                             <div className="flex items-center gap-2">
                               <span className={cn(
                                 "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                                 task.status === 'Completed' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                 task.status === 'In Progress' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                 "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                               )}>{task.status}</span>
                               <span className="text-[10px] text-white/20">{new Date(task.createdAt).toLocaleDateString()}</span>
                             </div>
                           </div>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {task.status !== 'Completed' ? (
                                <>
                                  <button onClick={() => handleUpdateTaskStatus(viewingTasks!, task.id, 'In Progress')} className="p-1.5 hover:bg-amber-500/10 rounded text-amber-500" title="Mark In Progress"><TrendingUp size={12} /></button>
                                  <button onClick={() => handleUpdateTaskStatus(viewingTasks!, task.id, 'Completed')} className="p-1.5 hover:bg-emerald-500/10 rounded text-emerald-500" title="Mark Completed"><CheckCircle size={12} /></button>
                                </>
                              ) : (
                                <button onClick={() => handleUpdateTaskStatus(viewingTasks!, task.id, 'To Do')} className="p-1.5 hover:bg-white/10 rounded text-white/30 text-[10px] font-bold">Reset</button>
                              )}
                           </div>
                        </div>
                     </div>
                   ))}
                   {Storage.getTasks(viewingTasks).length === 0 && (
                     <p className="text-center py-8 text-white/20 italic">No tasks assigned yet.</p>
                   )}
                </div>
                <form onSubmit={handleSaveTask} className="p-6 border-t border-white/5 bg-navy/40">
                   <div className="flex gap-2">
                      <input name="task" required placeholder="Assign a new task..." className="flex-1 glass-input text-xs" />
                      <button type="submit" className="btn-primary px-4 py-2 text-xs whitespace-nowrap">Assign Task</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setEditingHost(null); }} className="absolute inset-0 bg-navy/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg glass rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0"><h3 className="font-bold">{editingHost ? 'Edit' : 'Add'} Member</h3></div>
              <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo ID</label>
                    <input name="id" defaultValue={editingHost?.id} required disabled={!!editingHost} className="w-full glass-input" placeholder="e.g. 7721054" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Nickname</label>
                    <input name="nickname" defaultValue={editingHost?.nickname} required className="w-full glass-input" placeholder="Display Name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Full Name</label>
                    <input name="name" defaultValue={editingHost?.name} required className="w-full glass-input" placeholder="Legal Name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Position / Role</label>
                    <select name="position" defaultValue={editingHost?.position} className="w-full glass-input font-bold">
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Team Assignment</label>
                    <select name="team" defaultValue={editingHost?.team} className="w-full glass-input font-bold">
                      {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Manager</label>
                    <select name="manager" defaultValue={editingHost?.manager} className="w-full glass-input font-bold">
                      {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Salary Category</label>
                    <select name="base_salary_category" defaultValue={editingHost?.base_salary_category} className="w-full glass-input font-bold">
                      {BASE_SALARY_POLICIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Current Status</label>
                    <select name="status" defaultValue={editingHost?.status} className="w-full glass-input font-bold">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Anchor Type</label>
                    <select name="anchor_type" defaultValue={editingHost?.anchor_type} className="w-full glass-input font-bold">
                      {ANCHORS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo Level</label>
                    <input name="level" type="number" defaultValue={editingHost?.level || 1} className="w-full glass-input font-bold" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Profile Photo (Upload or URL)</label>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden" 
                          id="photo-upload-input" 
                        />
                        <label 
                          htmlFor="photo-upload-input" 
                          className="w-full h-12 glass-input flex items-center justify-center gap-3 cursor-pointer hover:bg-white/5 transition-all text-xs font-bold text-white/60"
                        >
                          <Plus size={16} />
                          Upload Binary Photo
                        </label>
                        <div className="relative">
                          <input 
                            name="photoUrl" 
                            id="photo-url-input" 
                            defaultValue={editingHost?.photoUrl} 
                            className="w-full glass-input" 
                            placeholder="Or paste external URL..." 
                            onChange={(e) => {
                              if (e.target.value) setUploadedPhoto(null);
                            }}
                          />
                          {(uploadedPhoto || editingHost?.photoUrl) && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setUploadedPhoto(null);
                                const input = document.getElementById('photo-url-input') as HTMLInputElement;
                                if (input) input.value = '';
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-400/60 hover:text-red-400"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl relative group">
                        <img 
                          src={uploadedPhoto || editingHost?.photoUrl || undefined} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=preview';
                          }}
                        />
                        {uploadedPhoto && (
                          <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-black text-white uppercase tracking-tighter bg-indigo-600 px-1 rounded">New Upload</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Description / Biography</label>
                    <textarea name="description" defaultValue={editingHost?.description} className="w-full glass-input h-24 resize-none" placeholder="Details about host background..." />
                  </div>
                </div>
                <div className="pt-4 flex gap-4 shrink-0">
                   <button type="button" onClick={() => { setIsAdding(false); setEditingHost(null); }} className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest border border-white/5">Cancel</button>
                   <button type="submit" className="flex-[2] btn-primary py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20">{editingHost ? 'Commit Changes' : 'Add Member'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
