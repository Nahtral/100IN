import React from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';

interface RoleGuardProps {
  requiredRole: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredRole,
  children,
  fallback,
  loadingComponent
}) => {
  const { loading, authorized, userData } = useRequireRole(requiredRole);

  // Show loading state while checking authorization
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Verifying permissions...</h3>
              <p className="text-muted-foreground">Please wait while we check your access.</p>
            </div>
          </div>
        </div>
        
        {/* Loading skeleton for content */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!authorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p className="text-muted-foreground">
                  You don't have permission to access this page.
                </p>
                {userData && (
                  <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                    <p><strong>Your role:</strong> {userData.primary_role}</p>
                    <p><strong>Required:</strong> {requiredRole}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User is authorized, render children
  return <>{children}</>;
};

// Convenience components for common roles
export const SuperAdminGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="super_admin" />
);

export const StaffGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="staff" />
);

export const CoachGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="coach" />
);

export const MedicalGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="medical" />
);