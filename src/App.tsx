
import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppProviders } from "@/components/providers/AppProviders";
import { RoleBasedDashboard } from "@/components/routing/RoleBasedDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ErrorBoundaryWrapper } from "@/components/ErrorBoundaryWrapper";
import { NotificationToastProvider } from "@/components/notifications/NotificationToast";
import { useErrorBoundary } from "@/hooks/useErrorBoundary";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load heavy components for better performance
const PlayersManagement = React.lazy(() => import("./pages/PlayersManagement"));
const Teams = React.lazy(() => import("./pages/Teams"));
const Schedule = React.lazy(() => import("./pages/Schedule"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const Medical = React.lazy(() => import("./pages/Medical"));
const Partners = React.lazy(() => import("./pages/Partners"));
const PartnershipManagement = React.lazy(() => import("./pages/PartnershipManagement"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Chat = React.lazy(() => import("./pages/Chat"));
const TeamGrid = React.lazy(() => import("./pages/TeamGrid"));
const UserManagement = React.lazy(() => import("./pages/UserManagement"));
const Evaluations = React.lazy(() => import("./pages/Evaluations"));
const HealthWellness = React.lazy(() => import("./pages/HealthWellness"));
const News = React.lazy(() => import("./pages/News"));
const NewsManager = React.lazy(() => import("./pages/NewsManager"));
const MedicalManagement = React.lazy(() => import("./pages/MedicalManagement"));
const ShotIQ = React.lazy(() => import("./pages/ShotIQ"));
const Security = React.lazy(() => import("./pages/Security"));
const TeamGridSettings = React.lazy(() => import("./pages/TeamGridSettings"));
const TryoutRubric = React.lazy(() => import("./pages/TryoutRubric"));
const NotificationSettings = React.lazy(() => import("./pages/NotificationSettings"));
const MembershipTypes = React.lazy(() => import("./pages/MembershipTypes"));
const StaffManagement = React.lazy(() => import("./pages/StaffManagement"));
const HRSection = React.lazy(() => import("./pages/HRSection"));
const DevHealth = React.lazy(() => import("./pages/DevHealth"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

function AppContent() {
  // Global unhandled promise rejection handler
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[App] Unhandled promise rejection:', event.reason);
      // We can't use error reporting here since auth might not be ready
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthContextualContent />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Component that uses auth-dependent hooks AFTER AuthProvider is mounted
function AuthContextualContent() {
  const { reportError } = useErrorBoundary('App');

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NotificationToastProvider />
      <BrowserRouter>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              }>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <ErrorBoundaryWrapper><Home /></ErrorBoundaryWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <ErrorBoundaryWrapper><Dashboard /></ErrorBoundaryWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/players" element={
                    <ProtectedRoute>
                      <ErrorBoundaryWrapper><PlayersManagement /></ErrorBoundaryWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/teams" element={
                    <RoleProtectedRoute allowedRoles={['super_admin', 'staff', 'coach']}>
                      <ErrorBoundaryWrapper><Teams /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/schedule" element={
                    <ProtectedRoute>
                      <ErrorBoundaryWrapper><Schedule /></ErrorBoundaryWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><Analytics /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/medical" element={
                    <RoleProtectedRoute allowedRoles={['super_admin', 'medical']}>
                      <ErrorBoundaryWrapper><Medical /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/partners" element={
                    <RoleProtectedRoute allowedRoles={['super_admin', 'partner']}>
                      <ErrorBoundaryWrapper><Partners /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <ErrorBoundaryWrapper><Settings /></ErrorBoundaryWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/user-management" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><UserManagement /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/evaluations" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><Evaluations /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/health-wellness" element={
                    <RoleProtectedRoute allowedRoles={['super_admin', 'medical', 'staff', 'coach', 'player']}>
                      <ErrorBoundaryWrapper><HealthWellness /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/news" element={
                    <ProtectedRoute>
                      <ErrorBoundaryWrapper><News /></ErrorBoundaryWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/news-manager" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><NewsManager /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <RoleProtectedRoute allowedRoles={['super_admin', 'staff', 'coach', 'player']}>
                      <ErrorBoundaryWrapper><Chat /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/teamgrid" element={
                    <RoleProtectedRoute allowedRoles={['super_admin', 'staff', 'coach']}>
                      <ErrorBoundaryWrapper><TeamGrid /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/shotiq" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><ShotIQ /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/partnership-management" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><PartnershipManagement /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/medical-management" element={
                    <RoleProtectedRoute allowedRoles={['super_admin', 'medical']}>
                      <ErrorBoundaryWrapper><MedicalManagement /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/security" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><Security /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/admin/teamgrid-settings" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><TeamGridSettings /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/settings/notifications" element={
                    <ProtectedRoute>
                      <ErrorBoundaryWrapper><NotificationSettings /></ErrorBoundaryWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/membership-types" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><MembershipTypes /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/admin/tryouts" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><TryoutRubric /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/admin/staff" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><StaffManagement /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/admin/staff/hr" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><HRSection /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/admin/staff/hr/*" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><HRSection /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="/dev/health" element={
                    <RoleProtectedRoute allowedRoles={['super_admin']}>
                      <ErrorBoundaryWrapper><DevHealth /></ErrorBoundaryWrapper>
                    </RoleProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
    );
}

const App = () => (
  <ErrorBoundaryWrapper>
    <AppContent />
  </ErrorBoundaryWrapper>
);

export default App;
