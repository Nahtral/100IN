import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
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
        // Get user roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        } else {
          const rolesList = roles?.map(r => r.role) || [];
          setUserRoles(rolesList);
          
          // Determine super admin status from roles
          setIsSuperAdmin(rolesList.includes('super_admin'));
          
          // Set primary role, prioritizing super_admin
          if (rolesList.includes('super_admin')) {
            setUserRole('super_admin');
          } else {
            const primaryRole = roles?.[0]?.role || null;
            setUserRole(primaryRole);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
      } finally {
        setLoading(false);
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
    hasRole, 
    canAccessMedical, 
    canAccessPartners 
  };
};