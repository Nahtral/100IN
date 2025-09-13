import React, { useEffect, useState } from 'react';
import { ErrorLogger } from '@/utils/errorLogger';

interface StartupDiagnosticsProps {
  children: React.ReactNode;
}

export const StartupDiagnostics = ({ children }: StartupDiagnosticsProps) => {
  const [isReady, setIsReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    reactVersion: string;
    multipleReactDetected: boolean;
    authContextReady: boolean;
    errors: string[];
  }>({
    reactVersion: '',
    multipleReactDetected: false,
    authContextReady: false,
    errors: [],
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      const errors: string[] = [];
      
      try {
        // Check React version
        const reactVersion = React.version;
        
        // Check for multiple React instances
        const multipleReactDetected = (() => {
          try {
            // Check if window.__REACT_DEVTOOLS_GLOBAL_HOOK__ has multiple renderers
            const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
            if (hook && hook.renderers && hook.renderers.size > 1) {
              return true;
            }
            
            // Check for multiple react packages in the bundle
            const scripts = Array.from(document.scripts);
            const reactScripts = scripts.filter(script => 
              script.src?.includes('react') || script.textContent?.includes('react')
            );
            
            return reactScripts.length > 2; // Allow for react and react-dom
          } catch {
            return false;
          }
        })();

        if (multipleReactDetected) {
          errors.push('Multiple React instances detected - this can cause hook errors');
        }

        // Log startup success
        console.log('[StartupDiagnostics] Application startup complete', {
          reactVersion,
          multipleReactDetected,
          timestamp: new Date().toISOString(),
        });

        setDiagnostics({
          reactVersion,
          multipleReactDetected,
          authContextReady: true, // Will be verified by auth provider
          errors,
        });

        if (errors.length > 0) {
          await ErrorLogger.logWarning('Startup diagnostics detected issues', {
            component: 'StartupDiagnostics',
            action: 'startup_check',
            metadata: { diagnostics: { reactVersion, multipleReactDetected, errors } }
          });
        }

      } catch (error) {
        console.error('[StartupDiagnostics] Startup check failed:', error);
        await ErrorLogger.logCritical(error as Error, {
          component: 'StartupDiagnostics',
          action: 'startup_failure'
        });
        errors.push(`Startup check failed: ${(error as Error).message}`);
      }

      setIsReady(true);
    };

    runDiagnostics();
  }, []);

  // Store diagnostics in global for dev tools access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__APP_DIAGNOSTICS__ = diagnostics;
    }
  }, [diagnostics]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};