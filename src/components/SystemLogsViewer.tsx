import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { Search, Filter, AlertTriangle, Info, XCircle } from 'lucide-react';
import type { LogSeverity, SystemLog } from '../server/Logger';
import { format } from 'date-fns';

export const SystemLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<LogSeverity | 'All'>('All');
  const [filterUserId, setFilterUserId] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'system_logs'),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setLogs(data);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterSeverity !== 'All' && log.severity !== filterSeverity) return false;
    if (filterUserId && !log.userId?.toLowerCase().includes(filterUserId.toLowerCase())) return false;
    return true;
  });

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case 'Error': return <XCircle className="text-red-500" size={16} />;
      case 'Warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'Info': return <Info className="text-blue-500" size={16} />;
      default: return <Info className="text-slate-500" size={16} />;
    }
  };

  return (
    <div className="bg-[#1A1A28] border border-[#D4AF37]/15 rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wider">System Stability Logs</h2>
          <p className="text-[#A09E9A] text-xs mt-1">Monitor critical system events and errors</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search User ID..."
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full bg-slate-900 border border-[#D4AF37]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-[#D4AF37]/50 outline-none"
            />
          </div>
          <div className="relative flex-1 md:w-40">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <select
              title="Filter by Severity"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="w-full bg-slate-900 border border-[#D4AF37]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-[#D4AF37]/50 outline-none appearance-none"
            >
              <option value="All">All Severities</option>
              <option value="Error">Errors</option>
              <option value="Warning">Warnings</option>
              <option value="Info">Info</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D4AF37]/15">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-[10px] uppercase tracking-widest font-black">
              <th className="p-4 border-b border-[#D4AF37]/15">Timestamp</th>
              <th className="p-4 border-b border-[#D4AF37]/15">Severity</th>
              <th className="p-4 border-b border-[#D4AF37]/15">User / Role</th>
              <th className="p-4 border-b border-[#D4AF37]/15">Action Description</th>
            </tr>
          </thead>
          <tbody className="text-xs text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">Loading logs...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">No logs found matching filters.</td>
              </tr>
            ) : (
              filteredLogs.map((log, i) => (
                <tr key={i} className="border-b border-[#D4AF37]/10 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(log.severity)}
                      <span className={
                        log.severity === 'Error' ? 'text-red-400 font-bold' :
                        log.severity === 'Warning' ? 'text-amber-400 font-bold' :
                        'text-blue-400 font-bold'
                      }>
                        {log.severity}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {log.userId ? (
                      <div>
                        <span className="font-mono text-indigo-300">{log.userId}</span>
                        <span className="text-slate-500 ml-2">({log.userRole || 'Unknown'})</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">System</span>
                    )}
                  </td>
                  <td className="p-4 max-w-md">
                    <div className="font-medium text-slate-200">{log.actionDescription}</div>
                    {log.stackTrace && (
                      <pre className="mt-2 p-2 bg-slate-900 rounded text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {log.stackTrace}
                      </pre>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
