import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RateLimiter } from '@/utils/rateLimiter';
import { OptimizedCache } from '@/hooks/useOptimizedCache';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

const RATE_LIMIT_CONFIG = { maxRequests: 10, windowMs: 60000 };

export interface StaffDashboardStats {
  pendingTasks: number;
  pendingRegistrations: number;
  revenue: number;
  upcomingEvents: number;
  unreadMessages: number;
  callbackRequests: number;
  formsToReview: number;
}

export interface PendingRegistration {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  approval_status: string;
}

export interface TodayScheduleItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location: string;
  status: string;
}

export interface PendingTask {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  task_type: string;
}

export const useStaffDashboardData = () => {
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<TodayScheduleItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isSuperAdmin, hasRole } = useOptimizedAuth();

  const memoizedFetch = useMemo(() => {
    let abortController: AbortController | null = null;
    
    return async () => {
      if (!user) return;

      // Check cache first
      const cacheKey = `staff-dashboard-${user.id}`;
      const cached = OptimizedCache.get<{
        stats: StaffDashboardStats;
        registrations: PendingRegistration[];
        schedule: TodayScheduleItem[];
        tasks: PendingTask[];
      }>(cacheKey);
      
      if (cached) {
        setStats(cached.stats);
        setPendingRegistrations(cached.registrations);
        setTodaySchedule(cached.schedule);
        setPendingTasks(cached.tasks);
        setLoading(false);
        return;
      }

      // Rate limiting
      if (!RateLimiter.check('staff-dashboard-requests', RATE_LIMIT_CONFIG)) {
        setError('Rate limit exceeded. Please try again later.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Cancel previous request
        if (abortController) {
          abortController.abort();
        }
        abortController = new AbortController();

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        // Define queries based on user role
        const queries: Promise<any>[] = [];

        // Execute all queries
        const [tasksResult, registrationsResult, scheduleResult, revenueResult, communicationData] = await Promise.allSettled([
          // 1. Pending tasks - available to all staff roles
          supabase
            .from('staff_tasks')
            .select('id, title, description, due_date, priority, status, task_type')
            .eq('status', 'pending')
            .lte('due_date', today.toISOString().split('T')[0])
            .order('due_date', { ascending: true })
            .limit(10),

          // 2. Pending registrations - all staff can see
          supabase
            .from('profiles')
            .select('id, full_name, email, created_at, approval_status')
            .eq('approval_status', 'pending')
            .gte('created_at', startOfWeek)
            .order('created_at', { ascending: false })
            .limit(10),

          // 3. Today's schedule - all staff can see
          supabase
            .from('schedules')
            .select('id, title, start_time, end_time, event_type, location, status')
            .gte('start_time', startOfDay)
            .lt('start_time', endOfDay)
            .order('start_time', { ascending: true }),

          // 4. Revenue data - only super admin can see
          isSuperAdmin
            ? supabase
                .from('payments')
                .select('amount')
                .eq('payment_status', 'completed')
                .gte('payment_date', startOfMonth)
            : Promise.resolve({ data: [] }),

          // 5. Communication stats - mock for now
          Promise.resolve({ 
            data: { 
              unread_messages: 7, 
              callback_requests: 3, 
              forms_to_review: 5 
            } 
          })
        ]);

        // Process results
        const tasksData = tasksResult.status === 'fulfilled' ? (tasksResult.value?.data || []) : [];
        const registrationsData = registrationsResult.status === 'fulfilled' ? (registrationsResult.value?.data || []) : [];
        const scheduleData = scheduleResult.status === 'fulfilled' ? (scheduleResult.value?.data || []) : [];
        const revenueData = revenueResult.status === 'fulfilled' ? (revenueResult.value?.data || []) : [];
        const commData = communicationData.status === 'fulfilled' ? (communicationData.value?.data || { unread_messages: 0, callback_requests: 0, forms_to_review: 0 }) : { unread_messages: 0, callback_requests: 0, forms_to_review: 0 };

        // Calculate revenue (only for super admin)
        const revenue = isSuperAdmin 
          ? revenueData.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount.toString()), 0)
          : 0;

        // Count pending registrations from this week
        const weeklyRegistrations = registrationsData.length;

        // Upcoming events (next 7 days)
        const upcomingEventsQuery = await supabase
          .from('schedules')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

        const dashboardStats: StaffDashboardStats = {
          pendingTasks: tasksData.length,
          pendingRegistrations: weeklyRegistrations,
          revenue,
          upcomingEvents: upcomingEventsQuery?.count || 0,
          unreadMessages: commData.unread_messages || 7,
          callbackRequests: commData.callback_requests || 3,
          formsToReview: commData.forms_to_review || 5
        };

        // Cache the results for 5 minutes
        const cacheData = {
          stats: dashboardStats,
          registrations: registrationsData,
          schedule: scheduleData,
          tasks: tasksData
        };
        OptimizedCache.set(cacheKey, cacheData, 300000);
        
        setStats(dashboardStats);
        setPendingRegistrations(registrationsData);
        setTodaySchedule(scheduleData);
        setPendingTasks(tasksData);
        
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching staff dashboard data:', err);
          setError('Failed to fetch dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };
  }, [user, isSuperAdmin, hasRole]);

  useEffect(() => {
    memoizedFetch();
  }, [memoizedFetch]);

  return { 
    stats, 
    pendingRegistrations, 
    todaySchedule, 
    pendingTasks, 
    loading, 
    error,
    refetch: memoizedFetch
  };
};