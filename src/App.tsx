import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { RequireAuth } from './components/RequireAuth';
import { RoleGuard } from './components/RoleGuard';

// Pages & Tabs
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { RosterTab } from './components/RosterTab';
import { ProfilesTab } from './components/ProfilesTab';
import { CalendarTab } from './components/CalendarTab';
import { DirectorTab } from './components/DirectorTab';
import { PublicLayout } from './components/PublicLayout';
import { LandingPage } from './pages/LandingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<Login />} />
          {/* Add place holder routes to match navLinks from PublicLayout */}
          <Route path="become-an-agent" element={<Navigate to="/" replace />} />
          <Route path="leaderboards" element={<Navigate to="/" replace />} />
          <Route path="policy" element={<Navigate to="/" replace />} />
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
            path="profiles" 
            element={
              <RoleGuard roles={['director', 'manager', 'agent']}>
                <ProfilesTab />
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
