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
    if (!user || !session) {
      setLoading(false);
      setAuthorized(false);
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);

      // Use RPC call to check role directly
      const { data: hasRole, error: roleError } = await supabase
        .rpc('current_user_has_role', { check_role: requiredRole });

      if (roleError) {
        console.error('Error checking user role:', roleError);
        throw roleError;
      }

      // Also get full user data for additional context
      const { data: currentUserData, error: userError } = await supabase
        .from('current_user_v')
        .select('*')
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching current user data:', userError);
        // Don't throw here, just log - role check is more important
      }

      console.log('Role check result:', { 
        requiredRole, 
        hasRole, 
        userData: currentUserData 
      });

      if (hasRole && currentUserData?.approval_status === 'approved') {
        setAuthorized(true);
        setUserData(currentUserData);
      } else {
        setAuthorized(false);
        
        // Show appropriate error message
        if (!hasRole) {
          toast({
            title: "Access Denied",
            description: `You need the '${requiredRole}' role to access this page.`,
            variant: "destructive",
          });
        } else if (currentUserData?.approval_status !== 'approved') {
          toast({
            title: "Account Pending",
            description: "Your account is pending approval. Please contact an administrator.",
            variant: "destructive",
          });
        }

        // Redirect to home
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