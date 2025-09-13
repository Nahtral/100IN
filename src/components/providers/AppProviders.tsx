import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import { StartupDiagnostics } from '@/components/diagnostics/StartupDiagnostics';
import { NotificationToastProvider } from '@/components/notifications/NotificationToast';

interface AppProvidersProps {
  children: React.ReactNode;
}

// Single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.status === 403) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground">Loading application...</p>
    </div>
  </div>
);

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ErrorBoundaryWrapper>
      <StartupDiagnostics>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
                <TooltipProvider>
                  <Suspense fallback={<LoadingFallback />}>
                    {children}
                  </Suspense>
                  <NotificationToastProvider />
                  <Toaster />
                  <Sonner />
                </TooltipProvider>
              </ThemeProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </StartupDiagnostics>
    </ErrorBoundaryWrapper>
  );
};