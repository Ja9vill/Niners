import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { CommissionEntry, Host } from '../types';
import { OverviewTab } from '../NineDashboardV1';

export const Overview = () => {
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedHosts, fetchedCommissions] = await Promise.all([
          FirebaseService.getAllHosts(),
          FirebaseService.getAllCommissions()
        ]);
        setHosts(fetchedHosts);
        setCommissions(fetchedCommissions);
      } catch (err) {
        console.error("Error fetching overview data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
        <p className="text-sm font-bold text-[#A09E9A] uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="text-[#D4AF37]" size={24} />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Dashboard Overview</h2>
      </div>
      <OverviewTab commissions={commissions} hosts={hosts} />
    </div>
  );
};
