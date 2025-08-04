
import React, { useEffect } from 'react';
import Header from './Header';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
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
      <div className="min-h-screen w-full bg-background">
        {/* Mobile-first layout */}
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - Hidden by default on mobile, overlay on open */}
          <AppSidebar />
          
          {/* Main content area */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Mobile-optimized header */}
            <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
              <div className="h-full px-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="h-8 w-8 p-1" />
                  {/* Mobile logo/brand */}
                  <div className="flex items-center gap-2 md:hidden">
                    <div className="w-6 h-6 bg-white rounded-full p-1">
                      <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Panthers</span>
                  </div>
                </div>
                <Header currentUser={currentUser} />
              </div>
            </header>

            {/* Main content with mobile-first padding */}
            <main className="flex-1 overflow-auto bg-background">
              <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 animate-fade-in">
                <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
        
        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
