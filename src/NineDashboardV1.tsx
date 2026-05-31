// noinspection All,HtmlFormInputWithoutLabel
// NOSONAR
/* eslint-disable */
/* eslint-disable i18next/no-literal-string */
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp, 
  LayoutDashboard, 
  Lock, 
  BookOpen,
  ArrowUpRight,
  TrendingDown,
  History,
  Activity,
  ChevronRight,
  Bell,
  Trash2,
  CheckCircle2,
  Menu,
  X,
  Trophy,
  MessageSquare,
  User,
  Settings,
  Shield
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { Storage } from './lib/storage';
import { FirebaseService } from './lib/firebaseService';
import { CommissionEntry, Host } from './types';
import { auth } from './lib/firebase';
import { HostProfileView } from './components/HostProfileView';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { INITIAL_HOSTS, INITIAL_COMMISSION, TIMELINE_DATA } from './lib/constants';
import { formatNumber, cn, formatDate, formatMonth } from './lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Globe, LogOut, Unlock, Loader2, Monitor, Smartphone, ExternalLink, FileText, UserPlus, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { RosterTab } from './components/RosterTab';
import { ProfilesTab } from './components/ProfilesTab';
import { TrendsTab } from './components/TrendsTab';
import { CalendarTab } from './components/CalendarTab';
import { DirectorTab } from './components/DirectorTab';
import { GlossaryTab } from './components/GlossaryTab';
import { DataReportingTab } from './components/DataReportingTab';
import { PrivacyTab } from './components/PrivacyTab';
import { TermsTab } from './components/TermsTab';
import { AgencyPolicyTab } from './components/AgencyPolicyTab';
import { AppUsersTab } from './components/AppUsersTab';
import { ManagerDashboard } from './components/ManagerDashboard';
import { NotificationPrompt } from './components/NotificationPrompt';

import { HomeTab } from './components/HomeTab';
import { UpdatePasswordTab } from './components/UpdatePasswordTab';
import { ProtectedRoute } from './components/ProtectedRoute';
import ChangePassword from './pages/ChangePassword';
import UserManagement from './pages/UserManagement';
import appLogo from './logo.jpg';

type Tab = 'home' | 'overview' | 'roster' | 'profiles' | 'trends' | 'calendar' | 'events' | 'dashboard' | 'reporting' | 'glossary' | 'privacy' | 'terms' | 'agency-policy' | 'account' | 'app-users' | 'update-password' | 'user-management' | 'tasks';

const PUBLIC_LINKS = [
  { label: 'Poppo Live', icon: Globe, href: 'https://invite=poppo.com/2kHNSf' },
  { label: 'Become an Agent', icon: UserPlus, href: 'https://invite=poppo.com/6CxxF5E' },
  { label: 'Social Media', icon: Share2, href: 'https://www.instagram.com' },
  { label: 'Agency Policy', icon: FileText, tab: 'agency-policy' as Tab },
  { label: 'Privacy Policy', icon: Shield, tab: 'privacy' as Tab },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as Tab;
    if (tabParam) return tabParam;
    return 'home';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commission, setCommission] = useState<CommissionEntry[]>([]);
  const [logs, setLogs] = useState(Storage.getLogs());
  const [notifications, setNotifications] = useState(Storage.getNotifications());
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    try { return localStorage.getItem('nine-view-mode') === 'mobile'; } catch { return false; }
  });
  const [showViewToggle, setShowViewToggle] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [appAuthState, setAppAuthState] = useState<'LOADING' | 'AUTHENTICATED' | 'FORCE_PASSWORD_CHANGE' | 'UNAUTHENTICATED'>('LOADING');

  // Persist view mode
  useEffect(() => {
    try { localStorage.setItem('nine-view-mode', isMobileView ? 'mobile' : 'desktop'); } catch {}
  }, [isMobileView]);

  useEffect(() => {
    setIsAuthChecking(true);
    setAppAuthState('LOADING');
    console.log("[AuthGating] Subscribing to onAuthStateChanged...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthGating] onAuthStateChanged listener triggered. User:", user ? { uid: user.uid, email: user.email } : null);
      setIsAuthChecking(true);
      setFirebaseUser(user);
      if (user) {
        try {
          // Changed from getIdTokenResult(true) to getIdTokenResult() to avoid infinite token refresh loops
          const tokenResult = await user.getIdTokenResult();
          const tempRequired = !!tokenResult.claims.tempPasswordRequired;
          setMigrationRequired(tempRequired);
          
          console.log("[AuthGating] Decoded claims tokenResult.claims:", tokenResult.claims);
          console.log("[AuthGating] Password migration status (tempPasswordRequired):", tempRequired);
          
          if (tempRequired) {
            console.log("[AuthGating] Transitioning appAuthState to FORCE_PASSWORD_CHANGE");
            setAppAuthState('FORCE_PASSWORD_CHANGE');
          } else {
            console.log("[AuthGating] Transitioning appAuthState to AUTHENTICATED");
            setAppAuthState('AUTHENTICATED');
          }
        } catch (err) {
          console.error("[AuthGating] Failed to retrieve custom claims:", err);
          setMigrationRequired(false);
          setAppAuthState('AUTHENTICATED');
        }

        // Automatically upgrade local storage session if Firebase reports verified admin
        if (user.email === 'jwavpr@gmail.com') {
          const currentAuth = Storage.getAuthState();
          if (currentAuth.role?.toLowerCase() !== 'director' || currentAuth.level < 5) {
            const newState = { 
              level: 5, 
              role: 'director', 
              name: user.displayName || 'Director Miss Nine', 
              poppo_id: '19157913' 
            };
            Storage.setAuthState(newState);
            setAuthState(newState);
            console.log("[AuthGating] Upgraded Director local storage state");
            await refreshState();
          }
        }
      } else {
        console.log("[AuthGating] No user found. Transitioning migrationRequired to false and appAuthState to UNAUTHENTICATED");
        setMigrationRequired(false);
        setAppAuthState('UNAUTHENTICATED');
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Route Guard Effect
  useEffect(() => {
    console.log("[AuthGating] Route Guard running:", { 
      isAuthChecking, 
      appAuthState, 
      activeTab, 
      migrationRequired, 
      firebaseUserUid: firebaseUser?.uid, 
      localAuthLevel: authState.level 
    });

    if (isAuthChecking || appAuthState === 'LOADING') return;

    const isUserAuthenticated = !!firebaseUser || authState.level > 0 || appAuthState === 'AUTHENTICATED' || appAuthState === 'FORCE_PASSWORD_CHANGE';
    const forceChange = migrationRequired || appAuthState === 'FORCE_PASSWORD_CHANGE';
    
    if (isUserAuthenticated && forceChange) {
      if (activeTab !== 'update-password') {
        console.log("[AuthGating] Route Guard: Redirecting authenticated user to update-password page");
        setActiveTab('update-password');
      }
    } else {
      if (activeTab === 'update-password') {
        console.log("[AuthGating] Route Guard: Redirecting non-migrating user back to home dashboard");
        setActiveTab('home');
      }
    }
  }, [activeTab, migrationRequired, isAuthChecking, appAuthState, firebaseUser, authState.level]);

  // Initialize data from Firebase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const fetchPromise = Promise.all([
          FirebaseService.getAllHosts(),
          FirebaseService.getAllCommissions()
        ]);
        const timeoutPromise = new Promise<[Host[], CommissionEntry[]]>((_, reject) =>
          setTimeout(() => reject(new Error("Initial Firebase sync timed out")), 5000)
        );
        const [firebaseHosts, firebaseCommissions] = await Promise.race([fetchPromise, timeoutPromise]);
        
        let finalHosts = firebaseHosts;
        Storage.setHosts(finalHosts);
        setHosts(finalHosts);
        
        if (firebaseCommissions.length > 0) {
          Storage.setCommission(firebaseCommissions);
          setCommission(firebaseCommissions);
        }
      } catch (err) {
        console.warn("Could not sync with cloud database. Local storage will be used if available.", err);
        let cachedHosts = Storage.getHosts();
        const cachedComms = Storage.getCommission();
        if (cachedHosts.length === 0) {
          const { getStaticHosts } = await import('./lib/staticHosts');
          cachedHosts = getStaticHosts();
        }
        setHosts(cachedHosts);
        Storage.setHosts(cachedHosts);
        if (cachedComms.length > 0) setCommission(cachedComms);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [authState.level]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    // Purge navigation, migration state, and local storage caches
    setMigrationRequired(false);
    setActiveTab('home');

    const newState = { level: 0, role: '', name: '', poppo_id: '' };
    Storage.setAuthState(newState);
    setAuthState(newState);

    try {
      const { PoppoAuthService } = await import('./lib/customAuth');
      const poppoAuth = new PoppoAuthService();
      await poppoAuth.wipeLocalAuthState();
    } catch (wipeErr) {
      console.warn("Could not execute security wipeLocalAuthState:", wipeErr);
    }
  };

  const handleMigrationSuccess = () => {
    setMigrationRequired(false);
    setAppAuthState('AUTHENTICATED');
    setActiveTab('home');
  };

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (path === '/dashboard' || path === '/home') {
        handleMigrationSuccess();
      } else if (path === '/change-password') {
        setActiveTab('update-password');
      } else if (path === '/user-management') {
        setActiveTab('user-management');
      }
    };
    window.addEventListener('app-navigate', handleNavigate);
    return () => window.removeEventListener('app-navigate', handleNavigate);
  }, []);

  const nukeSession = async () => {
    console.log("[NukeSession] Commencing emergency purge of all auth state, local storage, session storage, and cookies...");
    try {
      await signOut(auth);
      console.log("[NukeSession] Firebase Auth signOut successful.");
    } catch (e) {
      console.error("[NukeSession] Firebase Auth signOut failed:", e);
    }
    
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log("[NukeSession] HTML5 Web Storage cleared.");
    } catch (e) {
      console.error("[NukeSession] Web Storage clearing failed:", e);
    }

    try {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=9poppo.com";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.9poppo.com";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + window.location.hostname;
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=." + window.location.hostname;
      }
      console.log("[NukeSession] All cookies evicted.");
    } catch (e) {
      console.error("[NukeSession] Cookie eviction failed:", e);
    }

    alert("Auth state, storage, and cookies cleared. Hard-reloading app...");
    window.location.reload();
  };

  const refreshState = async () => {
    setAuthState(Storage.getAuthState());
    const [firebaseHosts, firebaseCommissions] = await Promise.all([
      FirebaseService.getAllHosts(),
      FirebaseService.getAllCommissions()
    ]);
    setHosts(firebaseHosts);
    setCommission(firebaseCommissions);
    setLogs(Storage.getLogs());
    setNotifications(Storage.getNotifications());
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    Storage.setNotifications(updated);
    setNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    Storage.setNotifications(updated);
    setNotifications(updated);
  };

  const renderContent = () => {
    const wrapProtected = (component: React.ReactNode) => (
      <ProtectedRoute
        appAuthState={appAuthState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        {component}
      </ProtectedRoute>
    );

    switch (activeTab) {
      case 'home': return <HomeTab hosts={hosts} commissions={commission} onOpenLogin={() => setShowLoginModal(true)} />;
      case 'overview': return wrapProtected(
        <AuthGate onAuthChange={refreshState}>
          <OverviewTab commissions={commission} hosts={hosts} />
        </AuthGate>
      );
      case 'roster': 
        return <ProfilesTab isReadOnly={authState.level === 0} />;
      case 'profiles': 
        const userRoleForProfiles = (authState.role || '').toLowerCase();
        if (userRoleForProfiles === 'manager' || userRoleForProfiles === 'agent') {
          return wrapProtected(
            <AuthGate onAuthChange={refreshState}>
              <ManagerDashboard />
            </AuthGate>
          );
        }
        return wrapProtected(
          <AuthGate onAuthChange={refreshState}>
            <ProfilesTab isReadOnly={false} />
          </AuthGate>
        );
      case 'tasks':
        return wrapProtected(
          <AuthGate onAuthChange={refreshState}>
            <ProfilesTab />
          </AuthGate>
        );
      case 'trends': return wrapProtected(
        <AuthGate onAuthChange={refreshState}>
          <TrendsTab />
        </AuthGate>
      );
      case 'calendar': return <CalendarTab isReadOnly={true} hosts={hosts} />;
      case 'events': return wrapProtected(
        <AuthGate onAuthChange={refreshState}>
          <CalendarTab isReadOnly={false} hosts={hosts} />
        </AuthGate>
      );
      case 'dashboard':
        if (authState.role?.toLowerCase() !== 'director') {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 select-none">
              <div className="w-16 h-16 rounded-2xl bg-red-950/30 flex items-center justify-center border border-red-900/50 shadow-lg shadow-red-950/20">
                <span className="text-2xl">🔒</span>
              </div>
              <p className="text-[#A09E9A] font-semibold text-sm">Access Denied</p>
              <p className="text-[#A09E9A]/60 text-xs">This panel is restricted to Directors only.</p>
            </div>
          );
        }
        return wrapProtected(
          <AuthGate onAuthChange={refreshState}>
            <DirectorTab />
          </AuthGate>
        );
      case 'reporting': return wrapProtected(
        <AuthGate onAuthChange={refreshState}>
          <DataReportingTab />
        </AuthGate>
      );
      case 'glossary': return <GlossaryTab />;
      case 'privacy': return <PrivacyTab />;
      case 'terms': return <TermsTab />;
      case 'agency-policy': return <AgencyPolicyTab />;
      case 'app-users': return wrapProtected(
        <AuthGate onAuthChange={refreshState}>
          <AppUsersTab currentUserRole={authState.role} />
        </AuthGate>
      );
      case 'account':
        if (authState.level === 0) {
          return wrapProtected(
            <AuthGate onAuthChange={refreshState}>
              <div className="hidden" />
            </AuthGate>
          );
        } else {
          const currentUserHost = hosts.find(h => h.id === authState.poppo_id) || {
            id: authState.poppo_id || '19157913',
            name: authState.name || 'Director Miss Nine',
            nickname: authState.nickname || authState.name || 'Director Miss Nine',
            position: authState.role || 'director',
            role: authState.role || 'director',
            team: authState.anchor_team || 'Director Only',
            manager: authState.manager_assigned || 'Self',
            anchor_type: 'Nine Agency',
            base_salary_category: 'N/A',
            status: 'Active',
            level: authState.level || 5,
            tier: 'S',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          return wrapProtected(<HostProfileView host={currentUserHost as any} isReadOnly={false} onProfileUpdated={refreshState} />);
        }
      case 'update-password':
        return <ChangePassword />;
      case 'user-management':
        return wrapProtected(
          <AuthGate onAuthChange={refreshState}>
            <UserManagement />
          </AuthGate>
        );
      default: return (
        <div className="flex items-center justify-center h-64 text-[#A09E9A]/30 italic">
          Section not found
        </div>
      );
    }
  };

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reporting', label: 'Reporting', icon: BookOpen, protected: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'events', label: 'Events', icon: Calendar, protected: true },
    { id: 'dashboard', label: 'Director Hub', icon: Lock, protected: true },
    { id: 'profiles', label: 'Management Hub', icon: Users, protected: true },
    { id: 'account', label: 'Account', icon: User },
    { id: 'overview', label: 'Analytics', icon: Activity, protected: true },
    { id: 'roster', label: 'Roster', icon: Users, protected: true },
    { id: 'trends', label: 'Trends', icon: TrendingUp, protected: true },
    { id: 'glossary', label: 'Glossary', icon: BookOpen },
    { id: 'update-password', label: 'Security', icon: Shield },
    { id: 'user-management', label: 'User Management', icon: Users, protected: true },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden app-bg">
      {/* Login Modal Overlay */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-sm"
            >
              <AuthGate onAuthChange={() => {
                refreshState();
                setShowLoginModal(false);
                setActiveTab('overview');
              }}>
                <div className="hidden" />
              </AuthGate>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                title="Close login modal"
                aria-label="Close login modal"
              >
                <X size={16} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* App shell */}
      <div className={cn(
        "min-h-screen transition-all duration-300 flex items-center justify-center p-0 app-bg",
        isMobileView ? "p-4" : ""
      )}>
        <div className={cn(
          "flex flex-col overflow-hidden transition-all duration-300",
          isMobileView
            ? "w-full max-w-[430px] h-[90vh] rounded-[36px] border border-[#D4AF37]/20 shadow-[0_0_80px_rgba(212,175,55,0.12)] relative app-bg"
            : "w-full h-screen"
        )}>
          {/* ===== HEADER ===== */}
          <header className="h-14 flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-[100] border-b app-header">
            <div className="flex items-center gap-3">
              {/* Hamburger — always visible */}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn(
                  "p-2 -ml-1 rounded-lg transition-colors text-[#A09E9A] hover:text-[#D4AF37] hover:bg-[#D4AF37]/08",
                  isMobileView ? "" : "md:hidden"
                )}
                title="Toggle navigation menu"
                aria-label="Toggle navigation menu"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              {/* Logo */}
              <button 
                onClick={() => { setActiveTab('home'); if (isMobileView) setIsSidebarOpen(false); }}
                className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l app-logo-border cursor-pointer hover:opacity-80 transition-opacity"
                title="Go to Home"
              >
                <img src={appLogo} alt="NINE TALENT MANAGEMENT Logo" className="h-9 w-9 rounded-xl border border-[#D4AF37]/30 shadow-md object-cover select-none pointer-events-none" />
                <span className="font-['Outfit'] font-black tracking-widest text-[#D4AF37] text-base uppercase hidden xs:block">
                  NINE TALENT MANAGEMENT
                </span>
              </button>
              <span className="hidden sm:block text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]/60 truncate max-w-[150px]">
                {navItems.find(n => n.id === activeTab)?.label || 'Portal'}
              </span>
          </div>
          
          {/* ===== RIGHT HEADER ACTIONS ===== */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Revert to Director Toggle */}
            {authState.originalRole === 'director' && (
              <button 
                onClick={() => {
                  Storage.setMockRole(null);
                  window.location.reload();
                }}
                className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors flex items-center gap-1.5 whitespace-nowrap mr-1"
                title="Revert to Director View"
              >
                <LogOut size={14} className="shrink-0" />
                <span className="hidden sm:inline">Revert</span>
              </button>
            )}
            
            {/* View Toggle */}
            <div className="relative">
              <button 
                onClick={() => setShowViewToggle(!showViewToggle)}
                className="p-2 rounded-lg transition-colors text-[#A09E9A] hover:text-[#D4AF37] hover:bg-[#D4AF37]/08"
                title="Switch view mode"
                aria-label="Switch view mode"
              >
                {isMobileView ? <Smartphone size={17} /> : <Monitor size={17} />}
              </button>
              <AnimatePresence>
                {showViewToggle && (
                  <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowViewToggle(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-44 rounded-xl shadow-2xl z-[120] p-1.5 overflow-hidden border app-dropdown"
                    >
                      <button 
                        onClick={() => { setIsMobileView(false); setShowViewToggle(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                          !isMobileView ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/05"
                        )}
                      >
                        <Monitor size={14} />
                        <span>Desktop View</span>
                      </button>
                      <button 
                        onClick={() => { setIsMobileView(true); setShowViewToggle(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                          isMobileView ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/05"
                        )}
                      >
                        <Smartphone size={14} />
                        <span>Mobile View</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Chat — logged in only */}
            {authState.level > 0 && (
              <button 
                className={cn("p-2 rounded-lg transition-colors text-[#A09E9A] hover:text-[#D4AF37] hover:bg-[#D4AF37]/08", migrationRequired && "opacity-30 cursor-not-allowed")}
                disabled={migrationRequired}
                title="Open Chat" aria-label="Open Chat"
              >
                <MessageSquare size={17} />
              </button>
            )}

            {/* Notifications */}
            {authState.level > 0 && (
              <div className="relative">
                <button 
                  onClick={() => { if (!migrationRequired) setShowNotifications(!showNotifications); }}
                  className={cn("relative p-2 rounded-lg transition-colors text-[#A09E9A] hover:text-[#D4AF37] hover:bg-[#D4AF37]/08", migrationRequired && "opacity-30 cursor-not-allowed")}
                  disabled={migrationRequired}
                  title="Notifications" aria-label="Notifications"
                >
                  <Bell size={17} />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#13131E]" />
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-[80]" onClick={() => setShowNotifications(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 rounded-2xl z-[90] p-0 overflow-hidden border shadow-2xl app-dropdown"
                      >
                        <div className="p-4 border-b flex items-center justify-between app-notif-header-border">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#A09E9A]">Notifications</h3>
                          <div className="flex items-center gap-2">
                            <button onClick={markAllRead} className="text-[10px] text-[#D4AF37] font-bold hover:underline">Mark all read</button>
                            <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg text-[#5A5865] hover:text-[#F0EFE8] hover:bg-white/05 transition-all" title="Close notifications">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div key={n.id} className={cn(
                                "p-4 border-b transition-colors relative group hover:bg-white/03 app-notif-border",
                                !n.read && "bg-[#D4AF37]/04"
                              )}>
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                    n.type === 'success' ? "bg-[#D4AF37]" : 
                                    n.type === 'warning' ? "bg-amber-500" :
                                    n.type === 'error' ? "bg-red-500" : "bg-blue-400"
                                  )} />
                                  <div className="space-y-0.5 pr-6">
                                    <p className="text-xs font-bold text-[#F0EFE8]">{n.title}</p>
                                    <p className="text-[11px] text-[#A09E9A] leading-relaxed">{n.message}</p>
                                    <p className="text-[9px] text-[#5A5865] font-mono">{formatDate(n.timestamp)}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => deleteNotification(n.id)}
                                  className="absolute right-2 top-2 p-1 text-[#5A5865] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                                  title="Delete notification" aria-label="Delete notification"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="p-12 text-center">
                              <Bell size={24} className="mx-auto text-[#5A5865] mb-2" />
                              <p className="text-xs text-[#5A5865] italic">No notifications yet</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Guest Sign In */}
            {authState.level === 0 && (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="btn-gold px-4 py-1.5 text-xs"
                title="Sign In" aria-label="Sign In"
              >
                Sign In
              </button>
            )}

            {/* User avatar + dropdown */}
            {authState.level > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs text-[#D4AF37] hover:border-[#D4AF37]/60 transition-all cursor-pointer app-avatar"
                  title="Open user menu" aria-label="Open user menu"
                >
                  {authState.name?.[0]?.toUpperCase() || 'U'}
                </button>
                
                <AnimatePresence>
                  {showUserDropdown && (
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={() => setShowUserDropdown(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-[120] p-2 overflow-hidden border app-dropdown"
                      >
                        <div className="px-3 py-2.5 border-b mb-1 app-notif-header-border">
                          <p className="text-xs font-bold text-[#F0EFE8] truncate">{authState.name}</p>
                          <p className="text-[10px] text-[#D4AF37]/70 font-medium truncate capitalize">{authState.role}</p>
                        </div>
                        <button 
                          onClick={() => { if (!migrationRequired) { setActiveTab('account'); setShowUserDropdown(false); } }}
                          disabled={migrationRequired}
                          className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/05 transition-all cursor-pointer flex items-center gap-2", migrationRequired && "opacity-50 cursor-not-allowed")}
                        >
                          <User size={14} className="text-[#D4AF37]" />
                          <span>View Profile</span>
                        </button>
                        <button 
                          onClick={() => { handleLogout(); setShowUserDropdown(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/08 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar backdrop overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "bg-black/70 backdrop-blur-sm z-[80]",
                  isMobileView ? "absolute inset-0" : "fixed inset-0 md:hidden"
                )}
              />
            )}
          </AnimatePresence>

          {/* ===== SIDEBAR ===== */}
            <nav className={cn(
              "app-sidebar inset-y-0 left-0 z-[90] w-64 flex flex-col p-4 transition-transform duration-300 border-r",
              isMobileView ? "absolute" : "fixed md:relative",
              isMobileView
                ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full")
                : (isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
            )}>
              <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                {/* Drawer header */}
                <div className="flex items-center justify-between pb-3 mb-1 border-b md:hidden app-divider-border">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Navigation</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/05 rounded-lg text-[#A09E9A] hover:text-[#F0EFE8] transition-all" title="Close sidebar" aria-label="Close sidebar">
                    <X size={16} />
                  </button>
                </div>

                {authState.level > 0 ? (
                  <>
                    <div className="nav-section-label mt-2">Command Center</div>
                    <div className="space-y-0.5">
                      <button 
                        onClick={() => { if (!migrationRequired) { setActiveTab('home'); setIsSidebarOpen(false); } }} 
                        className={cn('nav-item', activeTab === 'home' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                        disabled={migrationRequired}
                      >
                        <Trophy size={17} /><span>Dashboard</span>
                      </button>
                      <button 
                        onClick={() => { if (!migrationRequired) { setActiveTab('reporting'); setIsSidebarOpen(false); } }} 
                        className={cn('nav-item', activeTab === 'reporting' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                        disabled={migrationRequired}
                      >
                        <BookOpen size={17} /><span>Reporting</span>
                      </button>
                      <button 
                        onClick={() => { if (!migrationRequired) { setActiveTab('events'); setIsSidebarOpen(false); } }} 
                        className={cn('nav-item', activeTab === 'events' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                        disabled={migrationRequired}
                      >
                        <Calendar size={17} /><span>Events</span>
                      </button>

                      {/* Management / Specialized Hubs */}
                      {(authState.role?.toLowerCase() === 'director' || authState.role?.toLowerCase() === 'founder' || authState.level >= 2 || authState.role?.toLowerCase() !== 'host') && (
                        <div className="nav-section-label pt-3">[Management]</div>
                      )}
                      {(authState.role?.toLowerCase() === 'director' || authState.role?.toLowerCase() === 'founder') && (
                        <button 
                          onClick={() => { if (!migrationRequired) { setActiveTab('dashboard'); setIsSidebarOpen(false); } }} 
                          className={cn('nav-item', activeTab === 'dashboard' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                          disabled={migrationRequired}
                        >
                          <Lock size={17} /><span>Director Hub</span>
                        </button>
                      )}
                      {(authState.role?.toLowerCase() !== 'host') && (
                        <button 
                          onClick={() => { if (!migrationRequired) { setActiveTab('profiles'); setIsSidebarOpen(false); } }} 
                          className={cn('nav-item', activeTab === 'profiles' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                          disabled={migrationRequired}
                        >
                          <Users size={17} /><span>Management Hub</span>
                        </button>
                      )}
                      {authState.role?.toLowerCase() === 'director' && (
                        <button 
                          onClick={() => { if (!migrationRequired) { setActiveTab('app-users'); setIsSidebarOpen(false); } }} 
                          className={cn('nav-item', activeTab === 'app-users' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                          disabled={migrationRequired}
                        >
                          <Shield size={17} /><span>App Users</span>
                        </button>
                      )}
                      {(authState.role?.toLowerCase() === 'director' || authState.role?.toLowerCase() === 'admin') && (
                        <button 
                          onClick={() => { if (!migrationRequired) { setActiveTab('user-management'); setIsSidebarOpen(false); } }} 
                          className={cn('nav-item', activeTab === 'user-management' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                          disabled={migrationRequired}
                        >
                          <Users size={17} /><span>User Management</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* ===== LOGGED-OUT PUBLIC NAV ===== */
                  <>
                    <div className="nav-section-label mt-2">Explore</div>
                    <div className="space-y-0.5">
                      <button onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} className={cn('nav-item', activeTab === 'home' && 'active')}>
                        <Trophy size={17} /><span>Home</span>
                      </button>
                      <button onClick={() => { setActiveTab('calendar'); setIsSidebarOpen(false); }} className={cn('nav-item', activeTab === 'calendar' && 'active')}>
                        <Calendar size={17} /><span>Calendar</span>
                      </button>
                      <div className="nav-section-label pt-3">Links</div>
                      {PUBLIC_LINKS.map((link) => {
                        const Icon = link.icon;
                        if (link.href) {
                          return (
                            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                              onClick={() => setIsSidebarOpen(false)}
                              className="nav-item flex"
                            >
                              <Icon size={17} />
                              <span className="flex-1">{link.label}</span>
                              <ExternalLink size={11} className="text-[#5A5865]" />
                            </a>
                          );
                        }
                        return (
                          <button key={link.label}
                            onClick={() => { if (link.tab) setActiveTab(link.tab); setIsSidebarOpen(false); }}
                            className={cn('nav-item', link.tab && activeTab === link.tab && 'active')}
                          >
                            <Icon size={17} /><span>{link.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* View Toggle button */}
              <div className="px-2 mt-4 shrink-0">
                <button
                  onClick={() => setIsMobileView(!isMobileView)}
                  className="w-full py-2 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  {isMobileView ? <Monitor size={14} /> : <Smartphone size={14} />}
                  <span>Switch to {isMobileView ? 'Desktop' : 'Mobile'} View</span>
                </button>
              </div>

              {/* Reset session button */}
              <div className="px-2 mt-4 shrink-0">
                <button
                  onClick={nukeSession}
                  className="w-full py-2 border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  ⚠️ Nuke Session & Reset
                </button>
              </div>

              {/* Sidebar bottom: user card */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between app-divider-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs text-[#D4AF37] shrink-0 app-avatar">
                    {authState.level > 0 ? (authState.name?.[0]?.toUpperCase() || 'U') : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F0EFE8] truncate">{authState.level > 0 ? authState.name : 'Guest User'}</p>
                    <p className="text-[10px] font-medium text-[#5A5865] truncate capitalize">{authState.level > 0 ? authState.role : 'Visitor'}</p>
                  </div>
                </div>
                {authState.level > 0 ? (
                  <button onClick={handleLogout} className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0" title="Logout" aria-label="Logout">
                    <LogOut size={15} />
                  </button>
                ) : (
                  <button onClick={() => { setShowLoginModal(true); setIsSidebarOpen(false); }} className="btn-gold px-3 py-1.5 text-[10px] shrink-0">
                    Sign In
                  </button>
                )}
              </div>
            </nav>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto custom-scrollbar relative pb-16 md:pb-0 app-bg">
            <AnimatePresence mode="wait">
              {isLoading || isAuthChecking || appAuthState === 'LOADING' ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 app-bg"
                >
                  <div className="w-12 h-12 border-2 rounded-full animate-spin app-loader-spinner" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5A5865]">Establishing Secure Uplink</p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="max-w-6xl mx-auto p-4 sm:p-8"
                >
                  {renderContent()}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* ===== BOTTOM NAV (mobile) ===== */}
        <div className={cn(
          "left-0 right-0 h-[60px] flex items-center justify-around z-[100] select-none border-t app-header",
          isMobileView ? "absolute bottom-0" : "fixed bottom-0",
          isMobileView ? "" : "md:hidden"
        )}>
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'roster', label: 'Roster', icon: Users },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'dashboard', label: 'Hub', icon: LayoutDashboard }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id || (tab.id === 'home' && activeTab === 'overview');
            return (
              <button
                key={tab.id}
                onClick={() => { if (!migrationRequired) setActiveTab(tab.id as Tab); }}
                className={cn("flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors cursor-pointer relative", migrationRequired && "opacity-50 cursor-not-allowed")}
                disabled={migrationRequired}
                title={`Navigate to ${tab.label}`}
                aria-label={`Navigate to ${tab.label}`}
              >
                <Icon size={18} className={isSelected ? "text-[#D4AF37]" : "text-[#5A5865]"} />
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-wider",
                  isSelected ? "text-[#D4AF37]" : "text-[#5A5865]"
                )}>{tab.label}</span>
                {isSelected && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#D4AF37] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer — desktop only */}
        <footer className="h-9 border-t items-center justify-between px-8 text-[10px] text-[#5A5865] shrink-0 uppercase tracking-widest font-mono hidden md:flex app-header">
          <div className="flex items-center gap-4">
            <span>System Pulse: <span className="text-emerald-400">Stable</span></span>
            <span className="opacity-30">•</span>
            <button onClick={() => setActiveTab('privacy')} className={cn('hover:text-[#D4AF37] transition-all cursor-pointer normal-case tracking-wider', activeTab === 'privacy' && 'text-[#D4AF37]')}>Privacy</button>
            <span className="opacity-30">•</span>
            <button onClick={() => setActiveTab('terms')} className={cn('hover:text-[#D4AF37] transition-all cursor-pointer normal-case tracking-wider', activeTab === 'terms' && 'text-[#D4AF37]')}>Terms</button>
            <span className="opacity-30">•</span>
            <button onClick={() => setActiveTab('agency-policy')} className={cn('hover:text-[#D4AF37] transition-all cursor-pointer normal-case tracking-wider', activeTab === 'agency-policy' && 'text-[#D4AF37]')}>Agency Policy</button>
            {authState.level > 0 && (
              <><span className="opacity-30">•</span>
              <button onClick={handleLogout} className="hover:text-red-400 transition-all cursor-pointer normal-case tracking-wider text-red-400/70">Sign Out</button></>
            )}
          </div>
          <div className="text-[#5A5865]">© 2026 NINE Talent Mgmt</div>
        </footer>
        </div>
      </div>
      <NotificationPrompt />
    </div>
  );
}


// Sub-components (Tabs)
export const OverviewTab = ({ commissions, hosts }: { commissions: CommissionEntry[], hosts: Host[] }) => {
  const auth = Storage.getAuthState();
  const logs = Storage.getLogs();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const availableMonths = React.useMemo(() => {
    const months = Array.from(new Set(commissions.map(c => c.month)));
    return months.sort().reverse();
  }, [commissions]);

  const filteredCommissions = React.useMemo(() => {
    if (selectedFilter === 'all') return commissions;
    return commissions.filter(c => c.month === selectedFilter);
  }, [commissions, selectedFilter]);

  const totalCommissionPoints = filteredCommissions.reduce((sum, c) => sum + c.total_points, 0);
  const activeMonths = new Set(filteredCommissions.map(c => c.month)).size;
  const peakMonthEntry = [...filteredCommissions].sort((a, b) => b.total_points - a.total_points)[0];

  const hostRankings = React.useMemo(() => {
    return hosts.map(h => {
      const hostComms = filteredCommissions.filter(c => c.poppo_id === h.id);
      const totalPts = hostComms.reduce((sum, c) => sum + (c.total_points || 0), 0);
      const monthsActive = hostComms.length;
      return {
        ...h,
        totalPoints: totalPts,
        monthsActive
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [hosts, filteredCommissions]);

  const aggregatedData = React.useMemo(() => {
    const grouped = commissions.reduce((acc: Record<string, number>, curr) => {
      acc[curr.month] = (acc[curr.month] || 0) + curr.total_points;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [commissions]);

  const kpis = [
    { 
      label: 'Agency Total Points', 
      value: totalCommissionPoints > 0 ? `${(totalCommissionPoints / 1000000).toFixed(1)}M pts` : '0 pts', 
      icon: DollarSign, 
      protected: true 
    },
    { 
      label: 'Active Months', 
      value: `${activeMonths} Months`, 
      icon: Calendar 
    },
    { 
      label: 'Total Hosts', 
      value: hosts.length.toString(), 
      icon: Users 
    },
    { 
      label: 'Peak Period', 
      value: peakMonthEntry ? formatDate(peakMonthEntry.month) : 'N/A', 
      subValue: peakMonthEntry ? `${(peakMonthEntry.total_points / 1000000).toFixed(1)}M pts` : '', 
      icon: TrendingUp 
    },
  ];

  const sortedHosts = [...hostRankings].slice(0, 10).sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aVal: any = a[sortConfig.key as keyof typeof a];
    let bVal: any = b[sortConfig.key as keyof typeof b];

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <span className="opacity-0 group-hover:opacity-100 ml-1">⇅</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-indigo-400">↑</span> : <span className="ml-1 text-indigo-400">↓</span>;
  };

  if (hosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        <LayoutDashboard size={64} className="text-[#A09E9A]/5" />
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[#A09E9A]/50">Agency Overview Empty</h3>
          <p className="text-sm text-[#A09E9A]/30 max-w-sm mx-auto leading-relaxed">
            There is currently no data in the system. Go to the <span className="text-indigo-400 font-bold">Director Hub</span> to upload your first MasterSheet and initialize the dashboard.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-indigo-500/50 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass-card flex items-center justify-between group">
            <div>
              <p className="text-[#A09E9A]/40 text-[10px] font-bold uppercase tracking-[0.15em]">{kpi.label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                {kpi.protected && auth.level < 2 ? (
                  <div className="flex items-center gap-2 text-[#A09E9A]/20">
                    <span className="text-xl font-bold blur-sm select-none">XXXXXX</span>
                    <Lock size={14} />
                  </div>
                ) : (
                  <h3 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {kpi.value}
                  </h3>
                )}
                {kpi.subValue && <span className="text-xs text-cyan-400 font-medium">{kpi.subValue}</span>}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center transition-colors group-hover:bg-indigo-500/20">
              <kpi.icon size={18} className="text-[#A09E9A]/20 group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Commission Timeline */}
        <div className="lg:col-span-2 glass-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Activity size={18} className="text-purple-400" />
              Commission Timeline
              {auth.level < 2 && <Lock size={14} className="text-[#A09E9A]/20 ml-2" />}
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-tighter text-[#A09E9A]/30">
              {aggregatedData.length > 0 ? (
                <>
                  <span>{formatDate(aggregatedData[0].month)}</span>
                  <ChevronRight size={12} />
                  <span>{formatDate(aggregatedData[aggregatedData.length - 1].month)}</span>
                </>
              ) : (
                <span>No Data Available</span>
              )}
            </div>
          </div>

          <div className="h-64 w-full">
            {auth.level < 2 ? (
              <div className="w-full h-full flex flex-col items-center justify-center glass rounded-xl border border-dashed border-white/10 gap-3">
                <Lock size={24} className="text-[#A09E9A]/20" />
                <p className="text-[#A09E9A]/30 text-sm">Director authentication required to view financials</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData.map(c => ({
                  month: formatMonth(c.month),
                  value: c.value
                }))}>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass p-3 rounded-lg border border-white/10 shadow-xl">
                            <p className="text-xs text-[#A09E9A]/50 mb-1">{payload[0].payload.month}</p>
                            <p className="text-sm font-bold text-cyan-400">{formatNumber(payload[0].value as number)} pts</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {aggregatedData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill="#8b5cf6" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
             <div className="flex items-center justify-between text-[10px] font-black text-[#A09E9A]/20 uppercase tracking-[0.2em] mb-4">
              <span>Data Continuity Phase</span>
              <span>Total Volume Analysis</span>
             </div>
             <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-indigo-500/20 via-purple-500/40 to-emerald-500/20" />
             </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="glass-card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <History size={18} className="text-[#D4AF37]" />
              Activity Log
            </h3>
            <button className="text-xs font-bold text-cyan-400 hover:underline" title="Show all activity logs" aria-label="Show all activity logs">Show All</button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {logs.slice(0, 15).map((log, i) => (
              <div key={log.id} className="flex gap-3 text-sm border-b border-white/5 pb-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs">
                  {log.type === 'Auth' ? '🔐' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F0EFE8] line-clamp-2 leading-snug">{log.action}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-medium text-[#A09E9A]/60 uppercase">
                    <span className="text-cyan-400/70">{log.user}</span>
                    <span>•</span>
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-[#A09E9A]/20 italic">No recent activity detected</div>
            )}
          </div>
        </div>
      </div>
      
       {/* Ranking Table */}
      <div className="glass-card">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
               <TrendingUp size={18} className="text-[#ec4899]" />
               Agency Contributors Ranking
               {auth.level < 2 && <Lock size={14} className="text-[#A09E9A]/30 ml-2" />}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-[#A09E9A]/50 tracking-widest">Period:</span>
              <select 
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-[#1A1A28] border border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
                title="Select contributor ranking period"
              >
                <option value="all" className="bg-[#1A1A28] text-[#F0EFE8]">🏆 All-Time Record</option>
                {availableMonths.map(month => (
                  <option key={month} value={month} className="bg-[#1A1A28] text-[#F0EFE8]">{formatDate(month).includes(',') ? formatDate(month) : formatMonth(month)}</option>
                ))}
              </select>
            </div>
         </div>
          {auth.level < 2 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-[#A09E9A]/30">
               <Lock size={40} strokeWidth={1} />
               <p className="text-[#A09E9A]/60">Authenticated access required to view ranking data</p>
            </div>
         ) : (
            <>
             {/* Native Card View */}
             <div className="space-y-4">
               {sortedHosts.map((host, i) => (
                 <div key={host.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                       <span className="text-lg font-black text-[#A09E9A]/30">#{hostRankings.indexOf(host) + 1}</span>
                       <div>
                         <p className="font-bold text-[#F0EFE8] text-sm tracking-tight">{host.name}</p>
                         <p className="text-[10px] font-mono text-[#A09E9A]/50">ID: {host.id}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-bold text-emerald-400 font-mono">{formatNumber(host.totalPoints)} pts</p>
                       <p className="text-[10px] font-medium text-[#A09E9A]/60 uppercase">{host.base_salary_category}</p>
                     </div>
                   </div>
                   <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                     <span className="text-[#A09E9A]/50 uppercase tracking-widest font-bold">Frequency</span>
                     <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold">{host.monthsActive} Months</span>
                   </div>
                 </div>
               ))}
             </div>

             {sortedHosts.length === 0 && (
               <div className="py-20 text-center text-[#A09E9A]/30 italic">No rankings available for this period</div>
             )}
            </>
          )}
        </div>
      </div>
  );
};
