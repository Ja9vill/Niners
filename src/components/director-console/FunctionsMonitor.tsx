import React from 'react';
import { Activity, Play, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export function FunctionsMonitor() {
  const functions = [
    { name: 'processCommission', status: 'healthy', invocations: '1.2k', errors: 0, lastRun: '2m ago' },
    { name: 'syncUsers', status: 'warning', invocations: '850', errors: 12, lastRun: '1h ago' },
    { name: 'dailyReport', status: 'healthy', invocations: '1', errors: 0, lastRun: '12h ago' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-[#F5F5F5]">Cloud Functions</h2>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-[#B0B0B0] text-[10px] uppercase font-black tracking-widest">Total Invocations</p>
          <p className="text-2xl font-bold mt-1 text-[#F5F5F5]">2,051</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-[#B0B0B0] text-[10px] uppercase font-black tracking-widest">Error Rate</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">0.58%</p>
        </div>
      </div>

      {/* Function List */}
      <div className="space-y-3 pt-2">
        {functions.map(fn => (
          <div key={fn.name} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {fn.status === 'healthy' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-bold text-sm font-mono text-[#F5F5F5]">{fn.name}</span>
              </div>
              <button aria-label="Run function" title="Run function" className="w-7 h-7 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center hover:bg-indigo-500/20 transition-colors">
                <Play className="w-3 h-3 ml-0.5" />
              </button>
            </div>
            
            <div className="flex gap-4 mt-3 text-xs text-[#B0B0B0]">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" /> {fn.invocations}
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3" /> {fn.errors} errs
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {fn.lastRun}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
