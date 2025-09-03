import React from 'react';
import { Navigate } from 'react-router-dom';
import { useReliableUserRole } from '@/hooks/useReliableUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  requireAll?: boolean;
}

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requireAll = false 
}: RoleProtectedRouteProps) => {
  const { user } = useAuth();
  const { userData, loading, isSuperAdmin, hasRole, isApproved } = useReliableUserRole();

  // Show comprehensive loading state while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Verifying access...</h3>
                <p className="text-muted-foreground">Please wait while we check your permissions.</p>
              </div>
            </div>
          </div>
          
          {/* Loading skeleton */}
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
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is approved
  if (!isApproved()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-panther-gold mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Account Pending Approval</h2>
            <p className="text-muted-foreground">
              Your account is pending approval. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Super admins can access everything - this is CRITICAL for admin routes
  if (isSuperAdmin() && isApproved()) {
    console.log('✅ SUPER ADMIN ACCESS GRANTED:', {
      route: allowedRoles.join(', '),
      user: userData?.email,
      isApproved: isApproved(),
      isSuperAdmin: isSuperAdmin()
    });
    return <>{children}</>;
  }

  // Check role permissions for non-super-admins
  const hasPermission = requireAll 
    ? allowedRoles.every(role => hasRole(role))
    : allowedRoles.some(role => hasRole(role));

  console.log('🔐 Role check result:', {
    user: userData?.email,
    allowedRoles,
    userRoles: userData?.all_roles,
    isSuperAdmin: isSuperAdmin(),
    isApproved: isApproved(),
    hasPermission,
    requireAll,
    decision: hasPermission ? 'GRANTED' : 'DENIED'
  });

  if (!hasPermission && !isSuperAdmin()) {
    console.log('❌ ACCESS DENIED:', {
      user: userData?.email,
      userRoles: userData?.all_roles,
      requiredRoles: allowedRoles,
      isApproved: isApproved(),
      isSuperAdmin: isSuperAdmin()
    });
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access this page.
              </p>
              <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                <p><strong>Your roles:</strong> {userData?.all_roles?.join(', ') || 'None'}</p>
                <p><strong>Required:</strong> {allowedRoles.join(requireAll ? ' AND ' : ' OR ')}</p>
                <p><strong>Super Admin:</strong> {isSuperAdmin() ? 'Yes' : 'No'}</p>
                <p><strong>Approved:</strong> {isApproved() ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;