import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  requireAll?: boolean; // If true, user must have ALL roles; if false, user needs ANY role
}

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requireAll = false 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { userRoles, isSuperAdmin, loading: roleLoading, initialized } = useUserRole();
  const { isTestMode, effectiveIsSuperAdmin, testHasRole, testRole } = useRoleSwitcher();

  // Wait for both auth and roles to be fully initialized
  if (authLoading || roleLoading || !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-96 shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl mb-4 animate-pulse p-2">
              <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-semibold mb-2">100IN</h2>
            <p className="text-gray-600">Checking permissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Use effective permissions based on test mode
  const actualIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const actualHasRole = (role: string) => isTestMode ? testHasRole(role) : userRoles.includes(role);

  // Super admins can access everything
  if (actualIsSuperAdmin) {
    return <>{children}</>;
  }

  // Check role permissions
  const hasPermission = requireAll 
    ? allowedRoles.every(role => actualHasRole(role))
    : allowedRoles.some(role => actualHasRole(role));

  // Debug logging for all access attempts
  console.log('RoleProtectedRoute: Access check', {
    allowedRoles,
    actualIsSuperAdmin,
    userRoles: isTestMode ? [`test: ${testRole}`] : userRoles,
    requireAll,
    hasPermission,
    currentPath: window.location.pathname,
    isTestMode,
    testRole,
    effectiveIsSuperAdmin,
    isSuperAdmin,
    initialized
  });

  if (!hasPermission) {
    console.log('RoleProtectedRoute: Access denied', {
      allowedRoles,
      actualIsSuperAdmin,
      userRoles: isTestMode ? [`test: ${testRole}`] : userRoles,
      requireAll,
      hasPermission,
      currentPath: window.location.pathname
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-xl mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page. 
              Contact an administrator if you believe this is an error.
            </p>
            <p className="text-sm text-gray-500">
              Required roles: {allowedRoles.join(requireAll ? ' AND ' : ' OR ')}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Path: {window.location.pathname}
            </p>
            <button 
              onClick={() => window.history.back()} 
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go Back
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;