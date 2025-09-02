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

      setLoading(true);
      setInitialized(false);

      try {
        console.log('🔍 Fetching user role for user:', user.id);
        
        // Check super admin status first with detailed logging
        console.log('📡 Checking super admin status...');
        const { data: superAdminResult, error: superAdminError } = await supabase
          .rpc('is_super_admin', { _user_id: user.id });

        console.log('✅ Super admin check result:', { 
          result: superAdminResult, 
          error: superAdminError?.message || 'none',
          code: superAdminError?.code || 'none'
        });

        if (superAdminError) {
          console.error('❌ Error checking super admin status:', superAdminError);
          
          // Handle network connectivity issues
          if (superAdminError.message?.includes('Failed to fetch') || 
              superAdminError.message?.includes('network') ||
              superAdminError.code === 'PGRST301') {
            console.warn('🌐 Network connectivity issue detected. User may need to refresh.');
            setIsSuperAdmin(false);
            setUserRoles([]);
            setUserRole('connection_error');
            return;
          }
          setIsSuperAdmin(false);
        } else {
          const isSuper = superAdminResult || false;
          console.log('🔐 Setting super admin status:', isSuper);
          setIsSuperAdmin(isSuper);
          
          // If user is super admin, set that immediately
          if (isSuper) {
            setUserRoles(['super_admin']);
            setUserRole('super_admin');
            console.log('👑 Super admin detected, roles set to: ["super_admin"]');
            return; // Exit early for super admins
          }
        }

        // Only fetch additional roles if not super admin
        if (!superAdminResult) {
          console.log('📋 Fetching additional user roles...');
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (rolesError) {
            console.error('❌ Error fetching user roles:', rolesError);
            setUserRoles([]);
            setUserRole(null);
          } else {
            const rolesList = roles?.map(r => r.role) || [];
            setUserRoles(rolesList);
            setUserRole(roles?.[0]?.role || null);
            console.log('👤 Non-super admin roles set to:', rolesList);
          }
        }
      } catch (error) {
        console.error('💥 Critical error in fetchUserRole:', error);
        
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error('🌐 Network connectivity issue detected. Please check your internet connection and refresh.');
          setUserRole('connection_error');
        } else {
          setUserRole(null);
        }
        
        setIsSuperAdmin(false);
        setUserRoles([]);
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('🏁 Role fetch complete. Final state:', {
          userRole: userRole,
          userRoles: userRoles,
          isSuperAdmin: isSuperAdmin,
          initialized: true
        });
      }
    };

    fetchUserRole();
  }, [user]);

  const hasRole = (role: string) => {
    const result = userRoles.includes(role);
    console.log(`🔍 hasRole("${role}"):`, result, 'from roles:', userRoles);
    return result;
  };

  const canAccessMedical = () => {
    const result = isSuperAdmin || hasRole('medical');
    console.log('🏥 canAccessMedical:', result);
    return result;
  };

  const canAccessPartners = () => {
    const result = isSuperAdmin || hasRole('partner');
    console.log('🤝 canAccessPartners:', result);
    return result;
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