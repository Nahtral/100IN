import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setUserRoles([]);
        setIsSuperAdmin(false);
        setLoading(false);
        setInitialized(true);
        return;
      }

      // Don't start fetching until we have a user
      setLoading(true);
      setInitialized(false);

      try {
        console.log('Fetching user role for user:', user.id);
        
        // Test basic connectivity first
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (testError) {
          console.error('Basic connectivity test failed:', testError);
        } else {
          console.log('Basic connectivity test passed:', testData);
        }

        // Fetch both super admin status and roles in parallel
        const [superAdminResponse, rolesResponse] = await Promise.all([
          supabase.rpc('is_super_admin', { _user_id: user.id }),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true)
        ]);

        const { data: superAdminResult, error: superAdminError } = superAdminResponse;
        const { data: roles, error: rolesError } = rolesResponse;

        if (superAdminError) {
          console.error('Error checking super admin status:', superAdminError);
          setIsSuperAdmin(false);
        } else {
          console.log('Super admin check result:', superAdminResult);
          setIsSuperAdmin(superAdminResult || false);
        }

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          setUserRoles([]);
          setUserRole(null);
        } else {
          const rolesList = roles?.map(r => r.role) || [];
          setUserRoles(rolesList);
          const primaryRole = roles?.[0]?.role || null;
          setUserRole(primaryRole);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setIsSuperAdmin(false);
        setUserRoles([]);
        setUserRole(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    fetchUserRole();
  }, [user]);

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const canAccessMedical = () => {
    return isSuperAdmin || hasRole('medical');
  };

  const canAccessPartners = () => {
    return isSuperAdmin || hasRole('partner');
  };

  return { 
    userRole, 
    userRoles, 
    isSuperAdmin, 
    loading, 
    initialized,
    hasRole, 
    canAccessMedical, 
    canAccessPartners 
  };
};