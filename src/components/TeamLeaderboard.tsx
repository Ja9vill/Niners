import React, { useMemo } from 'react';
import { Host } from '../types';
import { Trophy, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import { motion } from 'motion/react';

interface TeamLeaderboardProps {
  managedHosts: Host[];
  performanceReports: any[];
}

interface LeaderboardEntry {
  poppoId: string;
  nickname: string;
  currentEarnings: number;
  lastEarnings: number;
  currentRank: number;
  lastRank: number;
  isRisingStar: boolean;
}

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = React.memo(({ managedHosts, performanceReports }) => {
  const leaderboardData = useMemo(() => {
    if (!managedHosts || managedHosts.length === 0 || !performanceReports || performanceReports.length === 0) {
      return [];
    }

    const now = new Date();
    let currentMonth = now.getMonth() + 1;
    let currentYear = now.getFullYear();
    
    let lastMonth = currentMonth - 1;
    let lastYear = currentYear;
    if (lastMonth === 0) {
      lastMonth = 12;
      lastYear -= 1;
    }

    const hostStats = managedHosts.map(host => {
      const currentReport = performanceReports.find(
        r => r.poppoId === host.poppoId && r.month === currentMonth && r.year === currentYear
      );
      const lastReport = performanceReports.find(
        r => r.poppoId === host.poppoId && r.month === lastMonth && r.year === lastYear
      );

      const currentEarnings = Number(currentReport?.earningsBreakdown?.totalEarningsOfPoints || 0);
      const lastEarnings = Number(lastReport?.earningsBreakdown?.totalEarningsOfPoints || 0);

      // Climber logic (> 20% increase)
      let isRisingStar = false;
      if (lastEarnings > 0 && ((currentEarnings - lastEarnings) / lastEarnings) > 0.20) {
        isRisingStar = true;
      }

      return {
        poppoId: host.poppoId,
        nickname: host.nickname || 'Unknown Host',
        currentEarnings,
        lastEarnings,
        currentRank: 0,
        lastRank: 0,
        isRisingStar
      };
    });

    // Sort for last month to determine previous ranks
    const sortedLast = [...hostStats].sort((a, b) => b.lastEarnings - a.lastEarnings);
    sortedLast.forEach((h, index) => {
      const original = hostStats.find(x => x.poppoId === h.poppoId);
      if (original) original.lastRank = index + 1;
    });

    // Sort for current month
    const sortedCurrent = [...hostStats].sort((a, b) => b.currentEarnings - a.currentEarnings);
    sortedCurrent.forEach((h, index) => {
      h.currentRank = index + 1;
    });

    return sortedCurrent.slice(0, 5); // Top 5
  }, [managedHosts, performanceReports]);

  if (leaderboardData.length === 0) return null;

  return (
    <div className="bg-[#1A1A28]/50 border border-white/5 p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit flex items-center gap-2">
          <Trophy size={14} className="text-[#D4AF37]" />
          Team Leaderboard (Top 5)
        </h4>
        <span className="text-[8px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Current Month
        </span>
      </div>

      <div className="space-y-2">
        {leaderboardData.map((host, idx) => {
          const rankChange = host.lastRank - host.currentRank; // Positive means moved up (e.g. 5 -> 2 = +3)
          
          return (
            <motion.div 
              key={host.poppoId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#222235]/40 border border-white/5 p-3 rounded-xl flex items-center justify-between hover:border-[#D4AF37]/20 transition-colors shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-black/30 border border-white/10 text-xs font-black text-[#A09E9A]">
                  #{host.currentRank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#F0EFE8] leading-tight truncate max-w-[120px] md:max-w-[200px]">
                      {host.nickname}
                    </p>
                    {host.isRisingStar && (
                      <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">
                        <Star size={8} className="fill-[#D4AF37]" />
                        Rising Star
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#A09E9A] font-medium mt-0.5">
                    ID: {host.poppoId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-[#F0EFE8] tracking-tight">
                    {formatNumber(host.currentEarnings)}
                  </span>
                  <span className="text-[7px] font-bold text-[#A09E9A]/60 uppercase tracking-wider">
                    Points
                  </span>
                </div>
                
                <div className="w-8 flex justify-end">
                  {host.lastEarnings === 0 ? (
                    <span className="text-[10px] text-gray-500 font-bold">NEW</span>
                  ) : rankChange > 0 ? (
                    <div className="flex items-center gap-0.5 text-emerald-400">
                      <TrendingUp size={12} />
                      <span className="text-[9px] font-bold">{rankChange}</span>
                    </div>
                  ) : rankChange < 0 ? (
                    <div className="flex items-center gap-0.5 text-rose-400">
                      <TrendingDown size={12} />
                      <span className="text-[9px] font-bold">{Math.abs(rankChange)}</span>
                    </div>
                  ) : (
                    <Minus size={12} className="text-[#A09E9A]" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

TeamLeaderboard.displayName = 'TeamLeaderboard';
