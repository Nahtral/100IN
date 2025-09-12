import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LazyTabContent } from "@/components/ui/LazyTabContent";
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import { 
  Users, 
  UserCheck, 
  Key, 
  Heart, 
  UserCog, 
  Trophy, 
  Calendar, 
  Shield,
  Handshake,
  BriefcaseMedical,
  UserPlus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useBatchedDashboard } from "@/hooks/useBatchedDashboard";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogger } from '@/hooks/useActivityLogger';

// Lazy load heavy components
const UserApprovalDashboard = lazy(() => import("@/components/user-management/UserApprovalDashboard").then(m => ({ default: m.UserApprovalDashboard })));
const PermissionsManagement = lazy(() => import("@/components/admin/PermissionsManagement").then(m => ({ default: m.PermissionsManagement })));
const ParentsManagement = lazy(() => import("@/components/admin/ParentsManagement").then(m => ({ default: m.ParentsManagement })));
const CoachesManagement = lazy(() => import("@/components/admin/CoachesManagement").then(m => ({ default: m.CoachesManagement })));
const StaffManagement = lazy(() => import("@/components/admin/StaffManagement").then(m => ({ default: m.StaffManagement })));
const TeamsManagement = lazy(() => import("@/components/admin/TeamsManagement").then(m => ({ default: m.TeamsManagement })));
const PlayerMonitoringDashboard = lazy(() => import("@/components/dashboards/PlayerMonitoringDashboard").then(m => ({ default: m.PlayerMonitoringDashboard })));

interface PendingRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  requested_at: string;
  status: string;
}

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { primaryRole, loading: roleLoading } = useOptimizedAuth();
  const { stats, loading, error } = useBatchedDashboard('super_admin');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('approvals');
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const { logUserAction } = useActivityLogger();

  useEffect(() => {
    // Only fetch on tab change or initial load
    if (!roleLoading && activeTab === 'approvals') {
      fetchPendingRequests();
    }
  }, [activeTab, roleLoading]);

  const fetchPendingRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, approval_status')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const requests = data?.map(profile => ({
        id: profile.id,
        user_id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        email: profile.email,
        requested_at: profile.created_at,
        status: profile.approval_status
      })) || [];

      setPendingRequests(requests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprovalAction = async (userId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: approved ? 'approved' : 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: approved ? "User Approved" : "User Rejected",
        description: `User has been ${approved ? 'approved' : 'rejected'} successfully.`,
      });

      // Log the approval action
      logUserAction(approved ? 'user_approved' : 'user_rejected', 'user_approval', { userId });

      fetchPendingRequests();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: "Error",
        description: "Failed to process approval request",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading || roleLoading) {
    return (
      <Layout currentUser={{ 
        name: user?.user_metadata?.full_name || 'User',
        role: primaryRole || 'Super Admin',
        avatar: '' 
      }}>
        <DashboardSkeleton />
      </Layout>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center p-8 text-destructive">Error: {error}</div>;
  }

  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'User',
      role: primaryRole || 'Super Admin',
      avatar: '' 
    }}>
      <div className="mobile-container space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mobile-title text-foreground" style={{ textShadow: '2px 2px 0px hsl(var(--panther-gold)), -2px -2px 0px hsl(var(--panther-gold)), 2px -2px 0px hsl(var(--panther-gold)), -2px 2px 0px hsl(var(--panther-gold))' }}>
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 mobile-text">
              Manage teams, players, schedules, security, and permissions
            </p>
          </div>
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Panel
            </span>
          </div>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-1 h-auto p-1">
            <TabsTrigger value="approvals" className="flex items-center gap-1 p-2 text-xs">
              <UserCheck className="h-3 w-3" />
              <span className="hidden sm:inline">Approvals</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-1 p-2 text-xs">
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">Monitoring</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1 p-2 text-xs">
              <Users className="h-3 w-3" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-1 p-2 text-xs">
              <Key className="h-3 w-3" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="parents" className="flex items-center gap-1 p-2 text-xs">
              <Heart className="h-3 w-3" />
              <span className="hidden sm:inline">Parents</span>
            </TabsTrigger>
            <TabsTrigger value="coaches" className="flex items-center gap-1 p-2 text-xs">
              <UserCog className="h-3 w-3" />
              <span className="hidden sm:inline">Coaches</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-1 p-2 text-xs">
              <Trophy className="h-3 w-3" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 p-2 text-xs">
              <Calendar className="h-3 w-3" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1 p-2 text-xs">
              <Shield className="h-3 w-3" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center gap-1 p-2 text-xs">
              <BriefcaseMedical className="h-3 w-3" />
              <span className="hidden sm:inline">Medical</span>
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-1 p-2 text-xs">
              <Handshake className="h-3 w-3" />
              <span className="hidden sm:inline">Partners</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-1 p-2 text-xs">
              <UserPlus className="h-3 w-3" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
          </TabsList>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            <LazyTabContent isActive={activeTab === 'approvals'}>
              <UserApprovalDashboard />
            </LazyTabContent>
          </TabsContent>

          {/* Player Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <LazyTabContent isActive={activeTab === 'monitoring'}>
              <Suspense fallback={<DashboardSkeleton />}>
                <PlayerMonitoringDashboard />
              </Suspense>
            </LazyTabContent>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <LazyTabContent isActive={activeTab === 'users'}>
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => {
                    navigate('/user-management');
                    toast({
                      title: "User Management",
                      description: "Accessing production-ready user management system",
                    });
                  }} className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Open User Management
                  </Button>
                </CardContent>
              </Card>
            </LazyTabContent>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <LazyTabContent isActive={activeTab === 'permissions'}>
              <PermissionsManagement />
            </LazyTabContent>
          </TabsContent>

          {/* Parents Tab */}
          <TabsContent value="parents">
            <LazyTabContent isActive={activeTab === 'parents'}>
              <ParentsManagement />
            </LazyTabContent>
          </TabsContent>

          {/* Coaches Tab */}
          <TabsContent value="coaches">
            <LazyTabContent isActive={activeTab === 'coaches'}>
              <CoachesManagement />
            </LazyTabContent>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <LazyTabContent isActive={activeTab === 'teams'}>
              <Suspense fallback={<DashboardSkeleton />}>
                <TeamsManagement />
              </Suspense>
            </LazyTabContent>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <LazyTabContent isActive={activeTab === 'schedule'}>
              <Card>
                <CardHeader>
                  <CardTitle>Schedule Management</CardTitle>
                  <CardDescription>Manage events, practices, and games</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/schedule')} className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Open Schedule Management
                  </Button>
                </CardContent>
              </Card>
            </LazyTabContent>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <LazyTabContent isActive={activeTab === 'security'}>
              <Card>
                <CardHeader>
                  <CardTitle>Security Management</CardTitle>
                  <CardDescription>Monitor system security and access logs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/security')} className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Open Security Dashboard
                  </Button>
                </CardContent>
              </Card>
            </LazyTabContent>
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical">
            <LazyTabContent isActive={activeTab === 'medical'}>
              <Card>
                <CardHeader>
                  <CardTitle>Medical Management</CardTitle>
                  <CardDescription>Manage medical staff, health records, and medical protocols</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button onClick={() => navigate('/medical')} className="w-full">
                      <BriefcaseMedical className="h-4 w-4 mr-2" />
                      Open Medical Dashboard
                    </Button>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" size="sm">
                        <Heart className="h-4 w-4 mr-2" />
                        Health Records
                      </Button>
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Medical Staff
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </LazyTabContent>
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <LazyTabContent isActive={activeTab === 'partners'}>
              <Card>
                <CardHeader>
                  <CardTitle>Partnership Management</CardTitle>
                  <CardDescription>Manage business partnerships, sponsorships, and collaborations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button onClick={() => navigate('/partners')} className="w-full">
                      <Handshake className="h-4 w-4 mr-2" />
                      Open Partnership Dashboard
                    </Button>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" size="sm">
                        <Trophy className="h-4 w-4 mr-2" />
                        Sponsorships
                      </Button>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Partner Accounts
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </LazyTabContent>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <LazyTabContent isActive={activeTab === 'staff'}>
              <StaffManagement />
            </LazyTabContent>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SuperAdminDashboard;