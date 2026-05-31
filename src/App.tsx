import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { RequireAuth } from './components/RequireAuth';
import { RoleGuard } from './components/RoleGuard';
import { Storage } from './lib/storage';

// Pages & Tabs
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { RosterTab } from './components/RosterTab';
import { CalendarTab } from './components/CalendarTab';
import { DirectorTab } from './components/DirectorTab';
import { ManagerDashboard } from './components/ManagerDashboard';
import { HostProfileEditor } from './components/HostProfileEditor';
import { PublicLayout } from './components/PublicLayout';
import { LandingPage } from './pages/LandingPage';
import { PublicRoster } from './pages/PublicRoster';
import { PublicCalendar } from './pages/PublicCalendar';
import { PoppoLivePage } from './pages/PoppoLivePage';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<Login />} />
          {/* New Public Routes */}
          <Route path="roster" element={<PublicRoster />} />
          <Route path="calendar" element={<PublicCalendar />} />
          <Route path="poppo-live" element={<PoppoLivePage />} />
          
          {/* Legacy Placeholder Routes */}
          <Route path="become-an-agent" element={<Navigate to="/poppo-live" replace />} />
          <Route path="leaderboards" element={<Navigate to="/roster" replace />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route 
          path="/app" 
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Overview />} />
          <Route path="roster" element={<RosterTab />} />
          <Route path="calendar" element={<CalendarTab />} />
          
          <Route 
            path="my-profile" 
            element={
              <RoleGuard roles={['talent', 'host']}>
                <HostProfileEditor />
              </RoleGuard>
            } 
          />

          <Route 
            path="profiles" 
            element={
              <RoleGuard roles={['director', 'manager', 'agent']}>
                <ManagerDashboard />
              </RoleGuard>
            } 
          />

          <Route 
            path="director" 
            element={
              <RoleGuard roles={['director']}>
                <DirectorTab />
              </RoleGuard>
            } 
          />

          {/* Catch-all */}
          <Route path="unauthorized" element={
            <div className="flex items-center justify-center h-full">
              <h2 className="text-xl font-bold text-red-400">Unauthorized Access</h2>
            </div>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
