import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleCache } from '@/hooks/useSimpleCache';
import { RateLimiter } from '@/utils/rateLimiter';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { user } = useAuth();
  const { get, set } = useSimpleCache();
  const lastFetchRef = useRef<string | null>(null);

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

      // Prevent excessive re-fetching for same user
      if (lastFetchRef.current === user.id && initialized) {
        return;
      }

      // Rate limiting - max 3 requests per minute per user
      if (!RateLimiter.check(`role_fetch_${user.id}`, { maxRequests: 3, windowMs: 60000 })) {
        console.warn('⚡ Rate limited: role fetch for user', user.id);
        return;
      }

      // Check cache first
      const cacheKey = `user_role_${user.id}`;
      const cachedData = get(cacheKey) as {
        userRole: string | null;
        userRoles: string[];
        isSuperAdmin: boolean;
      } | null;
      if (cachedData && initialized) {
        setUserRole(cachedData.userRole);
        setUserRoles(cachedData.userRoles);
        setIsSuperAdmin(cachedData.isSuperAdmin);
        setLoading(false);
        setInitialized(true);
        return;
      }

      setLoading(true);
      setInitialized(false);

      try {
        // Check super admin status
        const { data: superAdminResult, error: superAdminError } = await supabase
          .rpc('is_super_admin', { _user_id: user.id });

        if (superAdminError) {
          if (superAdminError.message?.includes('Failed to fetch') || 
              superAdminError.message?.includes('network') ||
              superAdminError.code === 'PGRST301') {
            setIsSuperAdmin(false);
            setUserRoles([]);
            setUserRole('connection_error');
            return;
          }
          setIsSuperAdmin(false);
        } else {
          const isSuper = superAdminResult || false;
          setIsSuperAdmin(isSuper);
          
          if (isSuper) {
            const roleData = {
              userRole: 'super_admin',
              userRoles: ['super_admin'],
              isSuperAdmin: true
            };
            setUserRole('super_admin');
            setUserRoles(['super_admin']);
            set(cacheKey, roleData, 300000); // Cache for 5 minutes
            lastFetchRef.current = user.id;
            return;
          }
        }

        // Fetch additional roles if not super admin
        if (!superAdminResult) {
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (rolesError) {
            setUserRoles([]);
            setUserRole(null);
          } else {
            const rolesList = roles?.map(r => r.role) || [];
            const roleData = {
              userRole: roles?.[0]?.role || null,
              userRoles: rolesList,
              isSuperAdmin: false
            };
            setUserRoles(rolesList);
            setUserRole(roles?.[0]?.role || null);
            set(cacheKey, roleData, 300000); // Cache for 5 minutes
          }
        }
        
        lastFetchRef.current = user.id;
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          setUserRole('connection_error');
        } else {
          setUserRole(null);
        }
        setIsSuperAdmin(false);
        setUserRoles([]);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    fetchUserRole();
  }, [user, get, set, initialized]);

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