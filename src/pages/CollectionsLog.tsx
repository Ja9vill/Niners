import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { Lock, Unlock, Database, Trash2, Edit2, ShieldAlert, CheckSquare, Square, Search, Layers, Activity, FileJson, X, ChevronRight, ChevronDown } from 'lucide-react';
import { CollectionAnalyzer } from '../components/CollectionAnalyzer';
import { DocumentSpotlight } from '../components/DocumentSpotlight';

const TARGET_PASSWORD = '3Plus19=2007';

const KNOWN_COLLECTIONS = [
  'users',
  'calendar',
  'livehouse_data',
  'livehouse_requests',
  'livehouse_logs',
  'pk_reports',
  'fanbase_reports',
  'attendance',
  'announcements',
  'edit_requests',
  'system_logs',
  'system',
  'blogs',
  'pages',
  'applications'
];

export const CollectionsLog: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutMessage, setLockoutMessage] = useState('');

  const [selectedCollection, setSelectedCollection] = useState<string>(KNOWN_COLLECTIONS[0]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  
  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const [passwordPromptCallback, setPasswordPromptCallback] = useState<(() => void) | null>(null);
  const [promptPasswordInput, setPromptPasswordInput] = useState('');
  
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const [bulkField, setBulkField] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  const [activeTab, setActiveTab] = useState<'analysis' | 'spotlight'>('analysis');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Lockout Logic
  useEffect(() => {
    const attempts = parseInt(localStorage.getItem('col_log_fails') || '0', 10);
    const lockout = parseInt(localStorage.getItem('col_log_lockout') || '0', 10);
    const now = Date.now();
    
    setFailedAttempts(attempts);
    if (lockout > now) {
      setLockoutUntil(lockout);
      updateLockoutMessage(lockout);
    } else if (lockout > 0) {
      // Lockout expired
      localStorage.removeItem('col_log_lockout');
      setLockoutUntil(null);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (lockoutUntil && lockoutUntil > Date.now()) {
      interval = setInterval(() => {
        if (Date.now() > lockoutUntil) {
          setLockoutUntil(null);
          setLockoutMessage('');
          localStorage.removeItem('col_log_lockout');
          clearInterval(interval);
        } else {
          updateLockoutMessage(lockoutUntil);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const updateLockoutMessage = (until: number) => {
    const diff = Math.ceil((until - Date.now()) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    setLockoutMessage(`Locked. Try again in ${mins}m ${secs}s`);
  };

  const handleFailedAttempt = () => {
    const newFails = failedAttempts + 1;
    setFailedAttempts(newFails);
    localStorage.setItem('col_log_fails', newFails.toString());

    let lockDuration = 0;
    if (newFails >= 20) lockDuration = 60 * 60 * 1000; // 1 hour
    else if (newFails >= 15) lockDuration = 30 * 60 * 1000; // 30 mins
    else if (newFails >= 10) lockDuration = 15 * 60 * 1000; // 15 mins
    else if (newFails >= 5) lockDuration = 5 * 60 * 1000; // 5 mins

    if (lockDuration > 0) {
      const until = Date.now() + lockDuration;
      setLockoutUntil(until);
      localStorage.setItem('col_log_lockout', until.toString());
      updateLockoutMessage(until);
    }
  };

  const handleInitialAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    if (passwordInput === TARGET_PASSWORD) {
      setIsAuthenticated(true);
      // Reset fails on successful full auth? Yes.
      setFailedAttempts(0);
      localStorage.removeItem('col_log_fails');
    } else {
      handleFailedAttempt();
    }
    setPasswordInput('');
  };

  const executeWithPassword = (callback: () => void) => {
    if (lockoutUntil) {
      alert("System is currently locked due to too many failed attempts.");
      return;
    }
    setPasswordPromptCallback(() => callback);
    setPasswordPromptVisible(true);
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    if (promptPasswordInput === TARGET_PASSWORD) {
      setPasswordPromptVisible(false);
      setPromptPasswordInput('');
      if (passwordPromptCallback) passwordPromptCallback();
    } else {
      handleFailedAttempt();
      if (failedAttempts + 1 >= 5 && (failedAttempts + 1) % 5 === 0) {
        setPasswordPromptVisible(false); // hide prompt if locked out
      }
      alert("Incorrect password!");
    }
    setPromptPasswordInput('');
  };

  // Fetch Documents
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setSelectedDocs(new Set());
    const q = query(collection(db, selectedCollection));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocuments(docs);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedCollection, isAuthenticated]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    documents.forEach(doc => Object.keys(doc).forEach(key => keys.add(key)));
    return Array.from(keys).sort();
  }, [documents]);

  const filteredDocs = useMemo(() => {
    if (!searchTerm) return documents;
    const lower = searchTerm.toLowerCase();
    return documents.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(lower)));
  }, [documents, searchTerm]);

  const toggleDocSelection = (id: string) => {
    const next = new Set(selectedDocs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDocs(next);
  };

  const toggleAll = () => {
    if (selectedDocs.size === filteredDocs.length) setSelectedDocs(new Set());
    else setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
  };

  // Actions
  const handleInlineEdit = (id: string, field: string, currentValue: any) => {
    const newValue = window.prompt(`Enter new value for ${field}:`, String(currentValue || ''));
    if (newValue === null || newValue === String(currentValue || '')) return;

    executeWithPassword(async () => {
      try {
        await updateDoc(doc(db, selectedCollection, id), { [field]: newValue });
      } catch (err) {
        console.error("Inline edit failed", err);
        alert("Failed to update field.");
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedDocs.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedDocs.size} documents?`)) return;

    executeWithPassword(async () => {
      try {
        const ids = Array.from(selectedDocs);
        const CHUNK_SIZE = 400;
        
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const chunk = ids.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            batch.delete(doc(db, selectedCollection, id));
          });
          await batch.commit();
        }
        
        setSelectedDocs(new Set());
      } catch (err) {
        console.error("Bulk delete failed", err);
        alert("Failed to delete documents. Check console for details.");
      }
    });
  };

  const handleBulkUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocs.size === 0 || !bulkField) return;

    executeWithPassword(async () => {
      try {
        const ids = Array.from(selectedDocs);
        const CHUNK_SIZE = 400;
        
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const chunk = ids.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            batch.update(doc(db, selectedCollection, id), { [bulkField]: bulkValue });
          });
          await batch.commit();
        }
        
        setBulkUpdateModal(false);
        setBulkField('');
        setBulkValue('');
        setSelectedDocs(new Set());
      } catch (err) {
        console.error("Bulk update failed", err);
        alert("Failed to bulk update documents. Check console for details.");
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[#140E0A] border border-[#D4AF37]/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.15)] max-w-sm w-full space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
              <ShieldAlert className="text-red-500" size={32} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-widest text-[#D4AF37]">Collections Log</h1>
              <p className="text-[10px] text-[#A09E9A] uppercase tracking-wider mt-2">Restricted Director Access Only</p>
            </div>
          </div>

          <form onSubmit={handleInitialAuth} className="space-y-4">
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Enter Authorization Code"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                disabled={!!lockoutUntil}
                className="w-full bg-black border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-center tracking-widest text-white outline-none disabled:opacity-50"
              />
              {lockoutUntil && (
                <p className="text-xs text-red-500 font-bold text-center animate-pulse">{lockoutMessage}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={!!lockoutUntil || !passwordInput}
              className="w-full py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-fadeIn">
      {/* Sidebar Collections List */}
      <div className="w-full md:w-64 max-h-[30vh] md:max-h-full bg-[#140E0A] border border-white/5 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-[#D4AF37]/10 to-transparent">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
            <Layers size={14} />
            Collections
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {KNOWN_COLLECTIONS.map(col => {
            const isExpanded = selectedCollection === col;
            return (
              <div key={col} className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedCollection(col);
                    setSelectedDocumentId(null);
                    setActiveTab('analysis');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between group ${
                    isExpanded 
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] shadow-[inset_0_0_10px_rgba(212,175,55,0.1)]' 
                      : 'text-[#A09E9A] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database size={12} className={isExpanded ? "text-[#D4AF37]" : "text-[#A09E9A] group-hover:text-white transition-colors"} />
                    <span className="truncate max-w-[120px] md:max-w-[150px]">{col}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {isExpanded && (
                  <div className="pl-4 pr-1 py-2 space-y-2 relative before:absolute before:left-3 before:top-0 before:bottom-0 before:w-px before:bg-white/10">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" size={12} />
                      <input 
                        type="text" 
                        placeholder="Search IDs..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 focus:border-[#D4AF37] rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white outline-none transition-all placeholder:text-white/30"
                      />
                    </div>
                    
                    {filteredDocs.length > 0 && !loading && (
                      <div className="flex items-center justify-between px-2 mb-2">
                        <button onClick={toggleAll} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#A09E9A] hover:text-white transition-colors">
                          {selectedDocs.size === filteredDocs.length && filteredDocs.length > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
                          Select All
                        </button>
                      </div>
                    )}
                    
                    {loading ? (
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest pl-2">Loading...</div>
                    ) : filteredDocs.length === 0 ? (
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest pl-2">No docs found</div>
                    ) : (
                      <div className="space-y-0.5 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                        {filteredDocs.map(doc => (
                          <div key={doc.id} className="flex items-center gap-1 px-1">
                            <button
                              onClick={() => toggleDocSelection(doc.id)}
                              className={`p-1.5 rounded transition-colors ${selectedDocs.has(doc.id) ? 'text-[#D4AF37]' : 'text-white/20 hover:text-white/50'}`}
                            >
                              {selectedDocs.has(doc.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDocumentId(doc.id);
                                setActiveTab('spotlight');
                              }}
                              className={`flex-1 text-left px-2 py-1.5 rounded-md text-[10px] font-mono truncate transition-all ${
                                selectedDocumentId === doc.id
                                  ? 'bg-[#D4AF37] text-black font-black'
                                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {doc.id}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Data View */}
      <div className="flex-1 flex flex-col bg-[#140E0A] border border-white/5 rounded-2xl overflow-hidden shadow-xl min-w-0">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-white">{selectedCollection}</h2>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/50">{documents.length} docs</span>
          </div>
          
          {selectedDocs.size > 0 && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mr-2">
                {selectedDocs.size} Selected
              </span>
              <button 
                onClick={() => setBulkUpdateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)]"
              >
                <Edit2 size={12} /> Bulk Edit
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)]"
              >
                <Trash2 size={12} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 px-4 bg-black/20 border-b border-white/5">
          <button 
            onClick={() => {
              setSelectedDocumentId(null);
              setActiveTab('analysis');
            }} 
            className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#A09E9A] hover:text-white'}`}
          >
            Analysis Report
          </button>
          {selectedDocumentId && (
            <button 
              onClick={() => setActiveTab('spotlight')} 
              className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'spotlight' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#A09E9A] hover:text-white'}`}
            >
              Document Spotlight
            </button>
          )}
        </div>

        {activeTab === 'analysis' ? (
          <div className="flex-1 relative overflow-hidden bg-black/20">
            <div className="absolute inset-0">
              <CollectionAnalyzer 
                collectionName={selectedCollection} 
                documents={filteredDocs} 
                executeWithPassword={executeWithPassword} 
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0">
              <DocumentSpotlight 
                collectionName={selectedCollection}
                document={documents.find(d => d.id === selectedDocumentId)}
                executeWithPassword={executeWithPassword}
                onClose={() => {
                  setSelectedDocumentId(null);
                  setActiveTab('analysis');
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Auth Prompt Modal */}
      {passwordPromptVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#140E0A] border border-[#D4AF37]/50 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(212,175,55,0.2)] animate-pulse-fast">
            <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock size={16} /> Authorization Required
            </h3>
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="Enter Password"
                value={promptPasswordInput}
                onChange={e => setPromptPasswordInput(e.target.value)}
                autoFocus
                className="w-full bg-black border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-2.5 text-sm text-center text-white outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPasswordPromptVisible(false); setPromptPasswordInput(''); }}
                  className="flex-1 py-2 text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {bulkUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#140E0A] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Edit2 size={16} className="text-blue-400" /> Bulk Update Field
            </h3>
            <form onSubmit={handleBulkUpdate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1.5">Field Name</label>
                <select
                  value={bulkField}
                  title="Select Field to Update"
                  onChange={e => setBulkField(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-400"
                >
                  <option value="">Select Field...</option>
                  {columns.filter(c => c !== 'id').map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1.5">New Value</label>
                <input
                  type="text"
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  placeholder="Leave empty to clear field"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkUpdateModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!bulkField}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                >
                  Update {selectedDocs.size} Docs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
