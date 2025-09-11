import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRequestCache } from '@/hooks/useRequestCache';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export interface TeamGridStats {
  totalEmployees: number;
  activeTimeOff: number;
  pendingPayslips: number;
  todaysHours: number;
}

export const useTeamGridData = () => {
  const { toast } = useToast();
  const { batchFetch } = useRequestCache();
  const { user, loading: authLoading } = useOptimizedAuth();
  
  const [stats, setStats] = useState<TeamGridStats>({
    totalEmployees: 0,
    activeTimeOff: 0,
    pendingPayslips: 0,
    todaysHours: 0
  });
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchStats = useCallback(async () => {
    if (authLoading || !user) return;
    
    try {
      setError(null);
      const today = new Date().toISOString().split('T')[0];
      
      const [employees, timeOff, payslips, timeEntries] = await batchFetch([
        {
          table: 'employees',
          select: '*',
          filters: { employment_status: 'active' },
          cacheKey: 'employees_active',
          ttl: 5 * 60 * 1000
        },
        {
          table: 'time_off_requests',
          select: 'id',
          filters: { status: 'approved', [`gte.end_date`]: today },
          cacheKey: 'time_off_active',
          ttl: 5 * 60 * 1000
        },
        {
          table: 'payslips',
          select: 'id',
          filters: { status: 'draft' },
          cacheKey: 'payslips_draft',
          ttl: 2 * 60 * 1000
        },
        {
          table: 'time_entries',
          select: 'total_hours',
          filters: { [`gte.clock_in`]: `${today}T00:00:00`, [`lt.clock_in`]: `${today}T23:59:59` },
          cacheKey: `time_entries_${today}`,
          ttl: 60 * 1000
        }
      ]);

      setEmployees(employees || []);
      
      const todaysHours = (timeEntries || []).reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0);
      
      setStats({
        totalEmployees: (employees || []).length,
        activeTimeOff: (timeOff || []).length,
        pendingPayslips: (payslips || []).length,
        todaysHours: Math.round(todaysHours * 100) / 100
      });
      
      setInitialized(true);
    } catch (error: any) {
      console.error('Error fetching TeamGrid stats:', error);
      setError(error.message || 'Failed to fetch data');
      toast({
        title: "Error",
        description: "Failed to fetch HR statistics.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, batchFetch, toast]);

  // Initialize data fetch with timeout fallback
  useEffect(() => {
    if (!authLoading && user && !initialized) {
      fetchStats();
      
      // Emergency timeout - force loading to false after 5 seconds
      const timeout = setTimeout(() => {
        if (loading) {
          setLoading(false);
          setError('Data loading timed out');
        }
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [authLoading, user, initialized, fetchStats, loading]);

  return {
    stats,
    employees,
    loading,
    error,
    initialized,
    refetch: fetchStats
  };
};