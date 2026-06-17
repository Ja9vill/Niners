<<<<<<< HEAD
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
=======
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { RequireAuth } from './components/RequireAuth';
import { RoleGuard } from './components/RoleGuard';
import { MobilePreviewFrame } from './components/MobilePreviewFrame';
import { useViewMode } from './hooks/useViewMode';
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93

// Pages & Tabs
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { NotificationControlCenter } from './pages/NotificationControlCenter';
import { RosterTab } from './components/RosterTab';
import { CalendarTab } from './components/CalendarTab';
<<<<<<< HEAD
import { DirectorTab } from './components/DirectorTab';

import { DataReportingTab } from './components/DataReportingTab';
import { PrivacyTab } from './components/PrivacyTab';
import { TermsTab } from './components/TermsTab';
import { AgencyPolicyTab } from './components/AgencyPolicyTab';
import { AppUsersTab } from './components/AppUsersTab';
import { ManagerDashboard } from './components/ManagerDashboard';

import { HomeTab } from './components/HomeTab';
import { UpdatePasswordTab } from './components/UpdatePasswordTab';
import { ProtectedRoute } from './components/ProtectedRoute';
import ChangePassword from './pages/ChangePassword';
import UserManagement from './pages/UserManagement';
import appLogo from './logo.jpg';

type Tab = 'home' | 'overview' | 'roster' | 'profiles' | 'trends' | 'calendar' | 'events' | 'dashboard' | 'reporting' | 'privacy' | 'terms' | 'agency-policy' | 'account' | 'app-users' | 'update-password' | 'user-management';

const PUBLIC_LINKS = [
  { label: 'Poppo Live', icon: Globe, href: 'https://invite=poppo.com/2kHNSf' },
  { label: 'Become an Agent', icon: UserPlus, href: 'https://invite=poppo.com/6CxxF5E' },
  { label: 'Social Media', icon: Share2, href: 'https://www.instagram.com' },
  { label: 'Agency Policy', icon: FileText, tab: 'agency-policy' as Tab },
  { label: 'Privacy Policy', icon: Shield, tab: 'privacy' as Tab },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commission, setCommission] = useState<CommissionEntry[]>([]);
  const [logs, setLogs] = useState(Storage.getLogs());
  const [notifications, setNotifications] = useState(Storage.getNotifications());
  const [showNotifications, setShowNotifications] = useState(false);
  const [browserNotificationPerm, setBrowserNotificationPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotificationPerm(Notification.permission);
    }
  }, []);

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
        const emailLower = (user.email || '').toLowerCase();
        if (emailLower === 'jwavpr@gmail.com' || emailLower === 'jwavp@gmail.com' || emailLower === 'missjapugh@gmail.com') {
          const currentAuth = Storage.getAuthState();
          if (currentAuth.role?.toLowerCase() !== 'director' || currentAuth.level < 5) {
            const newState = {
              ...currentAuth,
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

  useEffect(() => {
    // Run test performance reports cleanup on startup
    fetch('/api/auth/cleanup-test-reports', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.deletedIds && data.deletedIds.length > 0) {
          console.log(`[Startup Cleanup] Cleaned up test reports:`, data.deletedIds);
        }
      })
      .catch(err => console.warn('[Startup Cleanup] Failed to run database test report cleanup:', err));

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
        if (finalHosts.length === 0) {
          const cached = Storage.getHosts();
          if (cached.length > 0) {
            finalHosts = cached;
          } else {
            const { getStaticHosts } = await import('./lib/staticHosts');
            finalHosts = getStaticHosts();
          }
        }
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

    // Redirect to homepage
    window.location.href = '/';
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

  const handleRequestBrowserNotification = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserNotificationPerm(permission);
      if (permission === 'granted') {
        new Notification("Success!", {
          body: "Browser notifications are now enabled.",
          icon: appLogo
        });
      }
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
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
      case 'roster': return wrapProtected(<RosterTab />);
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
              <p className="text-[#B0B0B0] font-semibold text-sm">Access Denied</p>
              <p className="text-[#B0B0B0]/60 text-xs">This panel is restricted to Directors only.</p>
            </div>
          );
        }
        return wrapProtected(
          <AuthGate onAuthChange={refreshState}>
            <DirectorTab />
          </AuthGate>
        );
      case 'reporting':
        const reportingRole = (authState.role || '').toLowerCase();
        if (reportingRole !== 'director' && reportingRole !== 'founder' && reportingRole !== 'head admin' && reportingRole !== 'head_admin') {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 select-none">
              <div className="w-16 h-16 rounded-2xl bg-red-950/30 flex items-center justify-center border border-red-900/50 shadow-lg shadow-red-950/20">
                <span className="text-2xl">🔒</span>
              </div>
              <p className="text-[#B0B0B0] font-semibold text-sm">Access Denied</p>
              <p className="text-[#B0B0B0]/60 text-xs">This panel is restricted to leadership roles only.</p>
            </div>
          );
        }
        return wrapProtected(
          <AuthGate onAuthChange={refreshState}>
            <DataReportingTab />
          </AuthGate>
        );

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
        <div className="flex items-center justify-center h-64 text-[#B0B0B0]/30 italic">
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
    { id: 'update-password', label: 'Security', icon: Shield },
    { id: 'user-management', label: 'User Management', icon: Users, protected: true },
  ];
=======
import { DirectorOperations } from './pages/DirectorOperations';
import { SystemLogsPage } from './pages/SystemLogsPage';
import { HostProfileEditor } from './components/HostProfileEditor';
import { ProfilesTab } from './components/ProfilesTab';
import { PublicLayout } from './components/PublicLayout';
import { PublicRoster } from './pages/PublicRoster';
import { PublicCalendar } from './pages/PublicCalendar';
import { PoppoLivePage } from './pages/PoppoLivePage';
import { ProvisionUser } from './pages/ProvisionUser';
import { FinancialData } from './pages/FinancialData';
import { PublicLanding } from './pages/PublicLanding';
import { BlogManagement } from './pages/cms/BlogManagement';
import { PageAssetsCMS } from './pages/cms/PageAssetsCMS';
import { LivehouseData } from './pages/cms/LivehouseData';
import { DataVault } from './pages/DataVault';

import { ReportingPages } from './pages/ReportingPages';
import { CollectionsLog } from './pages/CollectionsLog';
import { AgencyPolicy } from './pages/AgencyPolicy';
import { OnboardingProcess } from './pages/OnboardingProcess';
import { LoginSetup } from './pages/public/LoginSetup';
import { FindPoppoIdGuide } from './pages/public/FindPoppoIdGuide';
import { WithdrawGuide } from './pages/public/WithdrawGuide';
import { PKBattlesGuide } from './pages/public/PKBattlesGuide';
import { AgentRegistrationGuide } from './pages/public/AgentRegistrationGuide';
import { RegionalLanding } from './pages/public/RegionalLanding';
import { BlogHub } from './pages/public/BlogHub';
import { BlogPostView } from './pages/public/BlogPostView';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { TermsOfService } from './pages/public/TermsOfService';
import { ContactUs } from './pages/public/ContactUs';
import { Storage } from './lib/storage';
import { SmartRoute } from './components/SmartRoute';
import { Analytics } from './pages/TeamAnalytics';
import { ReportData } from './pages/ReportData';

const RootIndex = () => {
  const authState = Storage.getAuthState();
  if (authState.level > 0) {
    return <Navigate to="/dashboard" replace />;
  }
  return <PublicLanding />;
};

export default function App() {
  const { currentViewMode, setViewMode } = useViewMode();
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93

  return (
    <MobilePreviewFrame 
      isMobileView={currentViewMode === 'mobile'}
      onClose={() => setViewMode('desktop')}
    >
      <BrowserRouter>
      <Routes>
        {/* ── Smart Shared Routes ────────────────────────────────── */}
        <Route path="roster" element={<SmartRoute publicElement={<PublicRoster />} privateElement={<RosterTab />} />} />
        <Route path="calendar" element={<SmartRoute publicElement={<PublicCalendar />} privateElement={<CalendarTab />} />} />
        <Route path="poppo-live" element={<SmartRoute publicElement={<PoppoLivePage />} privateElement={<PoppoLivePage />} />} />
        <Route path="become-an-agent" element={<Navigate to="/poppo-live" replace />} />
        <Route path="leaderboards" element={<Navigate to="/roster" replace />} />

<<<<<<< HEAD
      {/* App shell */}
      <div className={cn(
        "min-h-screen transition-all duration-300 flex items-center justify-center p-0 app-bg",
        isMobileView ? "p-4" : ""
      )}>
        <div className={cn(
          "flex flex-col overflow-hidden transition-all duration-300",
          isMobileView
            ? "w-full max-w-[430px] h-[90vh] rounded-[36px] border border-[#FFB800]/20 shadow-[0_0_80px_rgba(212,175,55,0.12)] relative app-bg"
            : "w-full h-screen"
        )}>
          {/* ===== HEADER ===== */}
          <header className="h-14 flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-[100] border-b app-header">
            <div className="flex items-center gap-3">
              {/* Hamburger — always visible */}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn(
                  "p-2 -ml-1 rounded-lg transition-colors text-[#B0B0B0] hover:text-[#FFB800] hover:bg-[#FFB800]/08",
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
                <img src={appLogo} alt="Niners App Logo" className="h-9 w-9 rounded-xl border border-[#FFB800]/30 shadow-md object-cover select-none pointer-events-none" />
                <span className="font-['Outfit'] font-black tracking-widest text-[#FFB800] text-base uppercase hidden xs:block">
                  Niners App
                </span>
              </button>
              <span className="hidden sm:block text-xs font-black uppercase tracking-[0.2em] text-[#FFB800]/60 truncate max-w-[150px]">
                {navItems.find(n => n.id === activeTab)?.label || 'Portal'}
              </span>
          </div>
          
          {/* ===== RIGHT HEADER ACTIONS ===== */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* View Toggle */}
            <div className="relative">
              <button 
                onClick={() => setShowViewToggle(!showViewToggle)}
                className="p-2 rounded-lg transition-colors text-[#B0B0B0] hover:text-[#FFB800] hover:bg-[#FFB800]/08"
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
                          !isMobileView ? "bg-[#FFB800]/15 text-[#FFB800]" : "text-[#B0B0B0] hover:text-[#F5F5F5] hover:bg-white/05"
                        )}
                      >
                        <Monitor size={14} />
                        <span>Desktop View</span>
                      </button>
                      <button 
                        onClick={() => { setIsMobileView(true); setShowViewToggle(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                          isMobileView ? "bg-[#FFB800]/15 text-[#FFB800]" : "text-[#B0B0B0] hover:text-[#F5F5F5] hover:bg-white/05"
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
                className={cn("p-2 rounded-lg transition-colors text-[#B0B0B0] hover:text-[#FFB800] hover:bg-[#FFB800]/08", migrationRequired && "opacity-30 cursor-not-allowed")}
                disabled={migrationRequired}
                title="Open Chat" aria-label="Open Chat"
              >
                <MessageSquare size={17} />
              </button>
            )}

            {/* Notifications */}
            {authState.level > 0 && (
              <div className="relative flex items-center">
                <button 
                  onClick={() => {
                    if (migrationRequired) return;
                    if (browserNotificationPerm === 'granted') {
                      setShowNotifications(!showNotifications);
                    } else {
                      if (browserNotificationPerm === 'default') {
                        handleRequestBrowserNotification();
                      } else {
                        alert("Notifications are blocked by your browser settings. Please click the lock/settings icon next to the URL in your browser address bar to allow permissions manually.");
                      }
                    }
                  }}
                  className={cn(
                    "relative p-2 px-3 rounded-xl transition-all flex items-center gap-1.5 border bg-black/40",
                    migrationRequired && "opacity-30 cursor-not-allowed",
                    browserNotificationPerm === 'granted'
                      ? "border-emerald-500/20 text-[#F5F5F5] hover:bg-emerald-500/5 hover:border-emerald-500/30"
                      : "border-red-500/20 text-[#B0B0B0] hover:bg-red-500/5 hover:border-red-500/30"
                  )}
                  disabled={migrationRequired}
                  title={browserNotificationPerm === 'granted' ? "Notifications" : "Activate Notifications"} 
                  aria-label="Notifications"
                >
                  <Bell size={14} />
                  
                  {/* Status Indicator Dot */}
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    browserNotificationPerm === 'granted' ? "bg-emerald-500" : "bg-red-500"
                  )} />

                  {/* Status Text Label */}
                  <span className="text-[9px] font-black uppercase tracking-wider hidden xs:inline">
                    {browserNotificationPerm === 'granted' ? 'Active' : 'Inactive'}
                  </span>

                  {/* Red dot indicator for unread messages if active */}
                  {browserNotificationPerm === 'granted' && notifications.some(n => !n.read) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
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
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0B0B0]">Notifications</h3>
                          <div className="flex items-center gap-2">
                            <button onClick={markAllRead} className="text-[10px] text-[#FFB800] font-bold hover:underline">Mark all read</button>
                            <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg text-[#707070] hover:text-[#F5F5F5] hover:bg-white/05 transition-all" title="Close notifications">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          {/* Browser Push Alerts Banner Row */}
                          {browserNotificationPerm === 'granted' ? (
                            <div className="px-4 py-2 border-b border-white/5 bg-[#FFB800]/05 flex items-center justify-center">
                              <span className="text-[9px] text-[#B0B0B0]/60 font-black uppercase tracking-wider">🟢 Browser Push Alerts: Enabled</span>
                            </div>
                          ) : (
                            <div className="p-3 mx-3 mt-3 mb-2 bg-amber-500/05 border border-amber-500/20 rounded-xl flex items-center justify-between">
                              <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider">⚠️ Browser Notifications: Inactive</span>
                              <button
                                onClick={() => {
                                  if (browserNotificationPerm === 'default') {
                                    handleRequestBrowserNotification();
                                  } else {
                                    alert("Notifications are blocked by your browser settings. Please click the lock/settings icon next to the URL in your browser address bar to allow permissions manually.");
                                  }
                                }}
                                className="px-3 py-1 bg-[#FFB800]/10 hover:bg-[#FFB800]/20 border border-[#FFB800]/30 text-[#FFB800] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                              >
                                {browserNotificationPerm === 'denied' ? 'How to Fix' : 'Activate'}
                              </button>
                            </div>
                          )}

                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div key={n.id} className={cn(
                                "p-4 border-b transition-colors relative group hover:bg-white/03 app-notif-border",
                                !n.read && "bg-[#FFB800]/04"
                              )}>
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                    n.type === 'success' ? "bg-[#FFB800]" : 
                                    n.type === 'warning' ? "bg-amber-500" :
                                    n.type === 'error' ? "bg-red-500" : "bg-blue-400"
                                  )} />
                                  <div className="space-y-0.5 pr-6">
                                    <p className="text-xs font-bold text-[#F5F5F5]">{n.title}</p>
                                    <p className="text-[11px] text-[#B0B0B0] leading-relaxed">{n.message}</p>
                                    <p className="text-[9px] text-[#707070] font-mono">{formatDate(n.timestamp)}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => deleteNotification(n.id)}
                                  className="absolute right-2 top-2 p-1 text-[#707070] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                                  title="Delete notification" aria-label="Delete notification"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="p-12 text-center">
                              <Bell size={24} className="mx-auto text-[#707070] mb-2" />
                              <p className="text-xs text-[#707070] italic">No notifications yet</p>
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
                  className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs text-[#FFB800] hover:border-[#FFB800]/60 transition-all cursor-pointer app-avatar"
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
                          <p className="text-xs font-bold text-[#F5F5F5] truncate">{authState.name}</p>
                          <p className="text-[10px] text-[#FFB800]/70 font-medium truncate capitalize">{authState.role}</p>
                        </div>
                        <button 
                          onClick={() => { if (!migrationRequired) { setActiveTab('account'); setShowUserDropdown(false); } }}
                          disabled={migrationRequired}
                          className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-[#B0B0B0] hover:text-[#F5F5F5] hover:bg-white/05 transition-all cursor-pointer flex items-center gap-2", migrationRequired && "opacity-50 cursor-not-allowed")}
                        >
                          <User size={14} className="text-[#FFB800]" />
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
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFB800]">Navigation</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/05 rounded-lg text-[#B0B0B0] hover:text-[#F5F5F5] transition-all" title="Close sidebar" aria-label="Close sidebar">
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
                      {(authState.role?.toLowerCase() === 'director' || authState.role?.toLowerCase() === 'founder' || authState.role?.toLowerCase() === 'head admin' || authState.role?.toLowerCase() === 'head_admin') && (
                        <button 
                          onClick={() => { if (!migrationRequired) { setActiveTab('reporting'); setIsSidebarOpen(false); } }} 
                          className={cn('nav-item', activeTab === 'reporting' && 'active', migrationRequired && 'opacity-50 cursor-not-allowed')}
                          disabled={migrationRequired}
                        >
                          <BookOpen size={17} /><span>Reporting</span>
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
                              <ExternalLink size={11} className="text-[#707070]" />
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
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs text-[#FFB800] shrink-0 app-avatar">
                    {authState.level > 0 ? (authState.name?.[0]?.toUpperCase() || 'U') : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F5F5F5] truncate">{authState.level > 0 ? authState.name : 'Guest User'}</p>
                    <p className="text-[10px] font-medium text-[#707070] truncate capitalize">{authState.level > 0 ? authState.role : 'Visitor'}</p>
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
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#707070]">Establishing Secure Uplink</p>
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
            { id: 'home', label: 'Top Niners', icon: Trophy },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'roster', label: 'Roster', icon: Users },
            { id: 'account', label: 'Account', icon: User }
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
                <Icon size={18} className={isSelected ? "text-[#FFB800]" : "text-[#707070]"} />
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-wider",
                  isSelected ? "text-[#FFB800]" : "text-[#707070]"
                )}>{tab.label}</span>
                {isSelected && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FFB800] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer — desktop only */}
        <footer className="h-9 border-t items-center justify-between px-8 text-[10px] text-[#707070] shrink-0 uppercase tracking-widest font-mono hidden md:flex app-header">
          <div className="flex items-center gap-4">
            <span>System Pulse: <span className="text-emerald-400">Stable</span></span>
            <span className="opacity-30">•</span>
            <button onClick={() => setActiveTab('privacy')} className={cn('hover:text-[#FFB800] transition-all cursor-pointer normal-case tracking-wider', activeTab === 'privacy' && 'text-[#FFB800]')}>Privacy</button>
            <span className="opacity-30">•</span>
            <button onClick={() => setActiveTab('terms')} className={cn('hover:text-[#FFB800] transition-all cursor-pointer normal-case tracking-wider', activeTab === 'terms' && 'text-[#FFB800]')}>Terms</button>
            <span className="opacity-30">•</span>
            <button onClick={() => setActiveTab('agency-policy')} className={cn('hover:text-[#FFB800] transition-all cursor-pointer normal-case tracking-wider', activeTab === 'agency-policy' && 'text-[#FFB800]')}>Agency Policy</button>
            {authState.level > 0 && (
              <><span className="opacity-30">•</span>
              <button onClick={handleLogout} className="hover:text-red-400 transition-all cursor-pointer normal-case tracking-wider text-red-400/70">Sign Out</button></>
            )}
          </div>
          <div className="text-[#707070]">© 2026 NINE Talent Mgmt</div>
        </footer>
      </div>
    </div>
  </div>
  );
}


// Sub-components (Tabs)
const OverviewTab = ({ commissions, hosts }: { commissions: CommissionEntry[], hosts: Host[] }) => {
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
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-[#FFB800]">↑</span> : <span className="ml-1 text-[#FFB800]">↓</span>;
  };

  if (hosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        <LayoutDashboard size={64} className="text-[#B0B0B0]/5" />
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[#B0B0B0]/50">Agency Overview Empty</h3>
          <p className="text-sm text-[#B0B0B0]/30 max-w-sm mx-auto leading-relaxed">
            There is currently no data in the system. Go to the <span className="text-[#FFB800] font-bold drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]">Director Hub</span> to upload your first MasterSheet and initialize the dashboard.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-gradient-to-r from-[#FFB800] to-[#FF3B5C] opacity-50 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div 
            key={i} 
            className="overview-glass-card flex items-center justify-between group"
          >
            <div>
              <p className="text-[#FFB800] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_0_5px_rgba(255,184,0,0.5)]">{kpi.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                {kpi.protected && auth.level < 2 ? (
                  <div className="flex items-center gap-2 text-[#F5F5F5]/40">
                    <span className="text-2xl font-black blur-sm select-none">XXXXXX</span>
                    <Lock size={16} />
                  </div>
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight text-[#F5F5F5]">
                    {kpi.value}
                  </h3>
                )}
                {kpi.subValue && <span className="text-sm text-[#FFB800] font-semibold drop-shadow-[0_0_5px_rgba(255,184,0,0.5)]">{kpi.subValue}</span>}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center transition-colors group-hover:bg-[#FFB800]/20 border border-white/5">
              <kpi.icon size={24} className="text-[#FFB800]/80 group-hover:text-[#FFB800] transition-colors drop-shadow-[0_0_8px_rgba(255,184,0,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(255,184,0,0.8)]" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission Timeline */}
        <div className="lg:col-span-2 overview-glass-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2 text-[#FFB800] drop-shadow-[0_0_5px_rgba(255,184,0,0.5)]">
              <Activity size={20} className="text-[#FFB800]" />
              Monthly Points Trend
              {auth.level < 2 && <Lock size={16} className="text-white/20 ml-2" />}
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-tighter text-[#B0B0B0]/30">
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
                <Lock size={24} className="text-[#B0B0B0]/20" />
                <p className="text-[#B0B0B0]/30 text-sm">Director authentication required to view financials</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData.map(c => ({
                  month: formatMonth(c.month),
                  value: c.value
                }))}>
                  <defs>
                    <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFB800" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#FF7B00" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,184,0,0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass p-3 rounded-lg border border-[#FFB800]/20 shadow-xl">
                            <p className="text-xs text-[#B0B0B0]/80 mb-1">{payload[0].payload.month}</p>
                            <p className="text-sm font-bold text-[#FFB800] drop-shadow-[0_0_5px_rgba(255,184,0,0.4)]">{formatNumber(payload[0].value as number)} pts</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {aggregatedData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#goldBar)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
             <div className="flex items-center justify-between text-[10px] font-black text-[#B0B0B0]/40 uppercase tracking-[0.2em] mb-4">
              <span>Data Continuity Phase</span>
              <span>Total Volume Analysis</span>
             </div>
             <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#FFB800]/30 via-[#FF7B00]/40 to-[#FF3B5C]/30" />
             </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="overview-glass-card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-[#FFB800] drop-shadow-[0_0_5px_rgba(255,184,0,0.5)]">
              <History size={20} className="text-[#FFB800]" />
              Activity Log
            </h3>
            <button className="text-xs font-bold text-[#FFB800] hover:text-[#FF7B00] transition-colors" title="Show all activity logs" aria-label="Show all activity logs">Show All</button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {logs.slice(0, 15).map((log, i) => (
              <div key={log.id} className="flex gap-3 text-sm border-b border-white/5 pb-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-xs shadow-inner">
                  {log.type === 'Auth' ? '🔐' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F5F5F5] line-clamp-2 leading-snug">{log.action}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-medium text-[#B0B0B0]/60 uppercase">
                    <span className="text-[#B388FF]/80">{log.user}</span>
                    <span>•</span>
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-[#B0B0B0]/30 italic">No recent activity detected</div>
            )}
          </div>
        </div>
      </div>
      
       {/* Ranking Table */}
      <div className="overview-glass-card">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-[#FFB800] drop-shadow-[0_0_5px_rgba(255,184,0,0.5)]">
               <TrendingUp size={20} className="text-[#FFB800]" />
               Agency Contributors Ranking
               {auth.level < 2 && <Lock size={16} className="text-white/30 ml-2" />}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-[#B0B0B0]/50 tracking-widest">Period:</span>
              <select 
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-[#F5F5F5] outline-none focus:border-[#FFB800] transition-all cursor-pointer"
                title="Select contributor ranking period"
              >
                <option value="all" className="bg-[#1A1A1A] text-[#F5F5F5]">🏆 All-Time Record</option>
                {availableMonths.map(month => (
                  <option key={month} value={month} className="bg-[#1A1A1A] text-[#F5F5F5]">{formatDate(month).includes(',') ? formatDate(month) : formatMonth(month)}</option>
                ))}
              </select>
            </div>
         </div>
          {auth.level < 2 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-[#B0B0B0]/30">
               <Lock size={40} strokeWidth={1} />
               <p className="text-[#B0B0B0]/60">Authenticated access required to view ranking data</p>
            </div>
         ) : (
            <>
             {/* Desktop Table View */}
             <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#FFB800]/10 text-[10px] font-bold text-[#B0B0B0]/60 uppercase tracking-widest">
                      <th className="px-4 py-3 cursor-pointer group hover:text-[#F5F5F5] transition-colors" onClick={() => requestSort('rank')}>
                        Rank <SortIcon column="rank" />
                      </th>
                      <th className="px-4 py-3 cursor-pointer group hover:text-[#F5F5F5] transition-colors" onClick={() => requestSort('id')}>
                        POPPO ID <SortIcon column="id" />
                      </th>
                      <th className="px-4 py-3 cursor-pointer group hover:text-[#F5F5F5] transition-colors" onClick={() => requestSort('name')}>
                        Name <SortIcon column="name" />
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer group hover:text-[#F5F5F5] transition-colors" onClick={() => requestSort('totalPoints')}>
                        Points <SortIcon column="totalPoints" />
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer group hover:text-[#F5F5F5] transition-colors" onClick={() => requestSort('commission')}>
                        Rate <SortIcon column="commission" />
                      </th>
                      <th className="px-4 py-3 text-center cursor-pointer group hover:text-[#F5F5F5] transition-colors" onClick={() => requestSort('monthsActive')}>
                        Freq <SortIcon column="monthsActive" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedHosts.map((host, i) => (
                       <tr key={host.id} className="table-row group">
                         <td className="px-4 py-4 font-bold text-[#B0B0B0]/60 text-base">#{hostRankings.indexOf(host) + 1}</td>
                         <td className="px-4 py-4 font-mono text-xs text-[#B388FF]/60">{host.id}</td>
                         <td className="px-4 py-4 font-bold text-[#F5F5F5]">{host.name}</td>
                         <td className="px-4 py-4 text-right font-mono text-sm text-[#FFB800] drop-shadow-[0_0_3px_rgba(255,184,0,0.3)]">
                           {formatNumber(host.totalPoints)} pts
                         </td>
                         <td className="px-4 py-4 text-right font-medium text-[10px] text-[#B0B0B0]/60">{host.base_salary_category}</td>
                         <td className="px-4 py-4 text-center">
                           <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FFB800]/10 border border-[#FFB800]/20 text-[10px] font-bold text-[#FFB800] shadow-inner">{host.monthsActive}</span>
                         </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             {/* Mobile Card View */}
             <div className="md:hidden space-y-4">
               {sortedHosts.map((host, i) => (
                 <div key={host.id} className="p-4 bg-black/40 rounded-xl border border-[#FFB800]/10 shadow-lg space-y-3">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                       <span className="text-lg font-black text-[#B0B0B0]/40">#{hostRankings.indexOf(host) + 1}</span>
                       <div>
                         <p className="font-bold text-[#F5F5F5] text-sm tracking-tight">{host.name}</p>
                         <p className="text-[10px] font-mono text-[#B388FF]/60">ID: {host.id}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-bold text-[#FFB800] font-mono drop-shadow-[0_0_3px_rgba(255,184,0,0.3)]">{formatNumber(host.totalPoints)} pts</p>
                       <p className="text-[10px] font-medium text-[#B0B0B0]/60 uppercase">{host.base_salary_category}</p>
                     </div>
                   </div>
                   <div className="pt-2 border-t border-[#FFB800]/10 flex justify-between items-center text-[10px]">
                     <span className="text-[#B0B0B0]/60 uppercase tracking-widest font-bold">Frequency</span>
                     <span className="px-2 py-0.5 rounded bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] font-bold">{host.monthsActive} Months</span>
                   </div>
                 </div>
               ))}
             </div>

             {sortedHosts.length === 0 && (
               <div className="py-20 text-center text-[#B0B0B0]/30 italic">No rankings available for this period</div>
             )}
            </>
          )}
        </div>
      </div>
  );
};
=======
        {/* ── Public Routes ───────────────────────────────────────── */}
        <Route element={<PublicLayout />}>
          {/* Dynamic Root Index inside public layout so it gets the footer when logged out */}
          <Route path="/" element={<RootIndex />} />
          <Route path="/guides/login" element={<LoginSetup />} />
          <Route path="/guides/find-poppo-id" element={<FindPoppoIdGuide />} />
          <Route path="/guides/withdraw-earnings" element={<WithdrawGuide />} />
          <Route path="/guides/how-pk-battles-work" element={<PKBattlesGuide />} />
          <Route path="/guides/how-to-register-agent" element={<AgentRegistrationGuide />} />
          <Route path="/region/:country" element={<RegionalLanding />} />
          <Route path="/blog" element={<BlogHub />} />
          <Route path="/blog/:slug" element={<BlogPostView />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/streamers" element={<OnboardingProcess />} />
          <Route path="login" element={<Login />} />
          <Route path="policy" element={<AgencyPolicy />} />
          <Route path="onboarding" element={<OnboardingProcess />} />
        </Route>

        {/* ── Protected Dashboard ──────────────────────────────────── */}
        <Route
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          {/* Shared tabs (all authenticated roles) */}
          <Route path="dashboard" element={<Overview />} />
          <Route path="report-data" element={<ReportData />} />
          <Route
            path="notifications-control"
            element={
              <RoleGuard roles={['director']}>
                <NotificationControlCenter />
              </RoleGuard>
            }
          />

          {/* My Profile — accessible to hosts and admin/manager/agent/head admin roles */}
          <Route
            path="my-profile"
            element={
              <RoleGuard roles={['host', 'admin', 'manager', 'agent', 'head admin', 'head_admin', 'director']}>
                <HostProfileEditor />
              </RoleGuard>
            }
          />

          {/* All-member profile browser — restricted to director */}
          <Route
            path="profiles"
            element={
              <RoleGuard roles={['director']}>
                <ProfilesTab />
              </RoleGuard>
            }
          />


          {/* Team Analytics */}
          <Route
            path="analytics"
            element={
              <RoleGuard roles={['manager', 'agent']}>
                <Analytics />
              </RoleGuard>
            }
          />

          {/* Director Operations */}
          <Route
            path="director-operations"
            element={
              <RoleGuard roles={['director']}>
                <DirectorOperations />
              </RoleGuard>
            }
          />

          {/* Data Vault */}
          <Route
            path="data-vault"
            element={
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
                <DataVault />
              </RoleGuard>
            }
          />

          {/* System Logs */}
          <Route
            path="system-logs"
            element={
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
                <SystemLogsPage />
              </RoleGuard>
            }
          />

          {/* CMS: Blog Management */}
          <Route
            path="cms/blogs"
            element={
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
                <BlogManagement />
              </RoleGuard>
            }
          />

          {/* CMS: Page Assets */}
          <Route
            path="cms/assets"
            element={
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
                <PageAssetsCMS />
              </RoleGuard>
            }
          />

          {/* CMS: Livehouse Data */}
          <Route
            path="cms/livehouse"
            element={
              <RoleGuard roles={['director']}>
                <LivehouseData />
              </RoleGuard>
            }
          />

          {/* Provision User (Director Only) */}
          <Route
            path="provision-user"
            element={
              <RoleGuard roles={['director']}>
                <ProvisionUser />
              </RoleGuard>
            }
          />

          {/* Financial Data (Director Only) */}
          <Route
            path="financial-data"
            element={
              <RoleGuard roles={['director']}>
                <FinancialData />
              </RoleGuard>
            }
          />

          {/* Team Financials (Agents/Managers) */}
          <Route
            path="team-financials"
            element={
              <RoleGuard roles={['manager', 'agent']}>
                <FinancialData isAgentMode={true} />
              </RoleGuard>
            }
          />

          {/* Reporting Pages (Director & Head Admin Access) */}
          <Route path="reporting/events" element={
            <RoleGuard roles={['director', 'head admin', 'head_admin']}>
              <ReportingPages collectionName="calendar" reportType="Events Log" />
            </RoleGuard>
          } />
          <Route path="reporting/attendance" element={
            <RoleGuard roles={['director', 'head admin', 'head_admin']}>
              <ReportingPages collectionName="attendance" reportType="Attendance Log" />
            </RoleGuard>
          } />
          <Route path="reporting/pk-performance" element={
            <RoleGuard roles={['director', 'head admin', 'head_admin']}>
              <ReportingPages collectionName="pk_reports" reportType="PK Performance" />
            </RoleGuard>
          } />
          <Route path="reporting/fanbase-health" element={
            <RoleGuard roles={['director', 'head admin', 'head_admin']}>
              <ReportingPages collectionName="fanbase_reports" reportType="Fanbase Health" />
            </RoleGuard>
          } />
          <Route path="reporting/assigned-badges" element={
            <RoleGuard roles={['director', 'head admin', 'head_admin']}>
              <ReportingPages collectionName="users" filterField="badges" reportType="Assigned Badges" />
            </RoleGuard>
          } />

          {/* Collections Log (Director Only) */}
          <Route path="collections-log" element={
            <RoleGuard roles={['director']}>
              <CollectionsLog />
            </RoleGuard>
          } />

          {/* Error pages */}
          <Route
            path="unauthorized"
            element={
              <div className="flex items-center justify-center h-full">
                <h2 className="text-xl font-bold text-red-400">Unauthorized Access</h2>
              </div>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </MobilePreviewFrame>
  );
}
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
