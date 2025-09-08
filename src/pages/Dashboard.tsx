import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useRobustDashboard } from '@/hooks/useRobustDashboard';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Trophy, 
  TrendingUp, 
  Activity,
  Calendar,
  AlertTriangle,
  DollarSign,
  Target,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Link } from 'react-router-dom';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import PlayerDashboard from '@/components/dashboards/PlayerDashboard';
import CoachDashboard from '@/components/dashboards/CoachDashboard';
import ParentDashboard from '@/components/dashboards/ParentDashboard';
import StaffDashboard from '@/components/dashboards/StaffDashboard';
import MedicalDashboard from '@/components/dashboards/MedicalDashboard';
import PartnerDashboard from '@/components/dashboards/PartnerDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const { isSuperAdmin, primaryRole, loading: roleLoading, userData } = useOptimizedAuth();
  const { isTestMode, effectiveRole, effectiveIsSuperAdmin } = useRoleSwitcher();
  const { currentUser } = useCurrentUser();

  // Use effective role and admin status based on test mode
  const actualIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin();
  const actualUserRole = isTestMode ? effectiveRole : primaryRole;

  // Use the robust dashboard hook
  const dashboardData = useRobustDashboard(actualUserRole, user?.id || null);

  if (roleLoading || dashboardData.loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            {dashboardData.isRetrying && (
              <div className="flex items-center justify-center mt-4 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Retrying... (Attempt {dashboardData.retryCount + 1})
                </span>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state with retry option
  if (dashboardData.error) {
    return (
      <Layout currentUser={currentUser}>
        <div className="p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Dashboard Load Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                {dashboardData.error}
              </p>
              {dashboardData.errorCode && (
                <Badge variant="outline" className="mx-auto">
                  {dashboardData.errorCode}
                </Badge>
              )}
              <Button 
                onClick={dashboardData.retry}
                disabled={dashboardData.loading}
                className="w-full"
              >
                {dashboardData.loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Render role-specific dashboard wrapped in error boundary
  const DashboardContent = () => {
    if (actualIsSuperAdmin) {
      return <SuperAdminDashboard />;
    }

    // Render specific dashboard based on user role (or test role)
    switch (actualUserRole) {
      case 'player':
        return <PlayerDashboard />;
      case 'coach':
        return <CoachDashboard />;
      case 'parent':
        return <ParentDashboard />;
      case 'staff':
        return <StaffDashboard />;
      case 'medical':
        return <MedicalDashboard />;
      case 'partner':
        return <PartnerDashboard />;
      default:
        return <DefaultDashboard />;
    }
  };

  // Default dashboard component for users without specific roles
  const DefaultDashboard = () => (
    <Layout currentUser={currentUser}>
      <div className="mobile-space-y">
        {/* Mobile-optimized Header */}
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center sm:text-left">
            <h1 className="mobile-title text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Dashboard
            </h1>
            <p className="mobile-text text-muted-foreground mt-2">
              Welcome to your dashboard
            </p>
          </div>
          <div className="flex justify-center sm:justify-start">
            <Target className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
        </div>

        {/* Dashboard Stats */}
        {dashboardData.stats && (
          <div className="w-full max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center sm:justify-start gap-3 mobile-subtitle">
                  <Activity className="h-6 w-6 text-primary" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mobile-space-y">
                  {dashboardData.stats.userTeams && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="mobile-text font-medium">Teams</span>
                      <span className="text-lg font-bold text-primary">{dashboardData.stats.userTeams}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="mobile-text font-medium">Role</span>
                    <Badge variant="outline">{dashboardData.stats.role}</Badge>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full mt-6">
                  <Link to="/players">View Players</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );

  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
};

export default Dashboard;