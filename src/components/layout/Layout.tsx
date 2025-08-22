
import React, { useEffect } from 'react';
import Header from './Header';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
  currentUser?: {
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
    <SidebarProvider 
      defaultOpen={false}
      style={{
        "--sidebar-width": "280px",
        "--sidebar-width-mobile": "280px",
      } as React.CSSProperties}
    >
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile-first header with proper z-index and touch targets */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 safe-area-inset">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="touch-target-lg hover:bg-accent rounded-md transition-colors" />
              <div className="mobile-only">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
                    <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold text-lg">Panthers</span>
                </div>
              </div>
            </div>
            <Header currentUser={currentUser} />
          </header>

          {/* Main content with proper mobile spacing */}
          <main className="flex-1 overflow-auto">
            <div className="mobile-container animate-fade-in">
              <div className="mobile-section" style={{ animationDelay: '100ms' }}>
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
