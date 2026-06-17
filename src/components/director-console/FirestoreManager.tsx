import React, { useState, useEffect } from 'react';
import { Search, Folder, FileJson, ChevronRight, Plus, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';
import { Storage } from '../../lib/storage';

export function FirestoreManager() {
  const [search, setSearch] = useState('');
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const authState = Storage.getAuthState();
      const res = await fetch('/api/admin/firestore/collections', {
        headers: { 'Authorization': `Bearer ${authState.token || ''}` }
      });
      const data = await res.json();
      if (data.collections) setCollections(data.collections);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (collectionId: string) => {
    setLoading(true);
    try {
      const authState = Storage.getAuthState();
      const res = await fetch(`/api/admin/firestore/documents/${collectionId}`, {
        headers: { 'Authorization': `Bearer ${authState.token || ''}` }
      });
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
        setSelectedCollection(collectionId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!selectedCollection) return;
    if (!window.confirm("Are you sure you want to delete this document? This cannot be undone.")) return;
    
    try {
      const authState = Storage.getAuthState();
      const res = await fetch(`/api/admin/firestore/documents/${selectedCollection}/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authState.token || ''}` }
      });
      if (res.ok) {
        fetchDocuments(selectedCollection);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  if (selectedCollection) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button aria-label="Back to collections" title="Back to collections" onClick={() => setSelectedCollection(null)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#B0B0B0] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-[#F5F5F5]">{selectedCollection}</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#B0B0B0]/60 bg-black/40 px-2 py-1 rounded border border-white/5 ml-auto">
            {documents.length} Docs
          </span>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : documents.map(doc => (
            <div key={doc.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 relative group">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-sm text-indigo-300 font-bold">{doc.id}</h3>
                <button 
                  onClick={() => deleteDocument(doc.id)}
                  className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <pre className="text-[10px] text-[#B0B0B0] font-mono bg-black/40 p-2 rounded border border-white/5 overflow-x-auto">
                {JSON.stringify(doc.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#F5F5F5]">Firestore</h2>
        <div className="flex items-center gap-2">
          <button onClick={fetchCollections} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#B0B0B0] transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0B0B0]" />
        <input 
          type="text" 
          placeholder="Search collections..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-white/20"
        />
      </div>

      <div className="space-y-2">
        {collections.filter(c => c.includes(search)).map((c) => (
          <button 
            key={c} 
            onClick={() => fetchDocuments(c)}
            className="w-full bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl p-4 flex items-center justify-between transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-sm text-[#F5F5F5]">{c}</p>
                <p className="text-[10px] uppercase tracking-widest text-[#B0B0B0] font-black mt-0.5">Collection</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B0B0B0] group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}
