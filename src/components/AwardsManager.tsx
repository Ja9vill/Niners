import React, { useState } from 'react';
import { Host, TopNinersEarningsSummary } from '../types';
import { Award } from 'lucide-react';
import { cn } from '../lib/utils';
import { AwardsService } from '../lib/AwardsService';

interface AwardsManagerProps {
  hosts: Host[];
  earningsSummaries: TopNinersEarningsSummary[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onAwardAssigned: (updatedSummary: TopNinersEarningsSummary) => void;
  auditLogAction: (actionType: string, beforeValue: any, afterValue: any) => Promise<void>;
}

export const AwardsManager: React.FC<AwardsManagerProps> = ({
  hosts,
  earningsSummaries,
  selectedMonth,
  onMonthChange,
  onAwardAssigned,
  auditLogAction
}) => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  return (
    <div className="space-y-8">
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-bold text-center">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-bold text-center">
          {errorMessage}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-xl flex items-center gap-2 text-[#F0EFE8]">
            <Award size={20} className="text-[#D4AF37]" />
            Custom Monthly Awards & Badges
          </h3>
          <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">Assign badges to top performing talent</p>
        </div>

        <div className="flex items-center gap-3 bg-[#1A1A28] p-2 px-4 rounded-xl border border-white/5">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]/50">Target Month:</span>
          <div className="flex items-center gap-1">
            <select
              value={selectedMonth.split('-')[0]}
              onChange={(e) => onMonthChange(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
              className="bg-transparent text-indigo-400 font-bold text-xs outline-none cursor-pointer focus:ring-0"
              title="Target Year selection"
            >
              <option value="2024" className="bg-[#1A1A28] text-[#F0EFE8]">2024</option>
              <option value="2025" className="bg-[#1A1A28] text-[#F0EFE8]">2025</option>
              <option value="2026" className="bg-[#1A1A28] text-[#F0EFE8]">2026</option>
              <option value="2027" className="bg-[#1A1A28] text-[#F0EFE8]">2027</option>
            </select>
            <span className="text-white/20 text-xs">-</span>
            <select
              value={selectedMonth.split('-')[1]}
              onChange={(e) => onMonthChange(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
              className="bg-transparent text-indigo-400 font-bold text-xs outline-none cursor-pointer focus:ring-0"
              title="Target Month selection"
            >
              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                <option key={m} value={m} className="bg-[#1A1A28] text-[#F0EFE8]">{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tech-card !p-0 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase tracking-widest bg-white/[0.02]">
              <th className="px-6 py-4">Poppo ID</th>
              <th className="px-6 py-4">Nickname</th>
              <th className="px-6 py-4">Month</th>
              <th className="px-6 py-4">Monthly Award Badge</th>
              <th className="px-6 py-4 text-right">Assign Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {hosts.map(host => {
              const summary = earningsSummaries.find(s => s.poppoId === host.id);
              const currentBadge = summary?.profilePhotoUrl || 'None';

              return (
                <tr key={host.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-400">{host.id}</td>
                  <td className="px-6 py-4 font-bold text-[#F0EFE8]">{host.nickname || host.name}</td>
                  <td className="px-6 py-4 text-[#A09E9A]/40">{selectedMonth}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      currentBadge !== 'None' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-[#222235] text-[#A09E9A] border-transparent'
                    )}>
                      {currentBadge}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        
                        try {
                          const updatedSummary = await AwardsService.assignBadge(
                            host.id,
                            host.nickname || host.name,
                            host.role || 'Host',
                            selectedMonth,
                            val,
                            auditLogAction
                          );
                          showSuccess(`Award badge assigned to ${host.nickname || host.name}`);
                          onAwardAssigned(updatedSummary);
                        } catch (err: any) {
                          showError(err.message || "Failed to assign award badge");
                        }
                      }}
                      value={currentBadge}
                      className="bg-[#1A1A28] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer"
                      title="Assign award badge"
                      aria-label="Assign award badge"
                    >
                      <option value="">-- Choose badge --</option>
                      <option value="Top Earner">🏆 Top Earner</option>
                      <option value="Rising Star">⭐ Rising Star</option>
                      <option value="Gifting Queen">💖 Gifting Queen</option>
                      <option value="PK Elite">⚔️ PK Elite</option>
                      <option value="None">None (Remove Badge)</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
