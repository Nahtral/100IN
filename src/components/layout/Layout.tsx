
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
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile header with hamburger menu */}
          <header className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <div className="hidden lg:block">
                <SidebarTrigger />
              </div>
            </div>
            <Header currentUser={currentUser} />
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-6 animate-fade-in">
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
