import React from 'react';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/layout/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import AttendanceAnalytics from '@/components/analytics/AttendanceAnalytics';
import PerformanceAnalytics from '@/components/analytics/PerformanceAnalytics';
import ShotIQAnalytics from '@/components/analytics/ShotIQAnalytics';
import HealthAnalytics from '@/components/health/HealthAnalytics';
import { HealthProvider } from '@/contexts/HealthContext';

const Analytics = () => {
  const { currentUser } = useCurrentUser();

  return (
    <RoleProtectedRoute allowedRoles={['super_admin']}>
      <Layout currentUser={currentUser}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Hub</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics dashboard with detailed insights
            </p>
          </div>

          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="shotiq">ShotIQ</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-6">
              <AttendanceAnalytics />
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <PerformanceAnalytics />
            </TabsContent>

            <TabsContent value="shotiq" className="space-y-6">
              <ShotIQAnalytics />
            </TabsContent>

            <TabsContent value="health" className="space-y-6">
              <HealthProvider>
                <HealthAnalytics 
                  userRole={currentUser?.role || 'player'} 
                  isSuperAdmin={currentUser?.role === 'super_admin'} 
                />
              </HealthProvider>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </RoleProtectedRoute>
  );
};

export default Analytics;