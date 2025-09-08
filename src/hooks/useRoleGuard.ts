import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useToast } from '@/hooks/use-toast';

interface RoleGuardOptions {
  allowedRoles?: string[];
  requireSuperAdmin?: boolean;
  redirectTo?: string;
  showToast?: boolean;
}

export const useRoleGuard = (options: RoleGuardOptions = {}) => {
  const {
    allowedRoles = [],
    requireSuperAdmin = false,
    redirectTo = '/dashboard',
    showToast = true
  } = options;
  
  const { user, loading, hasRole, isSuperAdmin, isApproved } = useOptimizedAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;

    // Redirect unauthenticated users
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check approval status
    if (!isApproved()) {
      if (showToast) {
        toast({
          title: "Account Pending",
          description: "Your account is pending approval. Please contact an administrator.",
          variant: "destructive",
        });
      }
      navigate('/');
      return;
    }

    // Check super admin requirement
    if (requireSuperAdmin && !isSuperAdmin()) {
      if (showToast) {
        toast({
          title: "Access Denied",
          description: "This area is restricted to super administrators only.",
          variant: "destructive",
        });
      }
      navigate(redirectTo);
      return;
    }

    // Check role requirements
    if (allowedRoles.length > 0) {
      const hasRequiredRole = isSuperAdmin() || allowedRoles.some(role => hasRole(role));
      
      if (!hasRequiredRole) {
        if (showToast) {
          toast({
            title: "Access Denied",
            description: `You need one of the following roles to access this page: ${allowedRoles.join(', ')}`,
            variant: "destructive",
          });
        }
        navigate(redirectTo);
        return;
      }
    }
  }, [user, loading, hasRole, isSuperAdmin, isApproved, allowedRoles, requireSuperAdmin, redirectTo, showToast, navigate, toast]);

  return {
    loading,
    isAuthorized: !loading && user && isApproved() && (
      !requireSuperAdmin || isSuperAdmin()
    ) && (
      allowedRoles.length === 0 || isSuperAdmin() || allowedRoles.some(role => hasRole(role))
    )
  };
};

// Convenience hooks for common role checks
export const usePlayerGuard = () => useRoleGuard({ allowedRoles: ['player'] });
export const useStaffGuard = () => useRoleGuard({ allowedRoles: ['staff', 'coach'] });
export const useSuperAdminGuard = () => useRoleGuard({ requireSuperAdmin: true });
export const useMedicalGuard = () => useRoleGuard({ allowedRoles: ['medical'] });
export const usePartnerGuard = () => useRoleGuard({ allowedRoles: ['partner'] });

// Role check utilities (no navigation)
export const useRoleCheck = () => {
  const { hasRole, isSuperAdmin, primaryRole } = useOptimizedAuth();
  
  return {
    isPlayer: () => primaryRole === 'player' && !isSuperAdmin(),
    isStaff: () => hasRole('staff') || isSuperAdmin(),
    isCoach: () => hasRole('coach') || isSuperAdmin(),
    isMedical: () => hasRole('medical') || isSuperAdmin(),
    isPartner: () => hasRole('partner') || isSuperAdmin(),
    canManagePlayers: () => isSuperAdmin() || hasRole('staff'),
    canManageSchedule: () => isSuperAdmin() || hasRole('staff'),
    canViewAnalytics: () => isSuperAdmin(),
    canAccessMedical: () => isSuperAdmin() || hasRole('medical'),
    canAccessPartners: () => isSuperAdmin() || hasRole('partner'),
    canManageUsers: () => isSuperAdmin(),
    canAccessHR: () => isSuperAdmin() || hasRole('staff'),
  };
};