import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface RoleBasedWrapperProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireSuperAdmin?: boolean;
  hideForPlayers?: boolean;
  fallback?: React.ReactNode;
}

export const RoleBasedWrapper: React.FC<RoleBasedWrapperProps> = ({
  children,
  allowedRoles = [],
  requireSuperAdmin = false,
  hideForPlayers = false,
  fallback = null
}) => {
  const { primaryRole, isSuperAdmin, hasRole, loading } = useOptimizedAuth();
  
  const isPlayerRole = primaryRole === 'player' && !isSuperAdmin();

  // If loading, render children (avoid flickering)
  if (loading) {
    return <>{children}</>;
  }

  // Hide for players if specified
  if (hideForPlayers && isPlayerRole) {
    return <>{fallback}</>;
  }

  // Require super admin
  if (requireSuperAdmin && !isSuperAdmin()) {
    return <>{fallback}</>;
  }

  // Check allowed roles
  if (allowedRoles.length > 0) {
    const hasRequiredRole = isSuperAdmin() || allowedRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};