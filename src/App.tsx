import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { RequireAuth } from './components/RequireAuth';
import { RoleGuard } from './components/RoleGuard';

// Pages & Tabs
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { RosterTab } from './components/RosterTab';
import { CalendarTab } from './components/CalendarTab';
import { DirectorTab } from './components/DirectorTab';
import { ManagerDashboard } from './components/ManagerDashboard';
import { HostProfileEditor } from './components/HostProfileEditor';
import { ProfilesTab } from './components/ProfilesTab';
import { PublicLayout } from './components/PublicLayout';
import { PublicRoster } from './pages/PublicRoster';
import { PublicCalendar } from './pages/PublicCalendar';
import { PoppoLivePage } from './pages/PoppoLivePage';
import { AdminHub } from './components/AdminHub';
import { ProvisionUser } from './pages/ProvisionUser';
import { FinancialData } from './pages/FinancialData';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public Routes ───────────────────────────────────────── */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Navigate to="/poppo-live" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="roster" element={<PublicRoster />} />
          <Route path="calendar" element={<PublicCalendar />} />
          <Route path="poppo-live" element={<PoppoLivePage />} />
          {/* Legacy redirects */}
          <Route path="become-an-agent" element={<Navigate to="/poppo-live" replace />} />
          <Route path="leaderboards" element={<Navigate to="/roster" replace />} />
        </Route>

        {/* ── Protected Dashboard ──────────────────────────────────── */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          {/* Default landing */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Shared tabs (all authenticated roles) */}
          <Route path="dashboard" element={<Overview />} />
          <Route path="roster"    element={<RosterTab />} />
          <Route path="calendar"  element={<CalendarTab />} />

          {/* Host self-profile — Talent / Host roles */}
          <Route
            path="my-profile"
            element={
              <RoleGuard roles={['host']}>
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

          {/* Director/Head Admin control centre */}
          <Route
            path="director"
            element={
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
                <DirectorTab />
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
  );
}
