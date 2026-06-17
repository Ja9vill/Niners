import { useState } from 'react';
import { HardDrive, Search, Image as ImageIcon, File, Upload, Folder } from 'lucide-react';

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
        <h2 className="text-xl font-bold">Storage</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
          <Upload className="w-3 h-3" /> Upload
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input 
          type="text" 
          placeholder="Search files..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {files.map((f, i) => (
          <div key={f.name} className={`flex items-center justify-between p-3 ${i !== files.length - 1 ? 'border-b border-neutral-800' : ''} hover:bg-neutral-800/50 cursor-pointer transition-colors`}>
            <div className="flex items-center gap-3">
              {f.type === 'folder' ? <Folder className="w-5 h-5 text-amber-500" /> : 
               f.type === 'image' ? <ImageIcon className="w-5 h-5 text-blue-400" /> : 
               <File className="w-5 h-5 text-neutral-400" />}
              <div>
                <p className="font-medium text-sm truncate max-w-[150px]">{f.name}</p>
                <p className="text-[10px] text-neutral-500">{f.size}</p>
              </div>
            </div>
            <span className="text-[10px] text-neutral-500">{f.updated}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
