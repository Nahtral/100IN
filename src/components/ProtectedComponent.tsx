import React from 'react';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ProtectedComponentProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  componentName?: string;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  requiredRoles = [],
  fallback,
  componentName = 'ProtectedComponent'
}) => {
  const { currentUser, loading } = useCurrentUser();
  const { handleError } = useErrorHandler({ component: componentName });

  if (loading) {
    return <LoadingState />;
  }

  // Check role access if roles are required
  if (requiredRoles.length > 0) {
    const hasAccess = requiredRoles.some(role => 
      currentUser.role.toLowerCase().includes(role.toLowerCase())
    );

    if (!hasAccess) {
      const error = new Error(`Access denied: Required roles: ${requiredRoles.join(', ')}`);
      handleError(error, { 
        action: 'role_check_failed',
        additionalData: { requiredRoles, userRole: currentUser.role }
      });
      
      return fallback || (
        <div className="flex items-center justify-center min-h-[200px] p-8 bg-muted/50 rounded-lg border border-border">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              You don't have permission to view this content.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <ErrorBoundaryWrapper>
      {children}
    </ErrorBoundaryWrapper>
  );
};