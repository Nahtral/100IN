import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';

interface AccessControlProps {
  children: (accessLevel: 'super_admin' | 'staff' | 'employee' | 'denied') => React.ReactNode;
}

export const TeamGridAccessControl = ({ children }: AccessControlProps) => {
  const { isSuperAdmin, hasRole, user, loading: authLoading } = useOptimizedAuth();
  const [isEmployee, setIsEmployee] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  
  useEffect(() => {
    const checkEmployeeStatus = async () => {
      if (authLoading || !user) {
        setAccessLoading(false);
        return;
      }
      
      // Quick access check for super admins and staff
      if (isSuperAdmin() || hasRole('staff')) {
        setAccessLoading(false);
        return;
      }
      
      // Check employee status for others
      if (hasRole('coach') || (!isSuperAdmin() && !hasRole('staff'))) {
        try {
          const { data } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', user.id)
            .single();
          setIsEmployee(!!data);
        } catch {
          setIsEmployee(false);
        }
      }
      
      setAccessLoading(false);
    };

    checkEmployeeStatus();
  }, [authLoading, user, isSuperAdmin, hasRole]);

  // Show loading while determining access
  if (authLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determine access level
  let accessLevel: 'super_admin' | 'staff' | 'employee' | 'denied' = 'denied';
  
  if (isSuperAdmin()) {
    accessLevel = 'super_admin';
  } else if (hasRole('staff')) {
    accessLevel = 'staff';
  } else if (hasRole('coach') || isEmployee) {
    accessLevel = 'employee';
  }

  return <>{children(accessLevel)}</>;
};