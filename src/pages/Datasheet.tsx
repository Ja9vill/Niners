import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbxI-gtTa_gjoBHJZIZ1k7XYkXsEomPhBYi6oweGi_9_4GLC8YloEs72IOCj89EKBrQsfw/exec';

export const Datasheet: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch datasheet');
      const result = await response.json();
      
      // Check if it's the error object structure
      if (Array.isArray(result) && result[0]?.status === 'error') {
        throw new Error(result[0].message);
      }
      
      setData(Array.isArray(result) ? result : []);
      setLastSynced(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Determine columns from the first row of data
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Ensure "Timeslot" or similar time column is first if it exists
  const timeColumn = columns.find(c => c.toLowerCase().includes('time') || c.toLowerCase().includes('slot'));
  const sortedColumns = timeColumn 
    ? [timeColumn, ...columns.filter(c => c !== timeColumn)]
    : columns;

  return (
    <div className="relative flex flex-col h-full bg-[#050200] p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar animate-fadeIn">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/15 blur-[120px] rounded-full pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-[1600px] mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/20">
              <Database className="text-[#D4AF37]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">Datasheet</h1>
              <p className="text-xs text-[#A09E9A]">Live Google Sheets Integration</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lastSynced && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#A09E9A]">
                <Clock size={14} className="text-[#D4AF37]" />
                Last fetched: {lastSynced.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Sync Failed</p>
              <p className="text-xs text-red-400/80 mt-1">{error}</p>
              <p className="text-[10px] text-red-400/50 mt-2 font-mono">Ensure the Google Script URL is returning valid JSON array data.</p>
            </div>
          </div>
        )}

        <div className="bg-[#140E0A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar relative max-h-[70vh]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-40 bg-[#050200] shadow-md">
                <tr>
                  {sortedColumns.map((col, idx) => (
                    <th 
                      key={col} 
                      className={`p-4 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] whitespace-nowrap border-b border-white/5 bg-[#050200]
                        ${idx === 0 ? 'sticky left-0 z-50 border-r border-[#D4AF37]/30 shadow-[5px_0_15px_rgba(0,0,0,0.5)]' : ''}
                      `}
                    >
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={Math.max(1, sortedColumns.length)} className="p-12 text-center text-white/40 text-sm font-bold uppercase tracking-wider">
                      Loading datasheet...
                    </td>
                  </tr>
                ) : data.length === 0 && !error ? (
                  <tr>
                    <td colSpan={Math.max(1, sortedColumns.length)} className="p-12 text-center text-white/40 text-sm font-bold uppercase tracking-wider">
                      No data available
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-white/[0.02] transition-colors group">
                      {sortedColumns.map((col, colIdx) => (
                        <td 
                          key={col} 
                          className={`p-4 text-xs whitespace-nowrap border-b border-white/5
                            ${colIdx === 0 
                              ? 'sticky left-0 z-30 font-black text-[#D4AF37] bg-[#050200] group-hover:bg-[#140A00] border-r border-[#D4AF37]/30 shadow-[5px_0_15px_rgba(0,0,0,0.5)] transition-colors' 
                              : 'text-white'
                            }
                          `}
                        >
                          {String(row[col] || '')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
