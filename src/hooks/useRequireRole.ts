import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userData, setUserData] = useState<CurrentUserData | null>(null);
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkUserRole = useCallback(async () => {
    if (!user?.id || !session) {
      setLoading(false);
      setAuthorized(false);
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);

      console.log('🔍 Checking role for user:', user.email, 'Required role:', requiredRole);

      // Use direct database queries instead of functions that rely on auth.uid()
      const [profileQuery, roleQuery] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role, is_active')
          .eq('user_id', user.id)
          .eq('role', requiredRole as any) // Cast to avoid enum type issues
          .eq('is_active', true)
          .maybeSingle()
      ]);

      if (profileQuery.error) {
        console.error('Error checking user profile:', profileQuery.error);
        throw profileQuery.error;
      }

      if (roleQuery.error && roleQuery.error.code !== 'PGRST116') {
        console.error('Error checking user role:', roleQuery.error);
        throw roleQuery.error;
      }

      const profile = profileQuery.data;
      const hasRequiredRole = roleQuery.data?.is_active === true;

      console.log('🔐 Role check result:', {
        userId: user.id,
        email: user.email,
        requiredRole,
        hasRequiredRole,
        approvalStatus: profile.approval_status,
        roleData: roleQuery.data
      });

      if (hasRequiredRole && profile.approval_status === 'approved') {
        setAuthorized(true);
        setUserData({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          approval_status: profile.approval_status,
          primary_role: requiredRole,
          role_active: true,
          is_super_admin: requiredRole === 'super_admin',
          all_roles: [requiredRole]
        });
      } else {
        setAuthorized(false);
        
        if (!hasRequiredRole) {
          toast({
            title: "Access Denied",
            description: `You need the '${requiredRole}' role to access this page.`,
            variant: "destructive",
          });
        } else if (profile.approval_status !== 'approved') {
          toast({
            title: "Account Pending",
            description: "Your account is pending approval. Please contact an administrator.",
            variant: "destructive",
          });
        }

        navigate('/');
      }
    } catch (error) {
      console.error('Error in role check:', error);
      setAuthorized(false);
      toast({
        title: "Authorization Error",
        description: "Failed to verify permissions. Please try again.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [user, session, requiredRole, navigate, toast]);

  // Check role on mount and when auth state changes
  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  // Subscribe to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Clear any cached data and re-check
        setUserData(null);
        setAuthorized(false);
        
        // Small delay to ensure the session is properly set
        setTimeout(() => {
          checkUserRole();
        }, 100);
      }
    );

    return () => subscription.unsubscribe();
  }, [checkUserRole]);

  return {
    loading,
    authorized,
    userData,
    refetch: checkUserRole
  };
};

// Convenience hooks for common roles
export const useRequireSuperAdmin = () => useRequireRole('super_admin');
export const useRequireStaff = () => useRequireRole('staff');
export const useRequireCoach = () => useRequireRole('coach');
export const useRequireMedical = () => useRequireRole('medical');