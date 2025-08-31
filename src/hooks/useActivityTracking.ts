import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserActivity {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  description: string;
  icon: string;
  category: string;
}

export const useActivityTracking = (userId?: string) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId || user?.id) {
      fetchUserActivities(userId || user?.id);
    }
  }, [userId, user?.id]);

  const fetchUserActivities = async (targetUserId: string) => {
    try {
      setLoading(true);
      
      // Query analytics_events table for user activities
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform analytics events into user-friendly activities
      const transformedActivities = (data || []).map(event => ({
        id: event.id,
        user_id: event.user_id,
        event_type: event.event_type,
        event_data: event.event_data,
        created_at: event.created_at,
        description: generateActivityDescription(event),
        icon: getActivityIcon(event.event_type),
        category: getActivityCategory(event.event_type)
      }));

      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error fetching user activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const trackActivity = async (
    eventType: string, 
    eventData: any = {}, 
    description?: string
  ) => {
    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert([
          {
            user_id: user?.id,
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

      if (error) throw error;

      // Refresh activities after tracking new one
      if (user?.id) {
        fetchUserActivities(user.id);
      }
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const generateActivityDescription = (event: any): string => {
    const { event_type, event_data } = event;
    
    switch (event_type) {
      case 'auth_attempt':
        return 'Attempted to sign in';
      case 'user_login':
        return 'Successfully logged in';
      case 'user_logout':
        return 'Logged out';
      case 'role_assigned':
        return `Role "${event_data?.role}" was assigned`;
      case 'permission_granted':
        return `Permission "${event_data?.permission}" was granted`;
      case 'profile_updated':
        return 'Updated profile information';
      case 'password_changed':
        return 'Changed password';
      case 'user_action':
        return event_data?.action ? `Performed action: ${event_data.action}` : 'Performed an action';
      case 'page_view':
        return `Visited ${event_data?.url || 'a page'}`;
      case 'sensitive_data_access':
        return `Accessed sensitive data in ${event_data?.table_name || 'database'}`;
      case 'employee_data_access':
        return 'Accessed employee data';
      case 'medical_data_access':
        return 'Accessed medical data';
      case 'player_data_access':
        return 'Accessed player data';
      case 'profile_access':
        return 'Accessed profile data';
      case 'security_alert':
        return `Security alert: ${event_data?.alert_type || 'Unknown'}`;
      default:
        return event_type.replace('_', ' ').toLowerCase();
    }
  };

  const getActivityIcon = (eventType: string): string => {
    switch (eventType) {
      case 'auth_attempt':
      case 'user_login':
      case 'user_logout':
        return 'LogIn';
      case 'role_assigned':
      case 'permission_granted':
        return 'Shield';
      case 'profile_updated':
      case 'password_changed':
        return 'User';
      case 'page_view':
        return 'Eye';
      case 'sensitive_data_access':
      case 'employee_data_access':
      case 'medical_data_access':
      case 'player_data_access':
      case 'profile_access':
        return 'Database';
      case 'security_alert':
        return 'AlertTriangle';
      case 'user_action':
        return 'Activity';
      default:
        return 'Clock';
    }
  };

  const getActivityCategory = (eventType: string): string => {
    if (['auth_attempt', 'user_login', 'user_logout'].includes(eventType)) {
      return 'Authentication';
    }
    if (['role_assigned', 'permission_granted'].includes(eventType)) {
      return 'Permissions';
    }
    if (['profile_updated', 'password_changed'].includes(eventType)) {
      return 'Account';
    }
    if (['sensitive_data_access', 'employee_data_access', 'medical_data_access', 'player_data_access', 'profile_access'].includes(eventType)) {
      return 'Data Access';
    }
    if (eventType === 'security_alert') {
      return 'Security';
    }
    if (eventType === 'page_view') {
      return 'Navigation';
    }
    return 'General';
  };

  return {
    activities,
    loading,
    trackActivity,
    refreshActivities: () => {
      if (userId || user?.id) {
        fetchUserActivities(userId || user?.id);
      }
    }
  };
};