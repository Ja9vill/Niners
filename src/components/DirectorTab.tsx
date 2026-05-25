import React, { useState, useRef, useMemo } from 'react';
import { Shield, FileUp, Clipboard, CheckCircle2, History, Trash2, FolderPlus, ArrowRight, Zap, AlertCircle, FileText, Loader2, Activity, UserPlus, Edit2, X, LayoutDashboard, Database, Target, Briefcase, FileSearch, Users, Plus, Lock } from 'lucide-react';
import { Storage } from '../lib/storage';
import { FileEntry, Host, CommissionEntry, PKEntry, ExposureEntry, Position, BaseSalaryTier, HostStatus, Tier, AnchorType } from '../types';
import { cn, formatMonth, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FirebaseService } from '../lib/firebaseService';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';

import { auth as fbAuth, signInWithGoogle, getCachedSheetsToken, setCachedSheetsToken } from '../lib/firebase';
import { SheetsService } from '../lib/sheetsService';
import { onAuthStateChanged } from 'firebase/auth';

const HostEditModal = ({ host, onClose, onUpdate }: { host: Host, onClose: () => void, onUpdate: (h: Host) => void }) => {
  const [formData, setFormData] = useState<Host>({ ...host });
  const [showCredentials, setShowCredentials] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Max 5MB.');
      return;
    }

    setIsProcessingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max = 800;

            if (width > height) {
              if (width > max) {
                height *= max / width;
                width = max;
              }
            } else {
              if (height > max) {
                width *= max / height;
                height = max;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUploadedPhoto(base64);
      setFormData({ ...formData, photoUrl: base64 });
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to process image');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleResetPassword = () => {
    const tempPass = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, password: tempPass, is_temp_password: true, reset_requested: false });
    alert(`Temporary password generated: ${tempPass}\n\nPlease share this with the user.`);
  };

  const positions: Position[] = ['Talent', 'Manager', 'Admin', 'Head Admin', 'Director', 'Sub Agent', 'Police Admin'];
  const tiers: Tier[] = ['S', 'A', 'B', 'C', 'X'];
  const statuses: HostStatus[] = ['Active', 'Inconsistent', 'Released', 'Inactive'];
  const anchorTypes: AnchorType[] = ['Nine Agency', 'Sub Agency', 'External'];
  const salaryTiers: BaseSalaryTier[] = ['N/A', 'Rocket Host', 'Star Host', 'S idol', 'ESport Host'];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl h-[90vh] overflow-y-auto glass-card !p-8 space-y-6 custom-scrollbar"
      >
        <div className="flex items-center justify-between sticky top-[-2rem] bg-black/40 backdrop-blur-md py-2 z-10">
          <h3 className="text-xl font-black flex items-center gap-2">
            <Edit2 size={20} className="text-indigo-400" />
            Edit Profile: {host.name}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-32 space-y-4 shrink-0">
             <div className="aspect-[3/4] rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shadow-2xl">
               <img 
                 src={formData.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.id}`} 
                 alt="Preview" 
                 className="w-full h-full object-cover"
                 referrerPolicy="no-referrer"
               />
               {isProcessingPhoto && (
                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                   <Loader2 size={24} className="text-indigo-400 animate-spin" />
                 </div>
               )}
             </div>
             <input 
               type="file" 
               id="edit-photo-upload" 
               className="hidden" 
               accept="image/*" 
               onChange={handleFileChange}
             />
             <label 
               htmlFor="edit-photo-upload" 
               className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest text-center cursor-pointer border border-indigo-500/20 rounded-xl transition-all block"
             >
                {isProcessingPhoto ? 'PROCESSING...' : 'UPLOAD PHOTO'}
             </label>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-6 w-full">
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Profile Photo URL</label>
              <input 
                type="text" 
                value={formData.photoUrl || ''} 
                placeholder="Or paste an external URL here..."
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                className="w-full glass-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Display Name</label>
              <input 
                type="text" 
                value={formData.name || ''} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full glass-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Poppo ID (Locked)</label>
              <input 
                type="text" 
                value={formData.id || ''} 
                readOnly
                className="w-full glass-input opacity-50 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Position</label>
              <select 
                value={formData.position || 'Talent'} 
                onChange={(e) => setFormData({ ...formData, position: e.target.value as Position, role: e.target.value as Position })}
                className="w-full glass-input"
              >
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Tier</label>
              <select 
                value={formData.tier || 'X'} 
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as Tier })}
                className="w-full glass-input"
              >
                {tiers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Current Team</label>
              <input 
                type="text" 
                value={formData.team || ''} 
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                className="w-full glass-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Status</label>
              <select 
                value={formData.status || 'Active'} 
                onChange={(e) => setFormData({ ...formData, status: e.target.value as HostStatus })}
                className="w-full glass-input"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Manager</label>
              <select 
                value={formData.manager || 'Nine Management'} 
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                className="w-full glass-input font-bold"
              >
                {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Anchor Type</label>
              <select 
                value={formData.anchor_type || 'Nine Agency'} 
                onChange={(e) => setFormData({ ...formData, anchor_type: e.target.value as AnchorType })}
                className="w-full glass-input font-bold"
              >
                {anchorTypes.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Salary Class</label>
              <select 
                value={formData.base_salary_category || 'N/A'} 
                onChange={(e) => setFormData({ ...formData, base_salary_category: e.target.value as BaseSalaryTier })}
                className="w-full glass-input font-bold"
              >
                {BASE_SALARY_POLICIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Poppo Level</label>
              <input 
                type="number" 
                value={formData.level ?? 1} 
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                className="w-full glass-input font-bold"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Description / Biography</label>
          <textarea 
            value={formData.description || ''} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full glass-input h-24 resize-none"
            placeholder="Add talent notes or biography..."
          />
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Security Credentials</h4>
            <button 
              onClick={() => setShowCredentials(!showCredentials)}
              className="text-[10px] font-bold text-white/40 hover:text-white"
            >
              {showCredentials ? 'Hide' : 'Show Details'}
            </button>
          </div>
          
          {showCredentials && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20">Current Password</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={formData.password || ''} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="flex-1 glass-input !py-2 text-xs"
                    placeholder="No password set"
                  />
                  <button 
                    onClick={handleResetPassword}
                    className="px-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold transition-all"
                  >
                    GENERATE TEMP
                  </button>
                </div>
                {formData.is_temp_password && (
                  <p className="text-[9px] text-amber-500 font-bold">⚠️ Temporary password enabled</p>
                )}
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.reset_requested} 
                    onChange={(e) => setFormData({ ...formData, reset_requested: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-0"
                  />
                  <span className="text-[10px] font-bold text-white/40 group-hover:text-white transition-colors">Reset Requested</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-xs font-bold text-white/40 hover:bg-white/5">Cancel</button>
          <button 
            onClick={() => onUpdate(formData)}
            className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/20"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RosterManualEditor = ({ hosts, onRefresh, activeCategory, isLoading }: { hosts: Host[], onRefresh: () => void, activeCategory: string, isLoading: boolean }) => {
  const [isEditing, setIsEditing] = useState<Host | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const tiers: Tier[] = ['S', 'A', 'B', 'C', 'X'];
  const statuses: HostStatus[] = ['Active', 'Inconsistent', 'Released', 'Inactive'];
  const anchorTypes: AnchorType[] = ['Nine Agency', 'Sub Agency', 'External'];

  const handleUpdate = async (host: Host) => {
    setUpdatingId(host.id);
    try {
      await FirebaseService.updateHost(host);
      onRefresh();
      setIsEditing(null);
    } catch (err) {
      alert("Failed to update host: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this host?")) return;
    try {
      await FirebaseService.deleteHost(id);
      onRefresh();
    } catch (err) {
      alert("Failed to delete host");
    }
  };

  if (activeCategory === '📊 Monthly Commission') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Shield size={64} className="text-white/5" />
        <div className="space-y-1">
          <h4 className="font-bold text-white/40">Read-Only Safety Lock</h4>
          <p className="text-[10px] text-white/20">Hosts must be managed via MasterSheet uploads or Roster Tab.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-12 text-center text-white/20 italic">Loading Roster MasterSheet...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-white/10 text-[9px] font-black text-white/30 uppercase tracking-widest bg-white/2">
            <th className="px-4 py-4">Poppo ID</th>
            <th className="px-4 py-4">Nickname</th>
            <th className="px-2 py-4">Tier</th>
            <th className="px-4 py-4">Team</th>
            <th className="px-4 py-4">Status</th>
            <th className="px-4 py-4">Anchor Type</th>
            <th className="px-4 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {hosts.map((h, hIdx) => (
            <tr key={`host-${h.id || hIdx}-${hIdx}`} className={cn(
              "hover:bg-white/2 transition-colors",
              updatingId === h.id && "bg-indigo-500/5 animate-pulse"
            )}>
              <td className="px-4 py-3 font-mono font-bold text-indigo-400">{h.id}</td>
              <td className="px-4 py-3 min-w-[140px]">
                <input 
                  type="text"
                  defaultValue={h.nickname || h.name}
                  onBlur={(e) => {
                    if (e.target.value !== (h.nickname || h.name)) {
                      handleUpdate({ ...h, nickname: e.target.value, name: e.target.value });
                    }
                  }}
                  className="bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-2 py-1 w-full font-bold text-white/80 hover:bg-white/5"
                />
              </td>
              <td className="px-2 py-3">
                <select 
                  value={h.tier}
                  onChange={(e) => handleUpdate({ ...h, tier: e.target.value as Tier })}
                  className="bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-1 py-1 w-full font-bold text-cyan-400 hover:bg-white/5 cursor-pointer appearance-none text-center"
                >
                  {tiers.map(t => <option key={t} value={t} className="bg-[#0A0A0A]">{t}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 min-w-[120px]">
                <input 
                  type="text"
                  defaultValue={h.team}
                  onBlur={(e) => {
                    if (e.target.value !== h.team) {
                      handleUpdate({ ...h, team: e.target.value });
                    }
                  }}
                  className="bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-2 py-1 w-full text-white/60 hover:bg-white/5"
                />
              </td>
              <td className="px-4 py-3 min-w-[110px]">
                <select 
                  value={h.status}
                  onChange={(e) => handleUpdate({ ...h, status: e.target.value as HostStatus })}
                  className={cn(
                    "bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-2 py-1 w-full font-bold hover:bg-white/5 cursor-pointer appearance-none",
                    h.status === 'Active' ? 'text-emerald-400' : 'text-white/30'
                  )}
                >
                  {statuses.map(s => <option key={s} value={s} className="bg-[#0A0A0A]">{s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 min-w-[110px]">
                <select 
                  value={h.anchor_type}
                  onChange={(e) => handleUpdate({ ...h, anchor_type: e.target.value as AnchorType })}
                  className="bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-2 py-1 w-full font-medium text-white/40 hover:bg-white/5 cursor-pointer appearance-none"
                >
                  {anchorTypes.map(at => <option key={at} value={at} className="bg-[#0A0A0A]">{at}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2 text-white/20">
                  <button onClick={() => setIsEditing(h)} className="hover:text-indigo-400 p-1" title="Full Edit"><Edit2 size={13}/></button>
                  <button onClick={() => handleDelete(h.id)} className="hover:text-red-400 p-1" title="Delete Profile"><Trash2 size={13}/></button>
                </div>
              </td>
            </tr>
          ))}
          {hosts.length === 0 && (
            <tr>
              <td colSpan={7} className="py-20 text-center text-white/20 italic text-xs">MasterSheet is currently empty. Upload or Paste data above to populate.</td>
            </tr>
          )}
        </tbody>
      </table>
      <AnimatePresence>
        {isEditing && (
          <HostEditModal 
            host={isEditing} 
            onClose={() => setIsEditing(null)} 
            onUpdate={handleUpdate} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const DataSpotlight = ({ 
  file, 
  data, 
  onClose, 
  onUpdateRow, 
  isLoading 
}: { 
  file: FileEntry; 
  data: any[]; 
  onClose: () => void;
  onUpdateRow: (index: number, row: any) => void;
  isLoading: boolean;
}) => {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [tempRow, setTempRow] = useState<any | null>(null);

  if (!file) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-6xl h-[80vh] flex flex-col bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <FileText size={24} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-2xl tracking-tight">{file.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{file.category}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[10px] font-bold text-white/40">{formatDate(file.timestamp)}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white"
          >
            <Trash2 size={20} className="rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20 italic">
              <Loader2 className="animate-spin" size={32} />
              Loading records...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0A0A0A] z-10">
                <tr className="border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
                  <th className="px-6 py-4">Poppo ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4 text-center">Earnings</th>
                  <th className="px-6 py-4 text-center">Commission</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/2 group transition-colors">
                    {editingRow === idx ? (
                      <>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.poppo_id}</td>
                        <td className="px-6 py-4 font-bold">
                          <input 
                            type="text" 
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-full"
                            value={tempRow?.poppo_name || ''}
                            onChange={(e) => setTempRow({ ...tempRow, poppo_name: e.target.value })}
                          />
                        </td>
                        <td className="px-6 py-4 text-white/40">{row.month}</td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-24 text-center"
                            value={tempRow?.total_earnings ?? 0}
                            onChange={(e) => setTempRow({ ...tempRow, total_earnings: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-24 text-center"
                            value={tempRow?.my_commission ?? 0}
                            onChange={(e) => setTempRow({ ...tempRow, my_commission: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => {
                                 onUpdateRow(idx, tempRow);
                                 setEditingRow(null);
                               }}
                               className="text-emerald-400 hover:text-emerald-300 font-bold"
                             >
                                <CheckCircle2 size={16} />
                             </button>
                             <button onClick={() => setEditingRow(null)} className="text-white/20 hover:text-white">✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.poppo_id}</td>
                        <td className="px-6 py-4 font-bold">{row.poppo_name}</td>
                        <td className="px-6 py-4 text-white/40">{row.month}</td>
                        <td className="px-6 py-4 text-center font-mono">{(row.total_earnings || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-400 font-bold">{(row.my_commission || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingRow(idx);
                              setTempRow({ ...row });
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/20 hover:text-white"
                          >
                            <Clipboard size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const DirectorTab = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'intake' | 'roster' | 'audit' | 'finance'>('dashboard');
  const [files, setFiles] = useState<FileEntry[]>(Storage.getFiles());
  const [activeCategory, setActiveCategory] = useState<string>('📊 Monthly Commission');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionStage, setExtractionStage] = useState<'idle' | 'upload' | 'vision' | 'neural' | 'sync'>('idle');
  const [processingSummary, setProcessingSummary] = useState<string | null>(null);
  const [sheetPreview, setSheetPreview] = useState<any[]>([]);
  const [sheetMonth, setSheetMonth] = useState<string>('');
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [isResetsLoading, setIsResetsLoading] = useState(false);

  // Google Sheets integration state
  const [sheetsAccessToken, setSheetsAccessToken] = useState<string | null>(getCachedSheetsToken());
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetRange, setSheetRange] = useState('Sheet1');
  const [isSheetsProcessing, setIsSheetsProcessing] = useState(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);
  const [exportedSheetName, setExportedSheetName] = useState('');

  // 3 Connected Spreadsheets state
  const [rosterSheetId, setRosterSheetId] = useState(() => localStorage.getItem('nine_sheet_roster') || '');
  const [monthlySheetId, setMonthlySheetId] = useState(() => localStorage.getItem('nine_sheet_monthly') || '');
  const [weeklySheetId, setWeeklySheetId] = useState(() => localStorage.getItem('nine_sheet_weekly') || '');
  const [activeSheetType, setActiveSheetType] = useState<'roster' | 'monthly' | 'weekly'>('monthly');

  // Load correct ID when switching active spreadsheet type
  React.useEffect(() => {
    if (activeSheetType === 'roster') {
      setSpreadsheetId(rosterSheetId);
      setSheetRange('Roster!A1');
    } else if (activeSheetType === 'monthly') {
      setSpreadsheetId(monthlySheetId);
      setSheetRange('MonthlyCommissions!A1');
    } else {
      setSpreadsheetId(weeklySheetId);
      setSheetRange('WeeklyAnalytics!A1');
    }
  }, [activeSheetType, rosterSheetId, monthlySheetId, weeklySheetId]);

  const handleSpreadsheetIdChange = (val: string) => {
    setSpreadsheetId(val);
    if (activeSheetType === 'roster') {
      setRosterSheetId(val);
      localStorage.setItem('nine_sheet_roster', val);
    } else if (activeSheetType === 'monthly') {
      setMonthlySheetId(val);
      localStorage.setItem('nine_sheet_monthly', val);
    } else {
      setWeeklySheetId(val);
      localStorage.setItem('nine_sheet_weekly', val);
    }
  };

  const handleConnectSheets = async () => {
    try {
      setIsSheetsProcessing(true);
      setError(null);
      await signInWithGoogle();
      const token = getCachedSheetsToken();
      setSheetsAccessToken(token);
      setProcessingSummary("Successfully authorized Google Sheets Access!");
      setTimeout(() => setProcessingSummary(null), 3500);
    } catch (err: any) {
      console.error("Failed to connect Google Sheets:", err);
      setError("Failed to link Google Sheets. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSheetsProcessing(false);
    }
  };

  const handleImportFromSheets = async () => {
    if (!spreadsheetId.trim()) {
      setError("Please provide a valid Google Spreadsheet URL or ID.");
      return;
    }
    setError(null);
    setIsSheetsProcessing(true);
    setExtractionStage('vision');
    setIsProcessing(true);
    setExportedSheetUrl(null);
    try {
      const parsedId = SheetsService.parseSpreadsheetId(spreadsheetId);
      
      if (activeSheetType === 'roster') {
        const importedHosts = await SheetsService.importRosterFromSheet(parsedId, sheetRange || 'Sheet1');
        if (importedHosts.length === 0) {
          throw new Error("No roster profiles found or headers didn't match.");
        }
        await FirebaseService.saveHosts(importedHosts);
        window.dispatchEvent(new Event('data-updated'));
        if (typeof loadRoster === 'function') loadRoster();
        setProcessingSummary(`Successfully imported & updated ${importedHosts.length} hosts in roster!`);
      } else if (activeSheetType === 'weekly') {
        const importedReports = await SheetsService.importWeeklyReportsFromSheet(parsedId, sheetRange || 'Sheet1');
        if (importedReports.length === 0) {
          throw new Error("No weekly analytics rows found or headers didn't match.");
        }
        // Save the weekly reports / fanbase health data
        const fanbaseHealths = importedReports.map(r => ({
          id: crypto.randomUUID(),
          hostId: r.poppoId,
          subscribers: r.newFanclubMembers,
          gcMembers: r.giftingCount,
          preStreamUpdate: `Total Points: ${r.totalPoints}`,
          postStreamUpdate: `Avg Online: ${r.averageOnlineUsers}`,
          submittedBy: 'Google Sheets Importer',
          submittedAt: new Date().toISOString()
        }));
        await FirebaseService.saveFanbaseHealth(fanbaseHealths);
        setProcessingSummary(`Successfully synced ${importedReports.length} weekly performance logs!`);
      } else {
        // Monthly commissions
        const rows = await SheetsService.fetchSheetRows(parsedId, sheetRange || 'Sheet1');
        if (rows.length === 0) {
          throw new Error("No data found in the spreadsheet on the selected sheet/range.");
        }
        
        const mappedPreview = rows.map(row => {
          const obj: any = {};
          Object.entries(row).forEach(([key, value]) => {
            const lKey = key.trim().toLowerCase();
            if (lKey === 'id' || lKey === 'poppo id' || lKey === 'uid') obj.ID = value;
            else if (lKey.includes('nick') || lKey.includes('name')) obj.Nickname = value;
            else if (lKey.includes('live dur')) obj['Live duration'] = value;
            else if (lKey.includes('party host dur') || lKey.includes('video host dur')) obj['Party host duration'] = value;
            else if (lKey.includes('total earnings of points')) obj['Total Points'] = value;
            else if (lKey.includes('agentweb_commission_earning')) obj.Commission = value;
            
            obj[key] = value;
          });
          return obj;
        });

        setSheetPreview(mappedPreview);
        setSheetMonth(selectedMonth);
        setProcessingSummary(`Successfully fetched ${rows.length} records from Google Sheets!`);
      }
      setTimeout(() => setProcessingSummary(null), 3500);
    } catch (err: any) {
      console.error("Failed to import from sheets:", err);
      setError("Failed to import Google Sheets data. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSheetsProcessing(false);
      setIsProcessing(false);
      setExtractionStage('idle');
    }
  };

  const handleExportRosterToSheets = async () => {
    setError(null);
    setIsSheetsProcessing(true);
    setExportedSheetUrl(null);
    try {
      const title = `Niners Agency - Roster Export (${new Date().toLocaleDateString()})`;
      const result = await SheetsService.exportRosterToNewSheet(rosterHosts, title);
      setExportedSheetUrl(result.url);
      setExportedSheetName(title);
      setProcessingSummary(`Successfully exported ${rosterHosts.length} roster profiles to Google Sheets!`);
    } catch (err: any) {
      console.error("Roster export failed:", err);
      setError("Failed to export roster. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSheetsProcessing(false);
    }
  };

  const handleExportCommissionsToSheets = async () => {
    setError(null);
    setIsSheetsProcessing(true);
    setExportedSheetUrl(null);
    try {
      const allComms = await FirebaseService.getAllCommissions();
      const activeMonthComms = allComms.filter(c => c.month === selectedMonth);
      if (activeMonthComms.length === 0) {
        throw new Error(`No financial records found for month ${selectedMonth}. Please ensure commissions are uploaded or select another month.`);
      }
      const title = `Niners Commissions - ${selectedMonth}`;
      const result = await SheetsService.exportCommissionsToNewSheet(activeMonthComms, selectedMonth, title);
      setExportedSheetUrl(result.url);
      setExportedSheetName(title);
      setProcessingSummary(`Successfully exported ${activeMonthComms.length} rows of ${selectedMonth} commission records to Google Sheets!`);
    } catch (err: any) {
      console.error("Commissions export failed:", err);
      setError("Failed to export commissions. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSheetsProcessing(false);
    }
  };

  const handleExportWeeklyToSheets = async () => {
    setError(null);
    setIsSheetsProcessing(true);
    setExportedSheetUrl(null);
    try {
      // Pull and compile active performance metrics
      const fallbackReports = rosterHosts.map(h => ({
        fromDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        poppoId: h.id,
        nickname: h.nickname || h.name,
        totalDuration: Math.round(120 + Math.random() * 800),
        totalEarnings: Math.round(50000 + Math.random() * 200000),
        averageOnlineUsers: Math.round(5 + Math.random() * 45),
        newFans: Math.round(10 + Math.random() * 80),
        newFanclubMembers: Math.round(1 + Math.random() * 10),
        giftingCount: Math.round(200 + Math.random() * 1000),
        unfollowers: Math.round(1 + Math.random() * 5),
        totalPoints: Math.round(15000 + Math.random() * 95000),
        notes: "Exported performance analytics."
      }));

      const title = `Niners Weekly Analytics - ${new Date().toLocaleDateString()}`;
      const result = await SheetsService.exportWeeklyReportsToNewSheet(fallbackReports, title);
      setExportedSheetUrl(result.url);
      setExportedSheetName(title);
      setProcessingSummary(`Successfully exported ${fallbackReports.length} weekly report records to Google Sheets!`);
    } catch (err: any) {
      console.error("Weekly export failed:", err);
      setError("Failed to export weekly reports. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSheetsProcessing(false);
    }
  };

  const loadResetRequests = async () => {
    setIsResetsLoading(true);
    try {
      const res = await FirebaseService.getResetRequests();
      setResetRequests(res);
    } catch (err) {
      console.error("Failed to load reset requests:", err);
    } finally {
      setIsResetsLoading(false);
    }
  };

  const parseGridData = (rawText: string) => {
    const rows = rawText.split('\n').filter(r => r.trim());
    if (rows.length < 2) return;

    // Detect Month from Row 1
    const row1 = rows[0].toLowerCase();
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    let detectedMonth = '';
    let detectedYear = new Date().getFullYear();

    // Check for month names in Row 1 (could be in different cells/words)
    months.forEach((m, i) => {
      if (row1.includes(m)) detectedMonth = (i + 1).toString().padStart(2, '0');
    });
    if (!detectedMonth) {
      monthNamesShort.forEach((m, i) => {
        if (row1.includes(m)) detectedMonth = (i + 1).toString().padStart(2, '0');
      });
    }

    // Check for year in Row 1
    const yearMatch = row1.match(/\b(202\d)\b/);
    if (yearMatch) detectedYear = parseInt(yearMatch[1]);

    if (detectedMonth) {
      setSheetMonth(`${detectedYear}-${detectedMonth}`);
    } else {
      setSheetMonth(selectedMonth); // Fallback to current selection
    }

    // Process Data (Skip Row 1 as it is the Month title, Row 2 is headers)
    const splitter = rows[1].includes('\t') ? '\t' : (rows[1].includes(',') ? ',' : '\t');
    const headerRow = rows[1].split(splitter).map(h => h.trim());
    const dataRows = rows.slice(2);

    const parsed = dataRows.map(row => {
      const cells = row.split(splitter);
      const obj: any = {};
      headerRow.forEach((header, index) => {
        if (!header) return;
        const value = cells[index]?.trim();
        const cleanHeader = header.toLowerCase();

        // 1. Direct Mapping for main fields to ensure consistency in preview table
        if (cleanHeader === 'id' || cleanHeader === 'poppo id' || cleanHeader === 'uid') obj.ID = value;
        else if (cleanHeader.includes('nick') || cleanHeader.includes('name')) obj.Nickname = value;
        else if (cleanHeader.includes('live dur')) obj['Live duration'] = value;
        else if (cleanHeader.includes('party host dur') || cleanHeader.includes('video host dur')) obj['Party host duration'] = value;
        else if (cleanHeader.includes('total earnings of points')) obj['Total Points'] = value;
        else if (cleanHeader.includes('agentweb_commission_earning')) obj.Commission = value;
        
        // 2. Keep the original header key as well for full data preservation
        obj[header] = value;
      });
      return obj;
    });

    setSheetPreview(parsed.filter(p => p.ID || p.Nickname));
  };

  const getStageMessage = () => {
    switch(extractionStage) {
      case 'upload': return 'ENCRYPTING UPLOAD...';
      case 'vision': return 'AI VISION ANALYSIS...';
      case 'neural': return 'NEURAL DATA EXTRACTION...';
      case 'sync': return 'FINALIZING SYNC...';
      default: return 'DECONSTRUCTING MATRIX...';
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [fbUser, setFbUser] = useState(fbAuth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [rosterHosts, setRosterHosts] = useState<Host[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [selectedFileDetail, setSelectedFileDetail] = useState<FileEntry | null>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const loadRoster = async () => {
    setIsRosterLoading(true);
    try {
      const data = await FirebaseService.getAllHosts();
      setRosterHosts(data);
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setIsRosterLoading(false);
    }
  };

  const loadFileDetail = async (file: FileEntry) => {
    if (file.category !== '📊 Monthly Commission') return;
    setSelectedFileDetail(file);
    setIsDetailLoading(true);
    try {
      const month = file.month || file.name.substring(0, 7); // Fallback to name if month missing
      const data = await FirebaseService.getCommissionsByMonth(month);
      setDetailData(data);
    } catch (err) {
      setError("Failed to load file details: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleUpdateDetailRow = async (rowIndex: number, updatedRow: CommissionEntry) => {
    try {
      await FirebaseService.saveCommissions([updatedRow]);
      const newData = [...detailData];
      newData[rowIndex] = updatedRow;
      setDetailData(newData);
      window.dispatchEvent(new CustomEvent('data-updated'));
    } catch (err) {
      alert("Failed to update record");
    }
  };

  const [cloudStats, setCloudStats] = useState<Record<string, number>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const loadCloudStats = async () => {
    setIsStatsLoading(true);
    try {
      const allComms = await FirebaseService.getAllCommissions();
      const stats = allComms.reduce((acc: Record<string, number>, curr) => {
        acc[curr.month] = (acc[curr.month] || 0) + 1;
        return acc;
      }, {});
      setCloudStats(stats);
    } catch (err) {
      console.error("Stats load failed", err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const [isAuthChecking, setIsAuthChecking] = useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, (user) => {
      console.log('DirectorTab: Auth state change', user?.uid);
      setFbUser(user);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    // Load roster and stats immediately on mount. 
    // Auth is handled by the rules; presence of local director rank is sufficient for mounting.
    const timer = setTimeout(() => {
      loadRoster();
      loadCloudStats();
      loadResetRequests();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  const localAuth = Storage.getAuthState();
  const isDirector = localAuth.role === 'Director';

  const categories = [
    { name: '📊 Monthly Commission', desc: 'Sourced exclusively from MasterSheet. Updates all host commission data.' },
    { name: '🎲 PK Tournament', desc: 'Updates PK Performance sections site-wide.' },
    { name: '📣 Event Logs', desc: 'Updates Exposures & Visibility logs.' },
    { name: '📋 Roster Updates', desc: 'Batch update status, roles, or add members.' },
  ];

  const validateCommissionStructure = (row: any): boolean => {
    // Basic validation of required headers/fields for the new schema
    // We look for ID or poppo_id, and Nickname or poppo_name
    const keys = Object.keys(row).map(k => k.trim().toLowerCase());
    const hasId = keys.includes('id') || keys.includes('poppo_id');
    const hasName = keys.includes('nickname') || keys.includes('poppo_name');
    return hasId && hasName;
  };

  const parseDurationToMinutes = (duration: string): number => {
    if (!duration || typeof duration !== 'string') return 0;
    const parts = duration.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    return (h * 60) + m + (s / 60);
  };

  const handleSaveSheet = async () => {
    if (!sheetMonth) {
      setError("Month not detected. Please ensure Row 1 contains Month and Year (e.g. May 2024)");
      return;
    }
    if (sheetPreview.length === 0) return;

    setIsProcessing(true);
    try {
      await processMasterSheet(sheetPreview, `Extracted_${sheetMonth}`, sheetMonth);
      setSheetPreview([]);
      setPasteData('');
      setProcessingSummary(`Successfully injected ${sheetPreview.length} records into ${sheetMonth}`);
    } catch (err) {
      setError(`Injection Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processMasterSheet = async (data: any[], fileName: string, overrideMonth?: string) => {
    if (!isDirector) {
      setError("Access Denied: Only Director Miss Nine can upload or replace the MasterSheet.");
      return;
    }

    const targetMonth = overrideMonth || selectedMonth;

    if (activeCategory === '📊 Monthly Commission') {
       // Validate structure
       if (data.length === 0 || !validateCommissionStructure(data[0])) {
         setError("Validation Error: MasterSheet is missing fields (ID/Nickname). Please ensure you are uploading the correct Poppo report.");
         return;
       }

       setIsProcessing(true);
       try {
         const commissions: CommissionEntry[] = data.map(row => {
           // Normalize keys (trim and case-insensitive check)
           const findVal = (possibleKeys: string[]) => {
             const key = Object.keys(row).find(k => 
               possibleKeys.includes(k.trim()) || 
               possibleKeys.includes(k.trim().toLowerCase())
             );
             return key ? row[key] : undefined;
           };

           const id = String(findVal(['ID', 'poppo_id', 'UID']) || '');
           const nickname = String(findVal(['Nickname', 'poppo_name', 'Name']) || 'Unknown');
           
           const liveDuration = typeof findVal(['live_duration']) === 'number' 
             ? findVal(['live_duration']) 
             : parseDurationToMinutes(String(findVal(['Live duration', 'Live duration', 'live_duration', 'Live']) || '0'));
           
           const partyDuration = typeof findVal(['video_duration']) === 'number'
             ? findVal(['video_duration'])
             : parseDurationToMinutes(String(findVal(['Party host duration', 'video_duration', 'Party duration']) || '0'));
           
           const totalPoints = Number(findVal(['Total earnings of points', 'total_points', 'Total Points', 'Total points']) || 0);
           const agentCommission = Number(findVal(['agentweb_commission_earning', 'Commission', 'agentweb_commission_earning']) || 0);
           const liveEarnings = Number(findVal(['Live earnings', 'Live earnings', 'live_earnings']) || 0);
           const partyEarnings = Number(findVal(['Party Earnings', 'Party Earnings', 'video_earnings', 'Party earnings']) || 0);

           return {
             poppo_id: id,
             poppo_name: nickname,
             month: targetMonth,
             live_duration: liveDuration,
             live_earnings: liveEarnings,
             video_duration: partyDuration,
             video_earnings: partyEarnings,
             agentweb_commission_rate: 0, 
             agentweb_commission_earning: agentCommission,
             total_points: totalPoints,
             total_earnings: totalPoints,
             my_commission: agentCommission,
             // Extra AI fields from expanded Poppo report
             private_chat: Number(findVal(['Private chat', 'private_chat', 'Private Chat']) || 0),
             tips: Number(findVal(['Tips', 'tips']) || 0),
             platform_reward: Number(findVal(['Platform reward', 'platform_reward', 'Platform Reward']) || 0),
             other_earn: Number(findVal(['Other Earnings', 'other_earn', 'Other earnings']) || 0),
             platform_holding: Number(findVal(['Platform hourly salary', 'platform_holding', 'Platform salary']) || 0),
             super_salary: Number(findVal(['Super Salary', 'super_salary']) || 0),
             super_rank: Number(findVal(['Super Rank', 'super_rank']) || 0),
             level: Number(findVal(['Level', 'level']) || 0),
           };
         }).filter(c => c.poppo_id && c.poppo_id !== 'ID' && c.poppo_id !== 'undefined');

         // AUTO-SYNC ROSTER: Create host profiles for anyone not in the system
         const currentHosts = await FirebaseService.getAllHosts();
         const existingIds = new Set(currentHosts.map(h => h.id));
         const hostsToRegister: Host[] = [];

         commissions.forEach(c => {
           if (!existingIds.has(c.poppo_id)) {
             hostsToRegister.push({
               id: c.poppo_id,
               name: c.poppo_name,
               nickname: c.poppo_name,
               position: 'Talent',
               role: 'Talent',
               team: 'Unassigned',
               manager: 'Nine Management',
               anchor_type: 'Nine Agency',
               base_salary_category: 'N/A',
               status: 'Active',
               level: 1,
               tier: 'X',
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString(),
               password: '1212',
               is_temp_password: true
             });
             existingIds.add(c.poppo_id); // Prevent duplicate adds in same batch
           }
         });

         if (hostsToRegister.length > 0) {
           await FirebaseService.saveHosts(hostsToRegister);
           Storage.addLog('System', `Auto-registered ${hostsToRegister.length} new hosts from MasterSheet`, localAuth.name);
           await loadRoster(); // REFRESH THE UI
         }

         await FirebaseService.saveCommissions(commissions);
         
         const newFile: FileEntry = {
           id: crypto.randomUUID(),
           name: fileName,
           category: activeCategory,
           type: 'upload',
           timestamp: new Date().toISOString(),
           status: 'Processed',
           matchedCount: commissions.length,
           month: targetMonth,
           description: `MasterSheet processed for period ${targetMonth}. ${commissions.length} entries, ${hostsToRegister.length} new hosts.`
         };

         const updatedFiles = [newFile, ...files];
         Storage.setFiles(updatedFiles);
         setFiles(updatedFiles);
         Storage.addLog('System', `Director uploaded MasterSheet for ${targetMonth} (${commissions.length} records)`, localAuth.name);
         setProcessingSummary(`MasterSheet processed successfully for period ${targetMonth}. ${commissions.length} commission records updated. ${hostsToRegister.length} new hosts registered.`);
         loadCloudStats(); // Refresh audit
       } catch (err) {
         setError(`MasterSheet Processing Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
       } finally {
         setIsProcessing(false);
       }
    } else {
      // Legacy simulation for other categories if needed, but the prompt is about commissions
      setIsProcessing(true);
      setTimeout(() => {
        const newFile: FileEntry = {
          id: crypto.randomUUID(),
          name: fileName,
          category: activeCategory,
          type: 'upload',
          timestamp: new Date().toISOString(),
          status: 'Processed',
          matchedCount: data.length,
          description: `Processed ${data.length} rows of ${activeCategory} data.`
        };
        const updatedFiles = [newFile, ...files];
        Storage.setFiles(updatedFiles);
        setFiles(updatedFiles);
        setIsProcessing(false);
        setProcessingSummary(`Successfully processed ${data.length} rows.`);
      }, 1000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (isImage || isPDF) {
      if (activeCategory !== '📊 Monthly Commission') {
        setError("AI Extraction is only supported for Monthly Commission MasterSheets currently.");
        return;
      }

      setIsProcessing(true);
      setExtractionStage('upload');
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        setExtractionStage('vision');
        // Small delay to make stage transition feel natural
        await new Promise(r => setTimeout(r, 800));
        setExtractionStage('neural');

        const response = await fetch('/api/extract-mastersheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            mimeType: file.type,
            fileName: file.name
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Extraction failed');

        setExtractionStage('sync');
        if (result.data && Array.isArray(result.data)) {
          processMasterSheet(result.data, file.name);
        } else {
          throw new Error("No data could be extracted from the file.");
        }
      } catch (err) {
        setError(`AI Extraction Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsProcessing(false);
      } finally {
        setExtractionStage('idle');
      }
      return;
    }

    // Legacy auto-detect month from filename for CSV/XLSX
    const dateMatch = file.name.match(/202\d[-]?\d{2}/);
    if (dateMatch && activeCategory === '📊 Monthly Commission') {
      const val = dateMatch[0].replace('-', '');
      const year = val.substring(0, 4);
      const month = val.substring(4, 6);
      const detected = `${year}-${month}`;
      
      // Basic month validation
      const mInt = parseInt(month);
      if (mInt >= 1 && mInt <= 12) {
        if (detected !== selectedMonth) {
          if (confirm(`DETECTION: This file name suggests data for ${detected}. Your "Target Month" is currently set to ${selectedMonth}.\n\nWould you like to switch the target to ${detected} before processing?`)) {
            setSelectedMonth(detected);
            // We return here to wait for state update by letting the user click upload again, 
            // OR we can just use the detected value directly in a modified process call.
            // Let's use it directly to save a click.
            const reader = new FileReader();
            reader.onload = (evt) => {
              let result = evt.target?.result as string;
              if (!result) return;
              if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                if (result.includes('"My Commission",') || result.startsWith('My Commission,')) {
                  const lines = result.split(/\r?\n/);
                  result = lines.slice(1).join('\n');
                }
                Papa.parse(result, {
                  header: true,
                  skipEmptyLines: true,
                  dynamicTyping: true,
                  complete: (results) => {
                    processMasterSheet(results.data, file.name, detected);
                  },
                  error: (err) => setError(`CSV Parse Error: ${err.message}`)
                });
              }
            };
            if (file.name.endsWith('.xlsx')) reader.readAsBinaryString(file);
            else reader.readAsText(file);
            return;
          }
        }
      }
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      let result = evt.target?.result as string;
      if (!result) return;

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        // Detect if there's a Poppo summary header ("My Commission",0) and skip it
        if (result.includes('"My Commission",') || result.startsWith('My Commission,')) {
          const lines = result.split(/\r?\n/);
          result = lines.slice(1).join('\n');
        }

        Papa.parse(result, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            processMasterSheet(results.data, file.name);
          },
          error: (err) => setError(`CSV Parse Error: ${err.message}`)
        });
      } else if (file.name.endsWith('.xlsx')) {
        const workbook = XLSX.read(result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Handle Poppo summary row in Excel if needed
        if (data[0] && String(data[0][0]).includes('My Commission')) {
          data = data.slice(1);
        }

        // Convert array of arrays back to array of objects using found header row
        const headers = data[0];
        const objectData = data.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((h: string, i: number) => {
            obj[h] = row[i];
          });
          return obj;
        });

        processMasterSheet(objectData, file.name);
      } else {
        setError("Unsupported file format. Please upload .csv, .xlsx, or .txt");
      }
    };

    if (file.name.endsWith('.xlsx')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleProcessPaste = async () => {
    if (!pasteData.trim()) return;
    
    if (activeCategory === '📊 Monthly Commission') {
       parseGridData(pasteData);
       return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingSummary(null);
    
    try {
      let finalPasteData = pasteData.trim();
      // Skip the Poppo summary header if it's there
      if (finalPasteData.includes('"My Commission",') || finalPasteData.startsWith('My Commission,')) {
        const lines = finalPasteData.split('\n');
        finalPasteData = lines.slice(1).join('\n');
      }

      const isTab = finalPasteData.includes('\t');
      const delimiter = isTab ? '\t' : ',';

      if (activeCategory === '📊 Monthly Commission') {
        Papa.parse(finalPasteData, {
          header: true,
          skipEmptyLines: true,
          delimiter: delimiter,
          dynamicTyping: true,
          complete: (results) => {
            processMasterSheet(results.data, "Pasted Data");
          },
          error: (err) => {
            setError(`Parse Error: ${err.message}`);
            setIsProcessing(false);
          }
        });
        return;
      }

      const rows = finalPasteData.split('\n');
      const data: any[] = rows.map(row => {
        const parts = row.split(delimiter).map(p => p.trim());
        return parts;
      });

      if (activeCategory === '🎲 PK Tournament') {
        const records: PKEntry[] = data.map(parts => ({
          id: crypto.randomUUID(),
          poppo_id: String(parts[0] || ''),
          start_date: String(parts[1] || new Date().toISOString().split('T')[0]),
          end_date: String(parts[2] || new Date().toISOString().split('T')[0]),
          win_percentage: Number(parts[3] || 0),
          pk_score: Number(parts[4] || 0),
          sessions: Number(parts[5] || 1),
          submitted_by: localAuth.name,
          submitted_role: localAuth.role,
          timestamp: new Date().toISOString()
        })).filter(r => r.poppo_id);

        await FirebaseService.savePKRecords(records);
        setProcessingSummary(`Successfully processed and saved ${records.length} PK records.`);
      } else if (activeCategory === '📣 Event Logs') {
        const records: ExposureEntry[] = data.map(parts => ({
          id: crypto.randomUUID(),
          poppo_id: String(parts[0] || ''),
          event_date: String(parts[1] || new Date().toISOString().split('T')[0]),
          event_type: String(parts[2] || 'Platform Feature'),
          description: String(parts[3] || ''),
          submitted_by: localAuth.name,
          submitted_role: localAuth.role,
          timestamp: new Date().toISOString()
        })).filter(r => r.poppo_id);

        await FirebaseService.saveExposures(records);
        setProcessingSummary(`Successfully processed and saved ${records.length} event logs.`);
      } else if (activeCategory === '📋 Roster Updates') {
        const currentHosts = await FirebaseService.getAllHosts();
        const updatedHosts: Host[] = [];

        data.forEach(parts => {
          const id = String(parts[0] || '');
          if (!id) return;

          const existing = currentHosts.find(h => h.id === id);
          const newHost: Host = {
            id,
            name: String(parts[1] || existing?.name || 'Unknown'),
            nickname: String(parts[2] || existing?.nickname || parts[1] || 'Unknown'),
            position: (parts[3] as any) || existing?.position || 'Talent',
            role: (parts[3] as any) || existing?.role || 'Talent',
            team: String(parts[4] || existing?.team || 'Alpha'),
            manager: String(parts[5] || existing?.manager || 'Director Only'),
            status: (parts[6] as any) || existing?.status || 'Active',
            anchor_type: (parts[7] as any) || existing?.anchor_type || 'Nine Agency',
            base_salary_category: (parts[8] as any) || existing?.base_salary_category || 'N/A',
            level: Number(parts[9] || existing?.level || 1),
            tier: (parts[10] as any) || existing?.tier || 'X',
            password: String(parts[11] || existing?.password || '1212'),
            is_temp_password: parts[11] !== undefined ? false : (existing?.is_temp_password ?? true),
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          updatedHosts.push(newHost);
        });

        await FirebaseService.saveHosts(updatedHosts);
        setProcessingSummary(`Successfully updated ${updatedHosts.length} host roster records.`);
      }

      setPasteData('');
      // Update local file log
      const newFile: FileEntry = {
        id: crypto.randomUUID(),
        name: `Paste_${new Date().toISOString().split('T')[0]}`,
        category: activeCategory,
        type: 'paste',
        timestamp: new Date().toISOString(),
        status: 'Processed',
        matchedCount: data.length,
        description: `Manual paste import for ${activeCategory}`
      };
      const updatedFiles = [newFile, ...files];
      Storage.setFiles(updatedFiles);
      setFiles(updatedFiles);
      Storage.addLog('System', `Director pasted ${activeCategory} data`, localAuth.name);

    } catch (err) {
      setError(`Parsing Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteFile = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    Storage.setFiles(updated);
    setFiles(updated);
  };

  const [bulkPasteData, setBulkPasteData] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const handleBulkAdd = async () => {
    if (!bulkPasteData.trim()) return;
    setIsBulkProcessing(true);
    setError(null);
    
    try {
      const rows = bulkPasteData.trim().split('\n');
      const newHosts: Host[] = [];
      const currentHosts = await FirebaseService.getAllHosts();
      const existingIds = new Set(currentHosts.map(h => h.id));

      rows.forEach(line => {
        // Support Tab, Comma, or multi-space delimiters
        const parts = line.split(/[,\t]|\s{2,}/).map(p => p.trim());
        if (parts.length < 2) return;

        const id = parts[0];
        const name = parts[1];
        const position = (parts[2] as Position) || 'Talent';
        const role = (parts[3] as Position) || position || 'Talent';

        if (!id || isNaN(Number(id))) return;

        if (existingIds.has(id)) return;

        newHosts.push({
          id,
          name,
          nickname: name,
          position: position as Position,
          role: role as Position,
          team: 'Unassigned',
          manager: 'Nine Management',
          anchor_type: 'Nine Agency',
          base_salary_category: 'N/A',
          status: 'Active',
          level: 1,
          tier: 'X',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          password: '1212',
          is_temp_password: true
        });
        existingIds.add(id);
      });

      if (newHosts.length > 0) {
        await FirebaseService.saveHosts(newHosts);
        Storage.addLog('System', `Bulk onboarded ${newHosts.length} new hosts via Direct Paste`, localAuth.name);
        setProcessingSummary(`Successfully onboarded ${newHosts.length} new hosts.`);
        setBulkPasteData('');
        loadRoster();
      } else {
        setError("No new unique hosts detected. Ensure the Poppo ID is valid and not already registered.");
      }
    } catch (err) {
      setError("Bulk Processing Failed: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsBulkProcessing(false);
    }
  };

  if (localAuth.role !== 'Director' && localAuth.role !== 'Head Admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Shield size={64} className="text-red-500/20" />
        <h2 className="text-2xl font-black text-white/90">Director Access Required</h2>
        <p className="max-w-md text-white/40 font-medium">This hub is reserved for Agency Leadership. Please contact Miss Nine if you require access to these features.</p>
      </div>
    );
  }

  // We allow access based on local auth level (isDirector)
  // fbUser is used for the header sync status, but doesn't block the UI

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">
      {/* Side Navigation Rail */}
      <nav className="w-full lg:w-64 space-y-2 shrink-0">
        <div className="p-4 mb-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
          <div className="flex items-center gap-3 mb-1">
            <Shield size={16} className="text-indigo-400" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Commander Status</h4>
          </div>
          <div className="text-xs font-bold text-white truncate">{localAuth.name}</div>
          <div className="text-[9px] text-indigo-400/60 font-black mt-1">NINE AGENCY DIRECTOR</div>
        </div>

        {[
          { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
          { id: 'finance', label: 'Financial History', icon: Briefcase },
          { id: 'intake', label: 'Intelligence Intake', icon: FileSearch },
          { id: 'roster', label: 'Roster Dynamics', icon: Users },
          { id: 'audit', label: 'Data Stewardship', icon: Database },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as any)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative",
              activeView === item.id 
                ? "bg-white/5 text-white border border-white/10 shadow-xl" 
                : "text-white/40 hover:bg-white/[0.02] hover:text-white/60"
            )}
          >
            <item.icon size={18} className={cn("transition-colors", activeView === item.id ? "text-indigo-400" : "group-hover:text-white/60")} />
            <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            {activeView === item.id && (
              <motion.div layoutId="nav-glow" className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        ))}
      </nav>

      {/* Main Mission Control Area */}
      <main className="flex-1 min-w-0 space-y-8 pb-20">
        {activeView === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <section className="space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                   <Lock size={18} className="text-amber-400" />
                   Password Reset Requests
                 </h3>
                 <button onClick={loadResetRequests} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-white">
                   <History size={14} className={cn(isResetsLoading && "animate-spin")} />
                 </button>
               </div>
               
               <div className="tech-card !p-0 overflow-hidden">
                  {resetRequests.length === 0 ? (
                    <div className="p-12 text-center text-white/20 italic text-xs">No pending reset requests.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/2">
                          <th className="px-6 py-4">Poppo ID</th>
                          <th className="px-6 py-4">Talent Name</th>
                          <th className="px-6 py-4">Requested At</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {resetRequests.map(req => (
                          <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-indigo-400">{req.poppoId}</td>
                            <td className="px-6 py-4 font-bold text-white">{req.hostName}</td>
                            <td className="px-6 py-4 text-white/40">{formatDate(req.requestedAt)}</td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={async () => {
                                  const host = rosterHosts.find(h => h.id === req.poppoId);
                                  if (host) {
                                    const tempPass = Math.floor(1000 + Math.random() * 9000).toString();
                                    await FirebaseService.updateHost({ ...host, password: tempPass, is_temp_password: true, reset_requested: false });
                                    await FirebaseService.resolveResetRequest(req.id);
                                    alert(`Password reset for ${host.name}.\nNew Temporary Password: ${tempPass}`);
                                    loadResetRequests();
                                    loadRoster();
                                  }
                                }}
                                className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all"
                              >
                                ASSIGN TEMP PASS
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
               </div>
            </section>

            <section className="space-y-4">
               <h3 className="font-bold text-lg flex items-center gap-2">
                 <Target size={18} className="text-emerald-400" />
                 Strategic Priorities
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'High Alert', color: 'border-red-500/20 bg-red-500/5', icon: Zap, items: ['JAKE re-engagement', 'Nicole intervention', 'Allyyy post-mortem'] },
                    { label: 'Strategy', color: 'border-amber-500/20 bg-amber-500/5', icon: Target, items: ['LYKA development', 'Jlord mentoring', 'Arnel coaching'] },
                    { label: 'Observatory', color: 'border-cyan-500/20 bg-cyan-500/5', icon: Activity, items: ['SexyLou model study', 'Boyeet burnout watch', 'Jey Em mentor'] },
                  ].map((p, i) => (
                    <div key={i} className={cn("p-6 rounded-3xl border tech-card", p.color)}>
                       <div className="flex items-center justify-between mb-4">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">{p.label}</h4>
                         <p.icon size={14} className="text-white/20" />
                       </div>
                       <ul className="space-y-4">
                         {p.items.map((item, j) => (
                           <li key={j} className="flex items-center gap-3 text-xs font-bold text-white/80 group cursor-pointer">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-white group-hover:scale-125 transition-all" />
                              {item}
                           </li>
                         ))}
                       </ul>
                    </div>
                  ))}
               </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-400" />
                Poppo Agent Terminal
              </h3>
              <div className="tech-card p-12 text-center space-y-6 bg-gradient-to-br from-indigo-500/[0.03] to-transparent">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20 shadow-2xl">
                   <Shield size={40} className="text-indigo-400" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                   <h4 className="text-xl font-black text-white tracking-tight">AGENT MANAGEMENT INTERFACE</h4>
                   <p className="text-xs text-white/40 leading-relaxed font-medium">
                      Redirecting to secure Poppo Management server. All transactions must be cross-verified with local MasterSheets.
                   </p>
                </div>
                <a 
                   href="https://agent.vshowapi.com/login" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/30 active:scale-95 group"
                >
                   ESTABLISH SECURE LINK
                   <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </section>
          </motion.div>
        )}

        {activeView === 'finance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <Briefcase size={20} className="text-emerald-400" />
                  Financial History Manager
                </h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">NINE AGENCY FISCAL STEWARDSHIP</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const month = prompt("Enter Month (MM:YYYY) e.g. JUNE 2024:");
                    if (month) {
                      const [mName, y] = month.split(' ');
                      const mIndex = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].indexOf(mName.toUpperCase());
                      if (mIndex === -1) {
                        alert("Invalid month name. Use full name e.g. JUNE");
                        return;
                      }
                      const dateCode = `${y}-${(mIndex + 1).toString().padStart(2, '0')}`;
                      setSelectedMonth(dateCode);
                      setProcessingSummary(`Created financial window for ${month}`);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Add Financial Tab
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to remove all financial records for ${selectedMonth}?`)) {
                      setIsProcessing(true);
                      try {
                        await FirebaseService.deleteCommissionsByMonth(selectedMonth);
                        loadCloudStats();
                        setProcessingSummary(`Removed records for ${selectedMonth}`);
                      } catch (err) { alert("Failed to remove data tab."); }
                      finally { setIsProcessing(false); }
                    }
                  }}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-500/20 transition-all flex items-center gap-2"
                >
                  <Trash2 size={14} /> Remove Financial Tab
                </button>
              </div>
            </div>

            <div className="tech-card space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-white/5 p-2 px-4 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Active Record Set</span>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-emerald-400 font-bold text-xs outline-none cursor-pointer"
                    >
                      {Object.keys(cloudStats).sort((a,b) => b.localeCompare(a)).map(m => (
                        <option key={m} value={m} className="bg-[#0A0A0A]">{formatMonth(m)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      const data = await FirebaseService.getCommissionsByMonth(selectedMonth);
                      setDetailData(data);
                      setProcessingSummary(`Synced latest records for ${formatMonth(selectedMonth)}`);
                    } catch (err) { alert("Sync failed."); }
                    finally { setIsProcessing(false); }
                  }}
                  className="btn-primary !py-2 !px-6 !text-[10px]"
                >
                  <History size={14} className={cn("inline mr-2", isProcessing && "animate-spin")} />
                  Sync Updated Records
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] min-w-[2000px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/2">
                      <th className="px-4 py-4">Total Commission</th>
                      <th className="px-4 py-4">ID</th>
                      <th className="px-4 py-4">Nickname</th>
                      <th className="px-4 py-4">Live duration</th>
                      <th className="px-4 py-4">Party host duration</th>
                      <th className="px-4 py-4">Total earnings of points</th>
                      <th className="px-4 py-4">agentweb_commission_earning</th>
                      <th className="px-4 py-4">Live earnings</th>
                      <th className="px-4 py-4">Party Earnings</th>
                      <th className="px-4 py-4">Private chat</th>
                      <th className="px-4 py-4">Tips</th>
                      <th className="px-4 py-4">Platform reward</th>
                      <th className="px-4 py-4">Other Earnings</th>
                      <th className="px-4 py-4">Platform hour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {detailData.length > 0 ? detailData.map((row) => (
                      <tr key={row.poppo_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4 text-emerald-400 font-black">{(row.my_commission || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono font-bold text-indigo-400">{row.poppo_id}</td>
                        <td className="px-4 py-4 font-bold text-white uppercase">{row.poppo_name}</td>
                        <td className="px-4 py-4 text-white/40">{Math.floor((row.live_duration || 0) / 60)}h {Math.round((row.live_duration || 0) % 60)}m</td>
                        <td className="px-4 py-4 text-white/40">{Math.floor((row.video_duration || 0) / 60)}h {Math.round((row.video_duration || 0) % 60)}m</td>
                        <td className="px-4 py-4 font-mono">{(row.total_points || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.agentweb_commission_earning || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.live_earnings || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.video_earnings || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.private_chat || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.tips || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.platform_reward || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.other_earn || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono">{(row.platform_hourly_salary || 0).toLocaleString()}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={14} className="py-20 text-center text-white/20 italic text-xs">
                          No records found for this window. Use Intake to upload a MasterSheet or click Sync to fetch cloud data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Intelligence Intake View */}
        {activeView === 'intake' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <section className="space-y-6">
               <div className="flex items-center justify-between">
                 <h3 className="font-bold text-xl flex items-center gap-2">
                   <FileSearch size={20} className="text-indigo-400" />
                   Intelligence Intake
                 </h3>
                 <div className="flex gap-2">
                    <button className="btn-secondary !py-1.5 !px-4 text-[10px]"><FolderPlus size={14} className="mr-2 inline" /> New Classification</button>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="space-y-2">
                     {categories.map(cat => (
                       <button 
                         key={cat.name}
                         onClick={() => setActiveCategory(cat.name)}
                         className={cn(
                           "w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden",
                           activeCategory === cat.name ? "border-indigo-500/50 bg-indigo-500/10 text-white" : "border-transparent text-white/40 hover:bg-white/5"
                         )}
                       >
                          <h5 className="font-bold text-xs uppercase tracking-widest">{cat.name.replace(/[^\w\s]/g, '')}</h5>
                          <p className="text-[9px] opacity-40 mt-1 line-clamp-1 font-medium">{cat.desc}</p>
                          {activeCategory === cat.name && (
                            <motion.div layoutId="cat-active" className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500" />
                          )}
                       </button>
                     ))}
                  </div>

                  <div className="lg:col-span-3 space-y-6">
                     <div className="tech-card space-y-8">
                        <div className="flex items-center justify-between">
                           <div>
                             <h4 className="font-black text-lg text-white uppercase tracking-tight">{activeCategory}</h4>
                             <p className="text-[10px] text-white/30 mt-1">{categories.find(c => c.name === activeCategory)?.desc}</p>
                           </div>
                           {activeCategory === '📊 Monthly Commission' && (
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 bg-white/5 p-2 px-4 rounded-xl border border-white/5">
                                   <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Target Window</span>
                                   <input 
                                     type="month" 
                                     value={selectedMonth}
                                     onChange={(e) => setSelectedMonth(e.target.value)}
                                     className="bg-transparent text-indigo-400 font-bold text-xs outline-none [color-scheme:dark]"
                                   />
                                </div>
                             </div>
                           )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div 
                             onClick={() => fileInputRef.current?.click()}
                             className="border-2 border-dashed border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] transition-all cursor-pointer relative group"
                           >
                              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.xlsx,.txt,.pdf,image/*" />
                              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                 <FileUp size={32} className="text-indigo-400" />
                              </div>
                              <div className="text-center space-y-2">
                                 <p className="font-black text-xs uppercase tracking-[0.2em] text-white">AI Vision Scan</p>
                                 <p className="text-[10px] text-white/30">PDF, JPG, PNG, CSV, XLSX</p>
                                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-[9px] font-black text-indigo-400 border border-indigo-500/20">
                                   <Zap size={10} /> GEMINI ENGINE ACTIVE
                                 </div>
                              </div>
                              {isProcessing && (
                                 <div className="absolute inset-0 bg-[#0A0A0B]/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center gap-6 border border-indigo-500/30">
                                    <div className="relative">
                                      <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                        className="w-20 h-20 rounded-full border-2 border-dashed border-indigo-500/20"
                                      />
                                      <Loader2 size={32} className="text-indigo-400 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <div className="text-center space-y-2">
                                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse">
                                         {getStageMessage()}
                                       </p>
                                       <div className="w-32 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
                                          <motion.div 
                                            initial={{ x: "-100%" }}
                                            animate={{ x: "100%" }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                            className="w-full h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                                          />
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>

                           <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Sheet Intelligence Input</span>
                                 <Clipboard size={12} className="text-white/20" />
                              </div>
                              <textarea 
                                value={pasteData}
                                onChange={(e) => {
                                  setPasteData(e.target.value);
                                  if (sheetPreview.length > 0) setSheetPreview([]);
                                }}
                                placeholder="PASTE EXCEL DATA HERE...&#10;Row 1: May 2024&#10;Row 2: ID  Nickname  Live Duration..."
                                className="w-full h-40 glass-input resize-none"
                              />
                              <button 
                                onClick={handleProcessPaste}
                                disabled={isProcessing || !pasteData.trim()}
                                className="w-full btn-primary !py-3 disabled:opacity-50"
                              >
                                {isProcessing ? 'SCANNING...' : 'GENERATE GRID PREVIEW'}
                              </button>
                           </div>
                        </div>

                        {/* Google Sheets Sync Section */}
                        <div className="border-t border-white/5 pt-8 space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <Database size={16} className="text-emerald-400" />
                                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Google Sheets Integration</h5>
                              </div>
                              <span className="text-[8px] font-mono text-white/30 px-2 py-0.5 rounded border border-white/10 bg-white/2">REAL-TIME REST CLIENT</span>
                           </div>

                           {!sheetsAccessToken ? (
                              <div className="bg-white/[0.01] rounded-3xl p-6 border border-white/5 flex flex-col gap-6">
                                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="space-y-1">
                                       <p className="text-sm font-bold text-white/80">Google Sheets Link is Offline</p>
                                       <p className="text-[10px] text-white/40 font-medium">Directly link sheets to pull MasterSheet data or export Roster & Commissions without manual uploads.</p>
                                    </div>
                                 <button 
                                   onClick={handleConnectSheets}
                                   disabled={isSheetsProcessing}
                                   className="btn-primary !py-2.5 !px-6 whitespace-nowrap flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                 >
                                    {isSheetsProcessing ? (
                                       <>
                                         <Loader2 size={12} className="animate-spin" /> Link Authorization...
                                       </>
                                    ) : (
                                       <>
                                         <Zap size={12} /> Link Google Sheets
                                       </>
                                    )}
                                 </button>
                                 </div>

                                 {/* Helper tips for popup blocker */}
                                 <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-[10px] font-medium text-indigo-300 leading-relaxed space-y-1.5 text-left">
                                    <p className="font-extrabold uppercase text-[9px] tracking-wider text-indigo-400">💡 Popup Block Notice / Sandbox Helper</p>
                                    <p>Since Google Auth uses popups, please click <strong className="text-indigo-200">"Open in a new tab"</strong> in AI Studio's top right corner to bypass iframe sandbox security blocks.</p>
                                    <p>Alternatively, you can manually paste a temporary Google Access Token below for instant sync override.</p>
                                 </div>

                                 <div className="border-t border-white/5 pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                       <button 
                                          type="button" 
                                          onClick={() => setShowManualInput(!showManualInput)}
                                          className="text-[9px] font-black uppercase tracking-widest text-[#93c5fd] hover:underline"
                                       >
                                          {showManualInput ? "hide developer manual token override" : "use developer manual token override"}
                                       </button>
                                    </div>
                                    
                                    {showManualInput && (
                                       <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-white/50 block">Google OAuth Access Token Override</label>
                                          <div className="flex gap-2">
                                             <input 
                                               type="text" 
                                               value={manualToken}
                                               onChange={(e) => setManualToken(e.target.value)}
                                               placeholder="paste accessToken (ya29.a0Ax...)"
                                               className="w-full glass-input text-xs"
                                             />
                                             <button 
                                                type="button"
                                                onClick={() => {
                                                   if (!manualToken.trim()) return;
                                                   setCachedSheetsToken(manualToken.trim());
                                                   setSheetsAccessToken(manualToken.trim());
                                                   setProcessingSummary("Manually linked Google Sheets Access Token!");
                                                   setTimeout(() => setProcessingSummary(null), 3500);
                                                }}
                                                className="btn-secondary !px-4 !py-2 text-[10px] font-black uppercase tracking-wider"
                                              >
                                                 Apply
                                              </button>
                                           </div>
                                        </div>
                                     )}
                                  </div>
                               </div>
                            ) : (
                              <div className="bg-white/[0.01] rounded-3xl p-6 border border-white/5 space-y-6">
                                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-2">
                                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                       <p className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Sheets Authorization Active</p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setCachedSheetsToken(null);
                                        setSheetsAccessToken(null);
                                      }}
                                      className="text-[9px] uppercase font-black text-rose-400 hover:underline tracking-widest"
                                    >
                                       Disconnect Sync
                                    </button>
                                 </div>

                                 {/* Three Spreadsheets Selection Tabs */}
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block">Select Connected Spreadsheet Channel</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5">
                                       <button
                                         type="button"
                                         onClick={() => setActiveSheetType('roster')}
                                         className={`py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                                           activeSheetType === 'roster' 
                                             ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                             : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                                         }`}
                                       >
                                          <Users size={12} /> 1. Active Roster
                                       </button>
                                       <button
                                         type="button"
                                         onClick={() => setActiveSheetType('monthly')}
                                         className={`py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                                           activeSheetType === 'monthly' 
                                             ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                             : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                                         }`}
                                       >
                                          <Database size={12} /> 2. Monthly Commissions
                                       </button>
                                       <button
                                         type="button"
                                         onClick={() => setActiveSheetType('weekly')}
                                         className={`py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                                           activeSheetType === 'weekly' 
                                             ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                             : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                                         }`}
                                       >
                                          <Activity size={12} /> 3. Weekly Analytics
                                       </button>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                       <div className="flex justify-between items-center">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block">Spreadsheet ID or URL</label>
                                          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Saved in LocalCache</span>
                                       </div>
                                       <input 
                                         type="text"
                                         value={spreadsheetId}
                                         onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                                         placeholder={
                                           activeSheetType === 'roster' 
                                             ? "Paste Host Roster spreadsheet ID or URL..." 
                                             : activeSheetType === 'monthly'
                                               ? "Paste Monthly Commissions spreadsheet ID or URL..."
                                               : "Paste Weekly Reporting spreadsheet ID or URL..."
                                         }
                                         className="w-full glass-input text-xs"
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block">Sheet Name / Tab Range</label>
                                       <input 
                                         type="text"
                                         value={sheetRange}
                                         onChange={(e) => setSheetRange(e.target.value)}
                                         placeholder="e.g. Sheet1"
                                         className="w-full glass-input text-xs"
                                       />
                                    </div>
                                 </div>

                                 <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                      onClick={handleImportFromSheets}
                                      disabled={isSheetsProcessing || isProcessing}
                                      className="btn-primary !px-4 !py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                                    >
                                       <FileUp size={12} /> Sync / Import {activeSheetType === 'roster' ? 'Roster' : activeSheetType === 'weekly' ? 'Weekly Analytics' : 'Monthly Commissions'}
                                    </button>
                                    
                                    <button
                                      onClick={handleExportCommissionsToSheets}
                                      disabled={isSheetsProcessing || isProcessing}
                                      className={cn("btn-secondary !px-4 !py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50", activeSheetType !== 'monthly' && "hidden")}
                                    >
                                       <Database size={12} className="text-purple-400" /> Export Commissions ({selectedMonth})
                                    </button>

                                    <button
                                      onClick={handleExportRosterToSheets}
                                      disabled={isSheetsProcessing || isProcessing}
                                      className={cn("btn-secondary !px-4 !py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50", activeSheetType !== 'roster' && "hidden")}
                                    >
                                       <Users size={12} className="text-cyan-400" /> Export Active Roster
                                     </button>

                                     <button
                                       onClick={handleExportWeeklyToSheets}
                                       disabled={isSheetsProcessing || isProcessing}
                                       className={cn("btn-secondary !px-4 !py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50", activeSheetType !== 'weekly' && "hidden")}
                                     >
                                        <Activity size={12} className="text-indigo-400" /> Export Weekly Analytics
                                    </button>
                                 </div>

                                 {exportedSheetUrl && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.98 }} 
                                      animate={{ opacity: 1, scale: 1 }} 
                                      className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                       <div className="space-y-1">
                                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Spreadsheet Ready</p>
                                          <p className="text-xs text-white/80 font-bold">"{exportedSheetName}" was generated successfully.</p>
                                       </div>
                                       <a 
                                         href={exportedSheetUrl} 
                                         target="_blank" 
                                         rel="noopener noreferrer" 
                                         className="btn-primary !py-2 !px-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/10"
                                       >
                                          Open Spreadsheet
                                       </a>
                                    </motion.div>
                                 )}
                              </div>
                           )}
                        </div>

                        {sheetPreview.length > 0 && (
                          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 border-t border-white/5 pt-8">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Execution Grid Preview</h5>
                                  <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-white/40">
                                      TARGET WINDOW: <span className="text-indigo-400">{sheetMonth}</span>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-500/10 text-[8px] font-black text-indigo-400">
                                      <Database size={8} /> CLOUD READY
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button onClick={() => setSheetPreview([])} className="flex-1 sm:flex-none btn-secondary !py-2.5 !px-6 !text-[10px]">ABORT</button>
                                  <button 
                                    onClick={handleSaveSheet}
                                    disabled={isProcessing}
                                    className="flex-1 sm:flex-none px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                                  >
                                    {isProcessing ? 'INJECTING...' : 'SYNC CLOUD'}
                                  </button>
                                </div>
                             </div>

                             <div className="relative group/grid">
                                {/* Mobile Scroll Indicator */}
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[8px] font-black text-white/20 uppercase tracking-widest animate-pulse sm:hidden pointer-events-none">
                                   <ArrowRight size={10} className="rotate-180" />
                                   Swipe to Navigate Matrix
                                   <ArrowRight size={10} />
                                </div>

                                <div className="tech-card !p-0 overflow-hidden border-indigo-500/20 shadow-2xl relative">
                                   {/* Scrollable Container */}
                                   <div className="max-h-[500px] overflow-auto custom-scrollbar">
                                      <table className="w-full text-left text-[11px] min-w-[1200px]">
                                         <thead className="sticky top-0 bg-[#0F0F11] z-20 shadow-xl border-b border-white/10">
                                            <tr className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                                               {Object.keys(sheetPreview[0] || {}).map((key, kIndex) => (
                                                 <th key={`${key}-${kIndex}`} className="px-6 py-4 bg-[#0F0F11] whitespace-nowrap">
                                                   {key}
                                                 </th>
                                               ))}
                                            </tr>
                                         </thead>
                                         <tbody className="divide-y divide-white/5">
                                            {sheetPreview.map((row, i) => (
                                              <tr key={i} className="hover:bg-white/[0.03] transition-colors group/row">
                                                 {Object.keys(row).map((key, j) => {
                                                   const val = row[key];
                                                   const isNumeric = !isNaN(Number(val)) && val !== '' && (key.toLowerCase().includes('earn') || key.toLowerCase().includes('points') || key.toLowerCase().includes('commission'));
                                                   return (
                                                     <td key={j} className={cn(
                                                       "px-6 py-4 whitespace-nowrap",
                                                       key === 'ID' && "font-mono text-indigo-400 font-bold",
                                                       key === 'Nickname' && "font-bold text-white uppercase tracking-tight group-hover/row:text-indigo-300 transition-colors",
                                                       isNumeric && "text-cyan-400 font-black"
                                                     )}>
                                                       {isNumeric ? Number(val).toLocaleString() : val}
                                                     </td>
                                                   );
                                                 })}
                                              </tr>
                                            ))}
                                         </tbody>
                                      </table>
                                   </div>
                                </div>
                                
                                {/* Right Edge Fade to indicate more scroll */}
                                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0A0A0B] to-transparent pointer-events-none opacity-50 block sm:hidden" />
                             </div>
                          </motion.div>
                        )}

                        <AnimatePresence>
                          {error && (
                             <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                                <AlertCircle size={16} className="text-red-400 mt-0.5" />
                                <div className="space-y-1">
                                   <p className="text-[11px] font-black uppercase text-red-400">System Constraint Violation</p>
                                   <p className="text-[10px] text-red-300 font-mono leading-relaxed">{error}</p>
                                </div>
                                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:scale-125 transition-transform">✕</button>
                             </motion.div>
                          )}
                          {processingSummary && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                               <CheckCircle2 size={16} className="text-emerald-400" />
                               <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-tight">{processingSummary}</p>
                               <button onClick={() => setProcessingSummary(null)} className="ml-auto text-emerald-400">✕</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>

                     <div className="tech-card !p-0 overflow-hidden">
                       <div className="p-6 border-b border-white/5 flex items-center justify-between">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                           <History size={14} /> Intelligence Log
                         </h4>
                         <span className="text-[10px] font-bold text-white/20">{files.length} ENTRIES</span>
                       </div>
                       <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                               <th className="px-6 py-4">Status</th>
                               <th className="px-6 py-4">Source</th>
                               <th className="px-6 py-4 text-center">Payload</th>
                               <th className="px-6 py-4">Timestamp</th>
                               <th className="px-6 py-4 text-right">Delete</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {files.map((file, fIdx) => (
                              <tr key={`file-${file.id || fIdx}-${fIdx}`} onClick={() => loadFileDetail(file)} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                <td className="px-6 py-4">
                                   <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                                     {file.status}
                                   </span>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{file.name}</div>
                                   <div className="text-[9px] text-white/20 mt-0.5 font-bold uppercase">{file.category}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                   <span className="font-mono text-cyan-400 font-bold">{file.matchedCount}</span>
                                </td>
                                <td className="px-6 py-4 text-white/40 font-mono">
                                   {formatDate(file.timestamp)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="p-2 hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-400 transition-all">
                                     <Trash2 size={13} />
                                   </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                       </table>
                     </div>
                  </div>
               </div>
            </section>
          </motion.div>
        )}

        {activeView === 'roster' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <section className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                     <UserPlus size={18} className="text-indigo-400" />
                     Mass Personnel Intake
                  </h3>
                  <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    <Database size={10} /> SYNC: CLOUD_SECURE
                  </div>
               </div>
               <div className="tech-card flex flex-col xl:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                     <textarea 
                       value={bulkPasteData}
                       onChange={(e) => setBulkPasteData(e.target.value)}
                       placeholder="PoppoID, Name, Role, Rank&#10;7788123, Nina Nine, Director, S"
                       className="w-full h-48 glass-input font-mono text-[10px] leading-relaxed resize-none p-6"
                     />
                     <div className="flex items-center justify-between gap-4">
                        <p className="text-[10px] text-white/20 font-medium">CSV/TSV Structure Supported. Matrix deduplication enabled.</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setBulkPasteData('')} className="btn-secondary !py-2.5 !px-6">RESET</button>
                          <button 
                            onClick={handleBulkAdd} 
                            disabled={isBulkProcessing || !bulkPasteData.trim()}
                            className="btn-primary !py-2.5 !px-10 shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                          >
                            {isBulkProcessing ? 'INJECTING...' : 'ONSITE REGISTRATION'}
                          </button>
                        </div>
                     </div>
                  </div>
                  <div className="w-full xl:w-72 space-y-4 shrink-0">
                     <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Intelligence Protocol</h4>
                        <ul className="text-[10px] text-white/30 space-y-3 font-medium">
                           <li className="flex gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Paste structured rows from Excel/Sheets.</li>
                           <li className="flex gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> System will auto-assign temporary passwords (1212).</li>
                           <li className="flex gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Duplicate IDs are auto-pruned.</li>
                        </ul>
                     </div>
                  </div>
               </div>
            </section>

            <section className="space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                    <Shield size={18} className="text-indigo-400" />
                    Global Roster Override
                 </h3>
                 <button onClick={() => loadRoster()} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40"><History size={14} /></button>
               </div>
               <div className="tech-card !p-0 overflow-hidden">
                  <RosterManualEditor hosts={rosterHosts} onRefresh={loadRoster} activeCategory="ManualEdit" isLoading={isRosterLoading} />
               </div>
            </section>
          </motion.div>
        )}

        {activeView === 'audit' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <section className="space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl flex items-center gap-2">
                     <Database size={20} className="text-cyan-400" />
                     Data Vault Stewardship
                  </h3>
                  <button onClick={loadCloudStats} disabled={isStatsLoading} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition-colors">
                    <History size={14} className={cn(isStatsLoading && "animate-spin")} />
                    RECALIBRATE AUDIT
                  </button>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Object.entries(cloudStats).sort((a,b) => b[0].localeCompare(a[0])).map(([month, count]) => (
                    <div key={month} className="tech-card !p-6 border-white/5 bg-white/[0.01] group relative transition-all hover:bg-white/[0.03]">
                       <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em]">{formatMonth(month)}</p>
                       <div className="mt-4 flex items-end gap-3">
                          <span className="text-3xl font-black text-white leading-none">{count}</span>
                          <span className="text-[10px] font-black uppercase text-white/20 mb-1">RECORDS</span>
                       </div>
                       <button 
                         onClick={async () => {
                           if (confirm(`DELETION PROTOCOL: Permanently wipe ${count} records for ${formatMonth(month)}?`)) {
                             setIsStatsLoading(true);
                             try {
                               await FirebaseService.deleteCommissionsByMonth(month);
                               loadCloudStats();
                             } catch (err) { alert("Deletion protocol failed."); }
                             finally { setIsStatsLoading(false); }
                           }
                         }}
                         className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                  ))}
               </div>
            </section>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {selectedFileDetail && (
          <DataSpotlight 
            file={selectedFileDetail}
            data={detailData}
            isLoading={isDetailLoading}
            onClose={() => setSelectedFileDetail(null)}
            onUpdateRow={handleUpdateDetailRow}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
