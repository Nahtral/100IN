
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Players from "./pages/Players";
import Schedule from "./pages/Schedule";
import Analytics from "./pages/Analytics";
import Medical from "./pages/Medical";
import Partners from "./pages/Partners";
import Settings from "./pages/Settings";
import Chat from "./pages/Chat";
import HRManagement from "./pages/HRManagement";
import UserManagement from "./pages/UserManagement";
import Evaluations from "./pages/Evaluations";
import Dashboard from "./pages/Dashboard";
import HealthWellness from "./pages/HealthWellness";
import NewsManager from "./pages/NewsManager";
import PartnershipManagement from "./pages/PartnershipManagement";
import MedicalManagement from "./pages/MedicalManagement";
import ShotIQ from "./pages/ShotIQ";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/hr-management" element={
              <RoleProtectedRoute allowedRoles={['super_admin', 'staff', 'coach']}>
                <HRManagement />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
