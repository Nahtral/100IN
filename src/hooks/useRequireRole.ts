import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useToast } from '@/hooks/use-toast';

interface CurrentUserData {
  id: string;
  email: string;
  full_name: string;
  approval_status: string;
  primary_role: string;
  role_active: boolean;
  is_super_admin: boolean;
  all_roles: string[];
}

export const useRequireRole = (requiredRole: string) => {
  const [authorized, setAuthorized] = useState(false);
  const { 
    user, 
    loading: authLoading, 
    userData,
    hasRole,
    isSuperAdmin,
    isApproved 
  } = useOptimizedAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loading = authLoading;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setAuthorized(false);
      navigate('/auth');
      return;
    }

    // Check if user is approved
    if (!isApproved()) {
      setAuthorized(false);
      toast({
        title: "Account Pending",
        description: "Your account is pending approval. Please contact an administrator.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    // Check if user has required role or is super admin
    const hasRequiredRole = isSuperAdmin() || hasRole(requiredRole);
    
    if (hasRequiredRole) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
      toast({
        title: "Access Denied",
        description: `You need the '${requiredRole}' role to access this page.`,
        variant: "destructive",
      });
      navigate('/');
    }
  }, [user, loading, requiredRole, hasRole, isSuperAdmin, isApproved, navigate, toast]);

  return {
    loading,
    authorized,
    userData
  };
};

// Convenience hooks for common roles
export const useRequireSuperAdmin = () => useRequireRole('super_admin');
export const useRequireStaff = () => useRequireRole('staff');
export const useRequireCoach = () => useRequireRole('coach');
export const useRequireMedical = () => useRequireRole('medical');