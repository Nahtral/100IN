
import React, { useEffect } from 'react';
import Navigation from './Navigation';
import Header from './Header';
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
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <Navigation />
      <Header currentUser={currentUser} />
      <main className="ml-64 pt-20 p-4 sm:p-6 transition-all duration-300 ease-in-out">
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
