import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RateLimiter } from '@/utils/rateLimiter';

// Global cache to prevent multiple components from fetching the same data
const globalRoleCache = new Map<string, {
  data: { userRole: string | null; userRoles: string[]; isSuperAdmin: boolean };
  timestamp: number;
  expiry: number;
}>();

const CACHE_TTL = 300000; // 5 minutes
const RATE_LIMIT_CONFIG = { maxRequests: 5, windowMs: 60000 }; // Strict: 5 per minute

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { user } = useAuth();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchUserRole = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;

    const cacheKey = `user_role_${user.id}`;
    const now = Date.now();
    
    // Check global cache first
    const cached = globalRoleCache.get(cacheKey);
    if (cached && now < cached.expiry) {
      if (mountedRef.current) {
        setUserRole(cached.data.userRole);
        setUserRoles(cached.data.userRoles);
        setIsSuperAdmin(cached.data.isSuperAdmin);
        setLoading(false);
        setInitialized(true);
      }
      return;
    }

    // Rate limiting
    const rateLimitKey = `role_fetch_${user.id}`;
    if (!RateLimiter.check(rateLimitKey, RATE_LIMIT_CONFIG)) {
      console.warn('⚡ Rate limited: role fetch for user', user.id);
      if (mountedRef.current) {
        setLoading(false);
        setInitialized(true);
      }
      return;
    }

    fetchingRef.current = true;

    try {
      // Timeout for the request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
      );

      const { data, error } = await Promise.race([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true),
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }

      const roles = data?.map(r => r.role) || [];
      const primaryRole = roles[0] || null;
      const isSuperAdminUser = roles.includes('super_admin');

      const roleData = {
        userRole: primaryRole,
        userRoles: roles,
        isSuperAdmin: isSuperAdminUser
      };

      // Update global cache
      globalRoleCache.set(cacheKey, {
        data: roleData,
        timestamp: now,
        expiry: now + CACHE_TTL
      });

      if (mountedRef.current) {
        setUserRole(primaryRole);
        setUserRoles(roles);
        setIsSuperAdmin(isSuperAdminUser);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      if (mountedRef.current) {
        setUserRole(null);
        setUserRoles([]);
        setIsSuperAdmin(false);
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (user?.id) {
      fetchUserRole();
    } else if (!user) {
      // Reset state when user logs out
      setUserRole(null);
      setUserRoles([]);
      setIsSuperAdmin(false);
      setLoading(false);
      setInitialized(true);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user?.id, fetchUserRole]);

  const hasRole = useCallback((role: string) => {
    return userRoles.includes(role);
  }, [userRoles]);

  const canAccessMedical = useCallback(() => {
    return isSuperAdmin || hasRole('medical');
  }, [isSuperAdmin, hasRole]);

  const canAccessPartners = useCallback(() => {
    return isSuperAdmin || hasRole('partner');
  }, [isSuperAdmin, hasRole]);

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