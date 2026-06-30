import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, deleteDoc, setDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { BarChart, Search, Trash2, Edit2, X, Save, AlertTriangle } from 'lucide-react';
import { isDirector as checkIsDirector } from '../lib/roleUtils';

interface ReportingPagesProps {
  collectionName: string;
  reportType: string;
  filterField?: string;
}

export const ReportingPages: React.FC<ReportingPagesProps> = ({ collectionName, reportType, filterField }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDoc, setEditingDoc] = useState<any>(null);
  
  const authState = Storage.getAuthState();
  const isDirector = checkIsDirector(authState.role);

  useEffect(() => {
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Special case for badges
      if (filterField === 'badges') {
        docs = docs.filter(d => d.badges && Array.isArray(d.badges) && d.badges.length > 0);
      }
      
      // Sort by timestamp if available
      docs.sort((a: any, b: any) => {
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return 0;
      });

      setData(docs);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching report data:", err);
      setError(err.message || "Failed to load collection data");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, filterField]);

  // Extract all unique keys from data for columns
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (key !== 'id' && typeof doc[key] !== 'object') {
          keys.add(key);
        } else if (key === 'badges' && Array.isArray(doc[key])) {
          keys.add(key);
        }
      });
    });
    return Array.from(keys).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(item => {
      return Object.values(item).some(val => 
        String(val).toLowerCase().includes(lower)
      );
    });
  }, [data, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!isDirector) return;
    if (!window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      console.error("Failed to delete document", err);
      alert("Failed to delete document. Check permissions.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector || !editingDoc) return;
    
    try {
      const docRef = doc(db, collectionName, editingDoc.id);
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/20">
            <BarChart className="text-[#D4AF37]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">{reportType}</h1>
            <p className="text-xs text-[#A09E9A]">
              Viewing {data.length} records from <code className="text-[#D4AF37] bg-black/50 px-1 rounded">{collectionName}</code>
            </p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input 
            type="text" 
            placeholder="Search records..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-[#140E0A] border border-[#D4AF37]/20 focus:border-[#D4AF37] rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none transition-all"
          />
        </div>
      </div>

      {!isDirector && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
          <AlertTriangle size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Head Admin (View Only Mode)</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertTriangle size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Error: {error}</span>
        </div>
      )}

      <div className="bg-[#140E0A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-white/5">
                {columns.map(col => (
                  <th key={col} className="p-4 text-[10px] font-black uppercase tracking-widest text-[#A09E9A] whitespace-nowrap">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
                {isDirector && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#A09E9A] text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-12 text-center text-white/40 text-sm font-bold uppercase tracking-wider">
                    Loading records...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-12 text-center text-white/40 text-sm font-bold uppercase tracking-wider">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map(row => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    {columns.map(col => (
                      <td key={col} className="p-4 text-xs text-white whitespace-nowrap">
                        {Array.isArray(row[col]) ? row[col].join(', ') : String(row[col] || '')}
                      </td>
                    ))}
                    {isDirector && (
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setEditingDoc(row)}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(row.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isDirector && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#140E0A] border border-[#D4AF37]/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-[#D4AF37]/10 to-transparent">
              <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-wider">
                Edit Record
              </h3>
              <button 
                onClick={() => setEditingDoc(null)}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <form id="edit-form" onSubmit={handleSaveEdit} className="space-y-4">
                {columns.map(col => (
                  <div key={col}>
                    <label className="block text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1.5">
                      {col.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(editingDoc[col]) ? editingDoc[col].join(', ') : editingDoc[col] || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, [col]: e.target.value })}
                      className="w-full bg-black border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
                    />
                  </div>
                ))}
              </form>
            </div>

            <div className="p-4 border-t border-white/5 flex items-center justify-end gap-3 bg-[#1C1511]">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-form"
                className="flex items-center gap-2 px-6 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
