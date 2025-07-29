
import React, { useEffect } from 'react';
import Header from './Header';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: {
    name: string;
    role: string;
    avatar: string;
  };
}

const Layout = ({ children, currentUser }: LayoutProps) => {
  const { trackUserAction } = useAnalytics();
  const { reportError } = useErrorBoundary('Layout');

  useEffect(() => {
    // Track layout mount
    trackUserAction('layout_mounted', 'app');

    // Add global error handling
    const handleGlobalError = (event: ErrorEvent) => {
      reportError(new Error(event.message), {
        source: 'global_error_handler',
        filename: event.filename,
        lineno: event.lineno
      });
    };

    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, [trackUserAction, reportError]);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile-optimized header */}
          <header className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 min-h-[60px]">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger className="min-h-[44px] min-w-[44px] p-2" />
            </div>
            <Header currentUser={currentUser} />
          </header>

          {/* Mobile-optimized main content */}
          <main className="flex-1 mobile-container py-4 sm:py-6 animate-fade-in overflow-x-hidden">
            <div className="animate-fade-in max-w-full" style={{ animationDelay: '100ms' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
