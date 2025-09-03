import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuperAdminStatus {
  isSuperAdmin: boolean;
  isApproved: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Optimized hook specifically for super admin checks
 * Uses direct database queries to avoid rate limiting and caching issues
 */
export const useSuperAdminGuard = (): SuperAdminStatus => {
  const [status, setStatus] = useState<SuperAdminStatus>({
    isSuperAdmin: false,
    isApproved: false,
    loading: true,
    error: null
  });
  const { user, session } = useAuth();

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user?.id || !session) {
        setStatus({
          isSuperAdmin: false,
          isApproved: false,
          loading: false,
          error: null
        });
        return;
      }

      try {
        setStatus(prev => ({ ...prev, loading: true, error: null }));

        // Check user approval status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Check user roles separately
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (roleError) throw roleError;

        const isSuperAdmin = roleData?.some(
          (role: any) => role.role === 'super_admin' && role.is_active
        ) || false;

        const isApproved = profileData?.approval_status === 'approved';

        console.log('✅ Super admin guard check:', {
          userId: user.id,
          email: user.email,
          isSuperAdmin,
          isApproved,
          roles: roleData
        });

        setStatus({
          isSuperAdmin,
          isApproved,
          loading: false,
          error: null
        });

      } catch (error: any) {
        console.error('❌ Super admin guard error:', error);
        setStatus({
          isSuperAdmin: false,
          isApproved: false,
          loading: false,
          error: error.message || 'Failed to verify admin status'
        });
      }
    };

    checkSuperAdminStatus();

    // Subscribe to auth changes for immediate updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSuperAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, [user?.id, session]);

  return status;
};