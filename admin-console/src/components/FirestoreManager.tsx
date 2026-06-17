import { useState } from 'react';
import { Search, Folder, FileJson, ChevronRight, Plus } from 'lucide-react';

export function FirestoreManager() {
  const [search, setSearch] = useState('');

  // Mock collections list
  const collections = [
    { id: 'users', count: 1245 },
    { id: 'events', count: 342 },
    { id: 'commissions', count: 8900 },
    { id: 'alerts', count: 12 },
    { id: 'settings', count: 1 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Firestore</h2>
        <button aria-label="Add Collection" title="Add Collection" className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input 
          type="text" 
          placeholder="Search collections..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Collections List */}
      <div className="space-y-2">
        {collections.filter(c => c.id.includes(search)).map((c) => (
          <button key={c.id} className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex items-center justify-between transition-colors text-left">
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium text-sm">{c.id}</p>
                <p className="text-xs text-neutral-500">{c.count} documents</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </button>
        ))}
      </div>

      {/* Empty State / Hint */}
      <div className="p-4 border border-dashed border-neutral-800 rounded-xl text-center mt-6">
        <FileJson className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
        <p className="text-xs text-neutral-500">Tap a collection to view documents.</p>
        <p className="text-[10px] text-neutral-600 mt-1">Full JSON editing is available inside documents.</p>
      </div>
    </div>
  );
}
