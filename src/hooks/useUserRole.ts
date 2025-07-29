import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is super admin using the database function
        const { data: superAdminResult, error: superAdminError } = await supabase
          .rpc('is_super_admin', { _user_id: user.id });

        if (superAdminError) {
          console.error('Error checking super admin status:', superAdminError);
        } else {
          setIsSuperAdmin(superAdminResult || false);
        }

        // Get user roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        } else {
          const primaryRole = roles?.[0]?.role || null;
          setUserRole(primaryRole);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { userRole, isSuperAdmin, loading };
};