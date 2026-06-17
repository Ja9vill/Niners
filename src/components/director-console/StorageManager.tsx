import React, { useState } from 'react';
import { Search, Image as ImageIcon, File, Upload, Folder } from 'lucide-react';

export function StorageManager() {
  const [search, setSearch] = useState('');

  const files = [
    { name: 'profile_pics', type: 'folder', size: '--', updated: '2 days ago' },
    { name: 'reports', type: 'folder', size: '--', updated: '1 week ago' },
    { name: 'banner_summer.jpg', type: 'image', size: '2.4 MB', updated: '1h ago' },
    { name: 'config.json', type: 'file', size: '12 KB', updated: '3h ago' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#F5F5F5]">Storage</h2>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors">
          <Upload className="w-3 h-3" /> Upload
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0B0B0]" />
        <input 
          type="text" 
          placeholder="Search files..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-white/20"
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {files.filter(f => f.name.includes(search)).map((f, i) => (
          <div key={f.name} className={`flex items-center justify-between p-3 ${i !== files.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/10 cursor-pointer transition-colors`}>
            <div className="flex items-center gap-3">
              {f.type === 'folder' ? <Folder className="w-5 h-5 text-amber-500" /> : 
               f.type === 'image' ? <ImageIcon className="w-5 h-5 text-indigo-400" /> : 
               <File className="w-5 h-5 text-[#B0B0B0]" />}
              <div>
                <p className="font-bold text-sm text-[#F5F5F5] truncate max-w-[150px]">{f.name}</p>
                <p className="text-[10px] text-[#B0B0B0] font-mono">{f.size}</p>
              </div>
            </div>
            <span className="text-[10px] text-[#B0B0B0] uppercase font-bold">{f.updated}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
