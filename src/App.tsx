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

          {/* My Profile — accessible to hosts and admin/manager/agent/head admin roles */}
          <Route
            path="my-profile"
            element={
              <RoleGuard roles={['host', 'admin', 'manager', 'agent', 'head admin', 'head_admin', 'director']}>
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
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
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
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
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
              <RoleGuard roles={['director', 'head admin', 'head_admin']}>
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

          {/* Reporting Pages (Director and Head Admin) */}
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
