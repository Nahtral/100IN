import React, { useState } from 'react';
import { BottomTabNav } from './BottomTabNav';
import { MoreDrawer } from './MoreDrawer';
import Header from '@/components/layout/Header';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    name: string;
    role: string;
    avatar: string;
  };
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, currentUser }) => {
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);
  const { trackUserAction } = useAnalytics();
  const { reportError } = useErrorBoundary('MobileLayout');

  React.useEffect(() => {
    trackUserAction('mobile_layout_mounted', 'app');

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

  const handleMoreClick = () => {
    setIsMoreDrawerOpen(true);
    trackUserAction('more_drawer_opened', 'navigation');
  };

  const handleMoreDrawerClose = () => {
    setIsMoreDrawerOpen(false);
    trackUserAction('more_drawer_closed', 'navigation');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-black backdrop-blur sticky top-0 z-40 safe-area-inset md:bg-black lg:bg-black">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
            <img 
              src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" 
              alt="Panthers Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Header currentUser={currentUser} />
        </div>
      </header>

      {/* Main content with bottom padding for tab nav */}
      <main className="flex-1 pb-20">
        <div className="mobile-container animate-fade-in">
          <div className="mobile-section" style={{ animationDelay: '100ms' }}>
            {children}
          </div>
        </div>
      </main>

      {/* Bottom Tab Navigation */}
      <BottomTabNav onMoreClick={handleMoreClick} />

      {/* More Drawer */}
      <MoreDrawer 
        isOpen={isMoreDrawerOpen} 
        onClose={handleMoreDrawerClose} 
      />
    </div>
  );
};