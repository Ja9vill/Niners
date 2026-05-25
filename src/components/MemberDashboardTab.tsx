import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lock, 
  User, 
  Shield, 
  LayoutDashboard, 
  Calendar, 
  Activity, 
  Trophy,
  Fingerprint,
  Heart,
  Camera,
  Award,
  DollarSign,
  TrendingUp,
  BookOpen,
  LogOut,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { AuthGate } from './AuthGate';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { Host, CommissionEntry, DirectorNote } from '../types';
import { formatNumber, cn } from '../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';

// Sub panels
import { DataReportingTab } from './DataReportingTab';
import { EventsTab } from './EventsTab';
import { RoleBasedHub } from './RoleBasedHub';

interface MemberDashboardTabProps {
  hosts: Host[];
  commissions: CommissionEntry[];
  onRefresh: () => void;
  onLogout: () => void;
  OverviewTabComponent: React.FC<any>;
}

export const MemberDashboardTab: React.FC<MemberDashboardTabProps> = ({ 
  hosts, 
  commissions, 
  onRefresh, 
  onLogout,
  OverviewTabComponent
}) => {
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [activeSubView, setActiveSubView] = useState<'profile' | 'analytics' | 'events' | 'reporting' | 'role-hub'>('profile');
  
  // Loaded information for the user's profile
  const [myHostRecord, setMyHostRecord] = useState<Host | null>(null);
  const [myNotes, setMyNotes] = useState<DirectorNote[]>([]);
  const [myCommissions, setMyCommissions] = useState<CommissionEntry[]>([]);
  const [loadingProfileData, setLoadingProfileData] = useState(false);

  useEffect(() => {
    setAuthState(Storage.getAuthState());
  }, []);

  const handleAuthChange = () => {
    const current = Storage.getAuthState();
    setAuthState(current);
    setActiveSubView('profile');
    onRefresh();
  };

  const id = authState.poppo_id;

  useEffect(() => {
    if (authState.level > 0 && id) {
      setLoadingProfileData(true);
      const loadProfileData = async () => {
        try {
          // 1. Get host record
          const allHosts = await FirebaseService.getAllHosts();
          const found = allHosts.find(h => String(h.id) === String(id));
          if (found) {
            setMyHostRecord(found);
          } else {
            // Fallback object based on AuthState
            setMyHostRecord({
              id: authState.poppo_id,
              name: authState.name,
              nickname: authState.nickname || authState.name,
              position: authState.position || 'Talent',
              role: authState.role || 'Talent',
              team: authState.anchor_team || 'Alpha',
              manager: authState.manager_assigned || 'Ely',
              base_salary_category: 'S idol',
              status: authState.status || 'Active',
              level: authState.level || 1,
              photoUrl: authState.profile_photo || '',
              description: 'Registered Member of Nine Agency.'
            } as Host);
          }

          // 2. Get notes
          const notes = await FirebaseService.getNotesByHost(id);
          setMyNotes(notes || []);

          // 3. Get User commissions
          const allCommissions = await FirebaseService.getAllCommissions();
          const filtered = allCommissions
            .filter(c => String(c.poppo_id) === String(id))
            .sort((a, b) => a.month.localeCompare(b.month));
          setMyCommissions(filtered);
        } catch (err) {
          console.error("Error loading profile details:", err);
        } finally {
          setLoadingProfileData(false);
        }
      };
      loadProfileData();
    }
  }, [authState.level, id]);

  const stats = useMemo(() => {
    if (myCommissions.length === 0) return { total: 0, avgHrs: 0, avgPtsHr: 0, livePct: 0, commPct: 0 };
    const latest = myCommissions[myCommissions.length - 1];
    const totalPoints = myCommissions.reduce((sum, c) => sum + (Number(c.total_points) || 0), 0);
    const totalHrs = myCommissions.reduce((sum, c) => sum + (Number(c.live_duration) || 0), 0);
    
    const liveEarnings = Number(latest.live_earnings) || 0;
    const commissionEarning = Number(latest.agentweb_commission_earning) || 0;
    const myCommission = Number(latest.my_commission) || 0;

    const livePct = commissionEarning > 0 ? (liveEarnings / commissionEarning) * 100 : 0;
    const commPct = commissionEarning > 0 ? (myCommission / commissionEarning) * 100 : 0;
    
    return {
      total: totalPoints,
      avgHrs: totalHrs / myCommissions.length,
      avgPtsHr: totalHrs > 0 ? totalPoints / totalHrs : 0,
      livePct: isNaN(livePct) ? 0 : livePct,
      commPct: isNaN(commPct) ? 0 : commPct
    };
  }, [myCommissions]);

  // If user is not logged in, render the login panel (AuthGate)
  if (authState.level === 0) {
    return (
      <div className="max-w-md mx-auto py-8">
        <AuthGate onAuthChange={handleAuthChange}>
          <div className="text-center text-slate-500 py-4">Authenticating Portal Access...</div>
        </AuthGate>
      </div>
    );
  }

  // Loaded user object
  const userPhoto = authState.profile_photo || myHostRecord?.photoUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100`;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24">
      {/* 2. AUTHENTICATED USER WELCOME BLOCK & LOGOUT */}
      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden border border-white/10 shrink-0">
            <img src={userPhoto} alt={authState.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">{authState.name}</h2>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-mono">
                {authState.role}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Poppo ID: {authState.poppo_id}</p>
          </div>
        </div>

        <button 
          onClick={() => {
            onLogout();
            setAuthState({ level: 0, role: '', name: '', poppo_id: '' });
          }}
          className="btn-secondary px-4 py-2.5 text-xs flex items-center gap-2 rounded-xl border-white/10 hover:border-red-500/30 hover:text-red-400 self-start sm:self-auto transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* SUB-MENU TABS FOR LOGGED IN USERS */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'analytics', label: 'All-Niner Trends', icon: LayoutDashboard },
          { id: 'events', label: 'Events Workspace', icon: Calendar },
          { id: 'reporting', label: 'Report Submissions', icon: Activity },
          // Hubs are available for non-Talent or special leadership roles matching RoleBasedHub specification
          { id: 'role-hub', label: `${authState.role === 'Director' ? "Director Hub" : "Role Hub"}`, icon: Shield }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubView(item.id as any)}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeSubView === item.id 
                  ? "bg-indigo-600/25 border border-indigo-500/20 text-indigo-400" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* INNER VIEW CONTENT */}
      <div className="mt-6">
        {activeSubView === 'profile' && (
          <div className="space-y-8 animate-fade-in">
            {loadingProfileData ? (
              <div className="p-20 text-center text-white/20 italic">Synchronizing Database Record...</div>
            ) : myHostRecord ? (
              <div className="space-y-12">
                
                {/* --- 1. BASIC PROFILE INFORMATION --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Fingerprint size={14} className="text-indigo-400" />
                    1. Basic Profile Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Nickname</span><span className="text-xs font-bold text-white">{myHostRecord.nickname || 'N/A'}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Full name</span><span className="text-xs font-bold text-white">{myHostRecord.name}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Poppo ID</span><span className="text-xs font-bold text-white font-mono">{myHostRecord.id}</span></div>
                       <div className="flex justify-between py-1.5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Position/Role</span><span className="text-xs font-bold text-white">{myHostRecord.position}</span></div>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Manager</span><span className="text-xs font-bold text-white">{myHostRecord.manager || 'Ely'}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Anchor team</span><span className="text-xs font-bold text-indigo-400">{myHostRecord.team || 'Alpha'}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Base Policy</span><span className="text-xs font-bold text-white">{myHostRecord.base_salary_category || 'S idol'}</span></div>
                       <div className="flex justify-between py-1.5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Status</span><span className="text-xs font-bold text-emerald-400">{myHostRecord.status || 'Active'}</span></div>
                    </div>
                  </div>
                  <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl italic text-xs text-slate-400 leading-relaxed">
                    "{myHostRecord.description || 'Welcome to the Nine Agency management engine.'}"
                  </div>
                </section>

                {/* --- 2. FANBASE KPI SECTION --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Heart size={14} className="text-pink-400" />
                    2. Fanbase KPI (Foreground: Subscribers & GC Members Only)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                    <div className="p-6 bg-[#fd2d78]/5 border border-[#fd2d78]/10 rounded-2xl">
                      <span className="text-[10px] font-black text-[#fd2d78] uppercase tracking-wider block mb-1">Subscribers</span>
                      <span className="text-2xl font-black text-white">
                        {Storage.getFanbaseHealth(myHostRecord.id)?.[0]?.subscribers || 140}
                      </span>
                    </div>
                    <div className="p-6 bg-indigo-50/5 border border-indigo-50/10 rounded-2xl">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block mb-1">GC Members</span>
                      <span className="text-2xl font-black text-white">
                        {Storage.getFanbaseHealth(myHostRecord.id)?.[0]?.gcMembers || 82}
                      </span>
                    </div>
                  </div>
                </section>

                {/* --- 3. EXPOSURE SUMMARY --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Camera size={14} className="text-cyan-400" />
                    3. Exposure Summary
                  </h3>
                  <div className="space-y-2">
                    {Storage.getExposures(myHostRecord.id).map((exp, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-white font-sans">{exp.event_type}</p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{exp.description}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">{exp.event_date}</span>
                      </div>
                    ))}
                    {Storage.getExposures(myHostRecord.id).length === 0 && (
                      <div className="p-8 text-center border border-dashed border-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 italic">No exposures recorded.</div>
                    )}
                  </div>
                </section>

                {/* --- 4. RANDOM PK SUMMARY --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Award size={14} className="text-amber-500" />
                    4. Random PK Summary
                  </h3>
                  <div className="overflow-hidden border border-white/5 rounded-2xl bg-[#0F1117]">
                     <table className="w-full text-left text-xs font-mono">
                       <thead className="bg-white/5 uppercase text-[9px] font-black text-slate-400">
                         <tr>
                           <th className="p-3">Session Date</th>
                           <th className="p-3 text-right">PK Win Rate</th>
                           <th className="p-3 text-right">Aggregate Score</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {Storage.getPKData(myHostRecord.id).map((pk, idx) => (
                           <tr key={idx} className="text-slate-300">
                             <td className="p-3">{new Date(pk.timestamp).toLocaleDateString()}</td>
                             <td className="p-3 text-right font-bold text-amber-500">{pk.win_percentage}%</td>
                             <td className="p-3 text-right text-emerald-400 font-bold">{formatNumber(pk.pk_score)}</td>
                           </tr>
                         ))}
                         {Storage.getPKData(myHostRecord.id).length === 0 && (
                           <tr>
                             <td colSpan={3} className="p-6 text-center text-slate-500 italic">No Random PK logs located.</td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                  </div>
                </section>

                {/* --- 5. UPCOMING EVENTS --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Calendar size={14} className="text-indigo-400" />
                    5. Upcoming Calendar Events
                  </h3>
                  <div className="space-y-3">
                     {Storage.getEvents().filter(e => e.poppo_id === myHostRecord.id || e.poppo_id === 'Agency').map((ev, idx) => (
                       <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                         <div>
                           <h4 className="font-bold text-white text-xs">{ev.title}</h4>
                           <p className="text-[10px] text-slate-400 mt-0.5">{ev.description}</p>
                         </div>
                         <div className="text-right font-mono text-[10px] text-slate-500">
                           <div>{ev.date}</div>
                           <div>{ev.time}</div>
                         </div>
                       </div>
                     ))}
                     {Storage.getEvents().filter(e => e.poppo_id === myHostRecord.id || e.poppo_id === 'Agency').length === 0 && (
                       <p className="text-[10px] font-bold text-slate-500 text-center py-4 uppercase tracking-widest italic border border-dashed border-white/5 rounded-xl">No active events listed.</p>
                     )}
                  </div>
                </section>

                {/* --- 6. FINANCIAL & LIVE METRICS --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <DollarSign size={14} className="text-emerald-400" />
                    6. Financial & Live Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Live duration</span>
                      <span className="text-sm font-bold text-white">{stats.avgHrs.toFixed(1)} hrs</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Gifting point score</span>
                      <span className="text-sm font-bold text-emerald-400">{formatNumber(stats.total)}</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Earnings share</span>
                      <span className="text-sm font-bold text-indigo-400">{stats.livePct.toFixed(1)}%</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">My commission</span>
                      <span className="text-sm font-bold text-pink-400">{stats.commPct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-42 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={myCommissions}>
                        <XAxis dataKey="month" hide />
                        <Tooltip contentStyle={{ backgroundColor: '#0c0d12', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                        <Bar dataKey="total_points" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* --- 7. OVERALL TOTALS & HISTORY --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <TrendingUp size={14} className="text-indigo-400" />
                    7. Cumulative Overall History
                  </h3>
                  <div className="space-y-2">
                    {myCommissions.map((comm, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-white">{comm.month} Ledger</span>
                        <span className="text-emerald-400 font-bold">{formatNumber(comm.total_points)} points</span>
                        <span className="text-slate-500">{comm.live_duration} streaming hours</span>
                      </div>
                    ))}
                    {myCommissions.length === 0 && (
                      <p className="text-[10px] text-slate-500 text-center py-4 uppercase tracking-widest italic font-bold">No historic ledger periods processed.</p>
                    )}
                  </div>
                </section>

                {/* --- 8. DIRECTOR'S STRATEGIC NOTES --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <BookOpen size={14} className="text-purple-400" />
                    8. Director's Strategic & Compliance Notes
                  </h3>
                  <div className="space-y-3">
                    {myNotes.map((note) => (
                      <div key={note.id} className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                        <div className="flex justify-between items-center mb-1 text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                          <span>{note.type} Log Entry</span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-semibold">"{note.content}"</p>
                      </div>
                    ))}
                    {myNotes.length === 0 && (
                      <p className="text-[10px] text-slate-500 text-center py-4 uppercase tracking-widest italic font-bold">No strategic directorship guidelines compiled.</p>
                    )}
                  </div>
                </section>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 italic">No associated personnel record located for ID {authState.poppo_id}</div>
            )}
          </div>
        )}

        {/* Operational sub-layers available to logged-in members */}
        {activeSubView === 'analytics' && (
          <div className="animate-fade-in">
            <OverviewTabComponent commissions={commissions} hosts={hosts} />
          </div>
        )}

        {activeSubView === 'events' && (
          <div className="animate-fade-in">
            <EventsTab />
          </div>
        )}

        {activeSubView === 'reporting' && (
          <div className="animate-fade-in">
            <DataReportingTab />
          </div>
        )}

        {activeSubView === 'role-hub' && (
          <div className="animate-fade-in">
            <RoleBasedHub />
          </div>
        )}
      </div>
    </div>
  );
};
