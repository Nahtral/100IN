import React, { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthCore } from '@/hooks/useAuthCore';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';

// Lazy load dashboard components
const SuperAdminDashboard = React.lazy(() => import('@/components/dashboards/SuperAdminDashboard'));
const PlayerDashboard = React.lazy(() => import('@/components/dashboards/PlayerDashboard'));
const CoachDashboard = React.lazy(() => import('@/components/dashboards/CoachDashboard'));
const StaffDashboard = React.lazy(() => import('@/components/dashboards/StaffDashboard'));
const MedicalDashboard = React.lazy(() => import('@/components/dashboards/MedicalDashboard'));
const PartnerDashboard = React.lazy(() => import('@/components/dashboards/PartnerDashboard'));

const DefaultDashboard = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
    <div className="max-w-md w-full text-center">
      <h2 className="text-2xl font-bold mb-4">Dashboard Not Available</h2>
      <p className="text-muted-foreground mb-4">
        Your account role doesn't have an assigned dashboard. Please contact your administrator.
      </p>
    </div>
  </div>
);

export const RoleBasedDashboard = () => {
  const { loading } = useAuth();
  const { userData, primaryRole, isSuperAdmin } = useAuthCore();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!userData) {
    throw new Error('User data not loaded - check auth provider setup');
  }

  const DashboardComponent = (() => {
    // Super admin gets super admin dashboard
    if (isSuperAdmin()) {
      return SuperAdminDashboard;
    }

    // Role-based dashboard routing
    switch (primaryRole) {
      case 'player':
      case 'parent':
        return PlayerDashboard;
      case 'coach':
        return CoachDashboard;
      case 'staff':
        return StaffDashboard;
      case 'medical':
        return MedicalDashboard;
      case 'partner':
        return PartnerDashboard;
      default:
        return DefaultDashboard;
    }
  })();

  return (
    <ErrorBoundaryWrapper>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardComponent />
      </Suspense>
    </ErrorBoundaryWrapper>
  );
};