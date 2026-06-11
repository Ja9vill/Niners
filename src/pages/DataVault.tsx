import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Tag, RefreshCcw, Database, AlertCircle, Sparkles, Filter, Lock } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { Storage } from '../lib/storage';
import { cn } from '../lib/utils';

export const DataVault: React.FC = () => {
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BULK' | 'SINGLE'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // AI Analysis States
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});

  const loadPending = async () => {
    setIsLoading(true);
    try {
      const items = await FirebaseService.getPendingStagingData();
      // Sort newest first
      const sorted = items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPendingItems(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (item: any) => {
    if (!window.confirm(`Are you sure you want to approve and LOCK this data into ${item.originalCollection}?`)) return;
    setProcessingId(item.id);
    try {
      await FirebaseService.approveStagingData(item);
      Storage.addNotification({
        title: 'Data Locked to Vault',
        message: `Successfully approved and locked data into ${item.originalCollection}.`,
        type: 'success'
      });
      await loadPending();
    } catch (e) {
      alert("Failed to approve. Check console.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item: any) => {
    if (!window.confirm("Are you sure you want to reject and discard this data?")) return;
    setProcessingId(item.id);
    try {
      await FirebaseService.rejectStagingData(item.id);
      Storage.addNotification({
        title: 'Data Rejected',
        message: `Rejected data submission for ${item.originalCollection}.`,
        type: 'warning'
      });
      await loadPending();
    } catch (e) {
      alert("Failed to reject. Check console.");
    } finally {
      setProcessingId(null);
    }
  };

  const generateMockAiAnalysis = (item: any) => {
    setAnalyzingId(item.id);
    // Simulate AI processing time
    setTimeout(() => {
      let analysisText = "";
      if (item.isBulk) {
        const count = item.items?.length || 0;
        let totalPoints = 0;
        item.items?.forEach((i: any) => {
          totalPoints += (i.total_earnings || i.total_points || 0);
        });
        analysisText = `✨ AI Summary: This bulk upload contains ${count} records targeting the '${item.originalCollection}' collection. The total points across all records equal ${totalPoints.toLocaleString()}. No immediate anomalies detected in formatting. Suggesting: APPROVE.`;
      } else {
        analysisText = `✨ AI Summary: Single record submission for '${item.originalCollection}'. Submitted by ${item.data?.reporter_name || 'Unknown'}. Everything appears standard.`;
      }
      setAiAnalysis(prev => ({ ...prev, [item.id]: analysisText }));
      setAnalyzingId(null);
    }, 1500);
  };

  const filteredItems = pendingItems.filter(item => {
    if (activeTab === 'BULK') return item.isBulk;
    if (activeTab === 'SINGLE') return !item.isBulk;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 relative z-10 pb-20">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#D4AF37]/10 to-transparent p-6 rounded-3xl border border-[#D4AF37]/20">
        <div>
          <h1 className="text-3xl font-black text-[#F0EFE8] uppercase tracking-widest drop-shadow-md flex items-center gap-3">
            <Database className="text-[#D4AF37]" size={32} />
            Data Vault
          </h1>
          <p className="text-white/60 text-sm mt-2 max-w-xl leading-relaxed">
            Review, analyze, and lock data submissions before they hit the active database. Data approved here is permanently locked.
          </p>
        </div>
        <button 
          onClick={loadPending}
          className="p-3 bg-[#13131E] hover:bg-[#1A1A28] border border-white/10 text-white/50 hover:text-[#D4AF37] rounded-xl transition-all"
          title="Refresh Queue"
        >
          <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex gap-2">
        {['ALL', 'BULK', 'SINGLE'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === tab
                ? "bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                : "bg-[#13131E] border border-white/10 text-white/50 hover:bg-[#1A1A28] hover:text-white"
            )}
          >
            {tab} Queue
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-20">
          <RefreshCcw className="animate-spin text-[#D4AF37]" size={32} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-[#13131E] border border-white/5 rounded-3xl">
          <Check className="text-emerald-500 mb-4" size={48} />
          <h3 className="text-lg font-black text-white/80 uppercase tracking-widest">Inbox Zero</h3>
          <p className="text-white/40 text-sm mt-2">All data submissions have been processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {filteredItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#13131E] border border-white/10 rounded-3xl overflow-hidden shadow-xl"
              >
                <div className="p-5 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      item.isBulk ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    )}>
                      {item.isBulk ? 'Bulk Upload' : 'Single Report'}
                    </div>
                    <span className="text-xs text-white/60 font-mono">{item.id}</span>
                  </div>
                  <div className="text-xs text-white/40 font-bold uppercase tracking-wider">
                    Target: <span className="text-[#D4AF37]">{item.originalCollection}</span>
                  </div>
                </div>

                <div className="p-6">
                  {item.isBulk ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-white">{item.items?.length || 0}</span>
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Records</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1">Bulk Data Upload</h4>
                          <p className="text-xs text-white/50">Submitted by: <span className="text-white/80">{item.submittedBy || 'Admin'}</span></p>
                          <p className="text-xs text-white/50">Time: <span className="text-white/80">{new Date(item.timestamp).toLocaleString()}</span></p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Single Record Payload</h4>
                        <p className="text-xs text-white/50">Submitted by: <span className="text-white/80">{item.data?.reporter_name || 'Unknown'}</span></p>
                      </div>
                      <pre className="bg-black/50 p-4 rounded-xl text-[10px] font-mono text-white/70 overflow-x-auto border border-white/5">
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* AI Analysis Section */}
                  <div className="mt-6 pt-6 border-t border-white/5">
                    {aiAnalysis[item.id] ? (
                      <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 flex items-start gap-3">
                        <Sparkles className="text-[#D4AF37] shrink-0 mt-0.5" size={18} />
                        <p className="text-sm text-[#D4AF37]/90 font-medium leading-relaxed">
                          {aiAnalysis[item.id]}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateMockAiAnalysis(item)}
                        disabled={analyzingId === item.id}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                      >
                        {analyzingId === item.id ? (
                          <RefreshCcw className="animate-spin" size={14} />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        {analyzingId === item.id ? 'Analyzing...' : 'Run AI Analysis'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleReject(item)}
                    disabled={processingId === item.id}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <X size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processingId === item.id}
                    className="flex items-center gap-2 px-6 py-2 bg-[#D4AF37] hover:bg-[#c4a130] text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20"
                  >
                    <Lock size={16} />
                    Approve & Lock Vault
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
