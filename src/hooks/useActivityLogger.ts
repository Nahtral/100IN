import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

export const useActivityLogger = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Log page views automatically
  useEffect(() => {
    if (user?.id && location.pathname) {
      logActivity('page_view', {
        url: window.location.href,
        pathname: location.pathname,
        timestamp: new Date().toISOString()
      });
    }
  }, [location.pathname, user?.id]);

  const logActivity = async (eventType: string, eventData: any = {}) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('analytics_events')
        .insert([
          {
            user_id: user.id,
            event_type: eventType,
            event_data: {
              ...eventData,
              timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent,
              url: window.location.href
            },
            created_at: new Date().toISOString()
          }
        ]);
    } catch (error) {
      // Silently fail activity logging to not disrupt user experience
      console.debug('Activity logging failed:', error);
    }
  };

  const logUserAction = (action: string, target?: string, metadata?: any) => {
    logActivity('user_action', {
      action,
      target,
      metadata,
      timestamp: new Date().toISOString()
    });
  };

  const logAuthEvent = (event: 'login' | 'logout' | 'register') => {
    logActivity(`user_${event}`, {
      timestamp: new Date().toISOString()
    });
  };

  const logRoleChange = (newRole: string, oldRole?: string, reason?: string) => {
    logActivity('role_assigned', {
      new_role: newRole,
      old_role: oldRole,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  const logPermissionChange = (permission: string, action: 'granted' | 'revoked', reason?: string) => {
    logActivity('permission_granted', {
      permission,
      action,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  const logDataAccess = (tableType: string, recordId?: string, accessType?: string) => {
    logActivity(`${tableType}_data_access`, {
      record_id: recordId,
      access_type: accessType,
      timestamp: new Date().toISOString()
    });
  };

  return {
    logActivity,
    logUserAction,
    logAuthEvent,
    logRoleChange,
    logPermissionChange,
    logDataAccess
  };
};