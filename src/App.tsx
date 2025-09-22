import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppProviders } from "@/components/providers/AppProviders";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import { ErrorBoundaryWrapper } from "@/components/ErrorBoundaryWrapper";
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
const ExposurePortal = React.lazy(() => import("./pages/ExposurePortal"));

const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
        <Route path="/exposure-portal" element={
          <RoleProtectedRoute allowedRoles={['super_admin']}>
            <ErrorBoundaryWrapper><ExposurePortal /></ErrorBoundaryWrapper>
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
  );
}

const App = () => (
  <AppProviders>
    <AppRoutes />
  </AppProviders>
);

export default App;