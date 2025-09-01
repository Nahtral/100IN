
import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NotificationToastProvider } from "@/components/notifications/NotificationToast";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load heavy components for better performance
const Players = React.lazy(() => import("./pages/Players"));
const Teams = React.lazy(() => import("./pages/Teams"));
const Schedule = React.lazy(() => import("./pages/Schedule"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const Medical = React.lazy(() => import("./pages/Medical"));
const Partners = React.lazy(() => import("./pages/Partners"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Chat = React.lazy(() => import("./pages/Chat"));
const TeamGrid = React.lazy(() => import("./pages/TeamGrid"));
const UserManagement = React.lazy(() => import("./pages/UserManagement"));
const Evaluations = React.lazy(() => import("./pages/Evaluations"));
const HealthWellness = React.lazy(() => import("./pages/HealthWellness"));
const News = React.lazy(() => import("./pages/News"));
const NewsManager = React.lazy(() => import("./pages/NewsManager"));
const PartnershipManagement = React.lazy(() => import("./pages/PartnershipManagement"));
const MedicalManagement = React.lazy(() => import("./pages/MedicalManagement"));
const ShotIQ = React.lazy(() => import("./pages/ShotIQ"));
const Security = React.lazy(() => import("./pages/Security"));

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
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/players" element={
                <ProtectedRoute>
                  <Players />
                </ProtectedRoute>
              } />
              <Route path="/teams" element={
                <RoleProtectedRoute allowedRoles={['super_admin', 'staff', 'coach']}>
                  <Teams />
                </RoleProtectedRoute>
              } />
              <Route path="/schedule" element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}>
                  <Analytics />
                </RoleProtectedRoute>
              } />
              <Route path="/medical" element={
                <RoleProtectedRoute allowedRoles={['super_admin', 'medical']}>
                  <Medical />
                </RoleProtectedRoute>
              } />
              <Route path="/partners" element={
                <RoleProtectedRoute allowedRoles={['super_admin', 'partner']}>
                  <Partners />
                </RoleProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/user-management" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}>
                  <UserManagement />
                </RoleProtectedRoute>
              } />
              <Route path="/evaluations" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}>
                  <Evaluations />
                </RoleProtectedRoute>
              } />
              <Route path="/health-wellness" element={
                <RoleProtectedRoute allowedRoles={['super_admin', 'medical', 'staff', 'coach', 'player']}>
                  <HealthWellness />
                </RoleProtectedRoute>
              } />
              <Route path="/news" element={
                <ProtectedRoute>
                  <News />
                </ProtectedRoute>
              } />
              <Route path="/news-manager" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}>
                  <NewsManager />
                </RoleProtectedRoute>
              } />
              <Route path="/chat" element={
                <RoleProtectedRoute allowedRoles={['super_admin', 'staff', 'coach', 'player']}>
                  <Chat />
                </RoleProtectedRoute>
              } />
              <Route path="/teamgrid" element={
                <RoleProtectedRoute allowedRoles={['super_admin', 'staff', 'coach']}>
                  <TeamGrid />
                </RoleProtectedRoute>
              } />
              <Route path="/shotiq" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}>
                  <ShotIQ />
                </RoleProtectedRoute>
              } />
              <Route path="/partnership-management" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}>
                  <PartnershipManagement />
                </RoleProtectedRoute>
              } />
              <Route path="/medical-management" element={
                <RoleProtectedRoute allowedRoles={['super_admin', 'medical']}>
                  <MedicalManagement />
                </RoleProtectedRoute>
              } />
              <Route path="/security" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}>
                  <Security />
                </RoleProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
