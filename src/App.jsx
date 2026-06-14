import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from './pages/Login';
import Settings from './pages/Settings';
import AdminSettingsPage from './pages/AdminSettingsPage';
import SignatureSettings from './pages/SignatureSettings';
import Analytics from './pages/Analytics';
import Templates from './pages/Templates';
import ReportBug from './pages/ReportBug';

const isBugsSubdomain = typeof window !== 'undefined' &&
  window.location.hostname === 'bugs.pilatesinpinkstudio.com';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingPublicSettings } = useAuth();

  // Wait only for app public settings — per-route auth is handled by
  // ProtectedRoute (mirrors the pip-events pattern).
  if (isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const loginRedirect = <Navigate to="/Login" replace />;

  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        {/* Public routes */}
        <Route path="/Login" element={<Login />} />
        <Route
          path="/"
          element={isBugsSubdomain ? <Navigate to="/ReportBug" replace /> : <MainPage />}
        />
        {/* IntakeForm is the public client-facing form — keep it public */}
        {Object.entries(Pages).map(([path, Page]) => (
          path !== mainPageKey && <Route key={path} path={`/${path}`} element={<Page />} />
        ))}
        <Route path="/ReportBug" element={<ReportBug />} />
        <Route path="/ReportBug/new" element={<ReportBug />} />

        {/* Protected (staff) routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={loginRedirect} />}>
          <Route path="/Settings" element={<Settings />} />
          <Route path="/Settings/Admin" element={<AdminSettingsPage />} />
          <Route path="/Settings/Signature" element={<SignatureSettings />} />
          <Route path="/Settings/Templates" element={<Templates />} />
          <Route path="/Analytics" element={<Analytics />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App