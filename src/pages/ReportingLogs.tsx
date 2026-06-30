import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, doc, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { Search, Trash2, Edit2, X, Save, AlertTriangle, Calendar, ClipboardList, Activity, Users, Award } from 'lucide-react';

interface TabConfig {
  key: string;
  label: string;
  collectionName: string;
  icon: React.ElementType;
  filterField?: string;
}

const TABS: TabConfig[] = [
  { key: 'events', label: 'Events Log', collectionName: 'calendar', icon: Calendar },
  { key: 'attendance', label: 'Attendance Log', collectionName: 'attendance', icon: ClipboardList },
  { key: 'pk', label: 'PK Performance', collectionName: 'pk_reports', icon: Activity },
  { key: 'fanbase', label: 'Fanbase Health', collectionName: 'fanbase_reports', icon: Users },
  { key: 'badges', label: 'Assigned Badges', collectionName: 'users', icon: Award, filterField: 'badges' },
];

export const ReportingLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDoc, setEditingDoc] = useState<any>(null);

  const authState = Storage.getAuthState();
  const isDirector = String(authState.role).toLowerCase() === 'director';
  const activeConfig = TABS.find(t => t.key === activeTab) || TABS[0];

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, activeConfig.collectionName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeConfig.filterField === 'badges') {
        docs = docs.filter(d => d.badges && Array.isArray(d.badges) && d.badges.length > 0);
      }
      docs.sort((a: any, b: any) => {
        if (a.timestamp && b.timestamp) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        return 0;
      });
      setData(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching report data:", err);
      setError(err.message || "Failed to load collection data");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeTab]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (key !== 'id' && typeof doc[key] !== 'object') keys.add(key);
        else if (key === 'badges' && Array.isArray(doc[key])) keys.add(key);
      });
    });
    return Array.from(keys).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(lower)));
  }, [data, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!isDirector) return;
    if (!window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, activeConfig.collectionName, id));
    } catch (err) {
      console.error("Failed to delete document", err);
      alert("Failed to delete document. Check permissions.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector || !editingDoc) return;
    try {
      const docRef = doc(db, activeConfig.collectionName, editingDoc.id);
      const { id, ...updateData } = editingDoc;
      const originalDoc = data.find(d => d.id === id);
      if (originalDoc) {
        Object.keys(updateData).forEach(key => {
          if (Array.isArray(originalDoc[key]) && typeof updateData[key] === 'string') {
            updateData[key] = updateData[key].split(',').map((s: string) => s.trim()).filter((s: string) => s);
          }
        });
      }
      await setDoc(docRef, updateData, { merge: true });
      setEditingDoc(null);
    } catch (err) {
      console.error("Failed to update document", err);
      alert("Failed to update document. Check permissions.");
    }
  };

  const ActiveIcon = activeConfig.icon;

  return (
    <div className="w-full mx-auto max-w-[1280px] px-3 sm:px-6 py-4 sm:py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-[#D4AF37]/20 to-amber-900/10 rounded-xl sm:rounded-2xl border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)] shrink-0">
            <ActiveIcon className="text-[#D4AF37]" size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white bg-gradient-to-r from-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent">
              Reporting Logs
            </h1>
            <p className="text-[10px] sm:text-xs text-[#A09E9A] mt-0.5">
              {filteredData.length} records &middot; <span className="text-[#D4AF37]/70 font-bold">{activeConfig.collectionName}</span>
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={15} />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-[#D4AF37]/20 focus:border-[#D4AF37] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#F0EFE8] outline-none transition-all placeholder:text-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 sm:gap-1.5 mb-5 sm:mb-6 pb-1 custom-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
              className={`
                relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest
                transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer border
                ${isActive
                  ? 'bg-gradient-to-br from-[#D4AF37] to-amber-600 text-black border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] scale-[1.02]'
                  : 'bg-black/40 text-[#A09E9A] border-white/5 hover:border-[#D4AF37]/30 hover:text-[#D4AF37]/80 hover:bg-[#D4AF37]/5'
                }
              `}
            >
              <Icon size={14} className="sm:hidden" />
              <Icon size={16} className="hidden sm:block" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status banners */}
      {!isDirector && (
        <div className="flex items-center gap-2 p-2.5 sm:p-3 mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.05)]">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Head Admin (View Only Mode)</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2.5 sm:p-3 mb-4 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Error: {error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest animate-pulse">Loading records...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 mb-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <ActiveIcon size={32} className="text-[#D4AF37]/30" />
          </div>
          <p className="text-sm font-black text-[#A09E9A]/60 uppercase tracking-widest">No records found</p>
          <p className="text-[10px] text-[#A09E9A]/30 mt-1">{searchTerm ? 'Try a different search term' : 'This collection is empty'}</p>
        </div>
      )}

      {/* Records - Cards on mobile, Table on desktop */}
      {!loading && filteredData.length > 0 && (
        <>
          {/* Mobile: Card layout */}
          <div className="sm:hidden space-y-2.5">
            {filteredData.map(row => (
              <div
                key={row.id}
                className="bg-gradient-to-br from-[#140E0A]/90 to-black/90 border border-[#D4AF37]/15 rounded-xl p-3 space-y-2 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(212,175,55,0.05)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/[0.02] to-transparent pointer-events-none" />
                {columns.map(col => (
                  <div key={col} className="flex items-start justify-between gap-2 relative z-10">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37]/50 shrink-0 min-w-[80px] pt-0.5">
                      {col.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[#F0EFE8]/80 text-right break-words leading-relaxed font-medium">
                      {Array.isArray(row[col]) ? row[col].join(', ') : String(row[col] || '—')}
                    </span>
                  </div>
                ))}
                {isDirector && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D4AF37]/10 relative z-10">
                    <button onClick={() => setEditingDoc(row)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all cursor-pointer" title="Edit Record">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer" title="Delete Record">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block bg-gradient-to-br from-[#140E0A]/80 to-black/80 border border-[#D4AF37]/10 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_30px_rgba(212,175,55,0.05)]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/60 border-b border-[#D4AF37]/10">
                    {columns.map(col => (
                      <th key={col} className="p-3.5 text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60 whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                    {isDirector && <th className="p-3.5 text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60 text-right w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/5">
                  {filteredData.map(row => (
                    <tr key={row.id} className="hover:bg-[#D4AF37]/[0.02] transition-colors group">
                      {columns.map(col => (
                        <td key={col} className="p-3 text-[11px] text-[#F0EFE8]/70 whitespace-nowrap max-w-[200px] truncate" title={Array.isArray(row[col]) ? row[col].join(', ') : String(row[col] || '')}>
                          {Array.isArray(row[col]) ? row[col].join(', ') : String(row[col] || '—')}
                        </td>
                      ))}
                      {isDirector && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingDoc(row)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all cursor-pointer" title="Edit Record">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(row.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer" title="Delete Record">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {isDirector && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gradient-to-br from-[#140E0A] to-black border border-[#D4AF37]/20 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.1)] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/10 bg-gradient-to-r from-[#D4AF37]/5 to-transparent">
              <h3 className="text-xs sm:text-sm font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                <Edit2 size={14} />
                Edit Record
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
              <form id="edit-form" onSubmit={handleSaveEdit} className="space-y-3 sm:space-y-4">
                {columns.map(col => (
                  <div key={col}>
                    <label className="block text-[9px] font-black text-[#A09E9A]/80 uppercase tracking-wider mb-1.5">
                      {col.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(editingDoc[col]) ? editingDoc[col].join(', ') : editingDoc[col] || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, [col]: e.target.value })}
                      className="w-full bg-black/60 border border-[#D4AF37]/20 focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F0EFE8] outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                    />
                  </div>
                ))}
              </form>
            </div>

            <div className="p-4 border-t border-[#D4AF37]/10 flex items-center justify-end gap-3 bg-black/40">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-form"
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:from-[#D4AF37]/90 hover:to-amber-600/90 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer"
              >
                <Save size={13} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
