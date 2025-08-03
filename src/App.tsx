
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/medical" element={
              <ProtectedRoute>
                <Medical />
              </ProtectedRoute>
            } />
            <Route path="/partners" element={
              <ProtectedRoute>
                <Partners />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/user-management" element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/evaluations" element={
              <ProtectedRoute>
                <Evaluations />
              </ProtectedRoute>
            } />
            <Route path="/health-wellness" element={
              <ProtectedRoute>
                <HealthWellness />
              </ProtectedRoute>
            } />
            <Route path="/news-manager" element={
              <ProtectedRoute>
                <NewsManager />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/hr-management" element={
              <ProtectedRoute>
                <HRManagement />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
