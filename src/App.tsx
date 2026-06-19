import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { RequireAuth } from './components/RequireAuth';
import { RoleGuard } from './components/RoleGuard';
import { MobilePreviewFrame } from './components/MobilePreviewFrame';
import { useViewMode } from './hooks/useViewMode';

// Pages & Tabs
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { RosterTab } from './components/RosterTab';
import { CalendarTab } from './components/CalendarTab';
import { DirectorOperations } from './pages/DirectorOperations';
import { SystemLogsPage } from './pages/SystemLogsPage';
import { ManagerDashboard } from './components/ManagerDashboard';
import { HostProfileEditor } from './components/HostProfileEditor';
import { ProfilesTab } from './components/ProfilesTab';
import { PublicLayout } from './components/PublicLayout';
import { PublicRoster } from './pages/PublicRoster';
import { PublicCalendar } from './pages/PublicCalendar';
import { PoppoLivePage } from './pages/PoppoLivePage';
import { LearningResources } from './pages/LearningResources';
import { AdminHub } from './components/AdminHub';
import { ProvisionUser } from './pages/ProvisionUser';
import { FinancialData } from './pages/FinancialData';
import { PublicLanding } from './pages/PublicLanding';
import { AgencyPolicy } from './pages/AgencyPolicy';
import { OnboardingProcess } from './pages/OnboardingProcess';
import { Storage } from './lib/storage';
import { SmartRoute } from './components/SmartRoute';

const RootIndex = () => {
  const authState = Storage.getAuthState();
  if (authState.level > 0) {
    return <Navigate to="/dashboard" replace />;
  }
  return <PublicLanding />;
};

export default function App() {
  const { currentViewMode, setViewMode } = useViewMode();

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

        {/* ── Public Routes ───────────────────────────────────────── */}
        <Route element={<PublicLayout />}>
          {/* Dynamic Root Index inside public layout so it gets the footer when logged out */}
          <Route path="/" element={<RootIndex />} />
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
          <Route path="learning"  element={<LearningResources />} />

          {/* Host self-profile — Talent / Host roles */}
          <Route
            path="my-profile"
            element={
              <RoleGuard roles={['host', 'manager', 'agent', 'admin', 'director', 'head admin', 'head_admin']}>
                <HostProfileEditor />
              </RoleGuard>
            }
          />

          {/* All-member profile browser — restricted to director and head admin */}
          <Route
            path="profiles"
            element={
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
                <ProfilesTab />
              </RoleGuard>
            }
          />

          {/* Manager operational hub */}
          <Route
            path="hub"
            element={
              <RoleGuard roles={['director', 'manager', 'agent']}>
                <ManagerDashboard />
              </RoleGuard>
            }
          />

          {/* Director Operations */}
          <Route
            path="director-operations"
            element={
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
                <DirectorOperations />
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

          {/* Admin Hub page */}
          <Route
            path="admin-hub"
            element={
              <RoleGuard roles={['admin']}>
                <AdminHub />
              </RoleGuard>
            }
          />

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
