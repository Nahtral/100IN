import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { 
  User, 
  Shield, 
  Calendar, 
  Activity, 
  FileText,
  Clock,
  UserCheck,
  AlertTriangle,
  LogIn,
  Database,
  Eye,
  RefreshCw
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: Array<{
    role: string;
    is_active: boolean;
  }>;
  permissions: Array<{
    permission_name: string;
    permission_description: string;
    source: string;
  }>;
}

interface AuditLog {
  id: string;
  user_id: string;
  old_role?: string;
  new_role?: string;
  changed_by: string;
  reason: string;
  created_at: string;
}

interface UserDetailsViewProps {
  user: UserProfile;
}

const UserDetailsView = ({ user }: UserDetailsViewProps) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { activities, loading: activitiesLoading, refreshActivities } = useActivityTracking(user.id);

  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    try {
      // For now, use mock data until tables are available in types
      setAuditLogs([]);
      setAccountStatus(null);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary';
      case 'suspended': return 'destructive';
      case 'deleted': return 'destructive';
      default: return 'outline';
    }
  };

  const getActivityIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      LogIn,
      Shield,
      User,
      Eye,
      Database,
      AlertTriangle,
      Activity,
      Clock
    };
    return iconMap[iconName] || Clock;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Authentication': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Permissions': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Account': return 'bg-green-50 text-green-700 border-green-200';
      case 'Data Access': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Security': return 'bg-red-50 text-red-700 border-red-200';
      case 'Navigation': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Created</p>
              <p className="text-lg">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Status</p>
              <Badge variant={getStatusColor(accountStatus?.status || 'active')}>
                {accountStatus?.status || 'Active'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Account Status
          </TabsTrigger>
        </TabsList>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.roles.filter(r => r.is_active).map((roleObj) => (
                  <Badge 
                    key={roleObj.role} 
                    variant={roleObj.role === 'super_admin' ? 'default' : 'secondary'}
                  >
                    {roleObj.role === 'super_admin' ? 'Super Admin' : roleObj.role}
                  </Badge>
                ))}
                {user.roles.filter(r => r.is_active).length === 0 && (
                  <p className="text-muted-foreground">No active roles assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions ({user.permissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user.permissions.map((perm, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{perm.permission_name.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">{perm.permission_description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {perm.source}
                    </Badge>
                  </div>
                ))}
                {user.permissions.length === 0 && (
                  <p className="text-muted-foreground">No permissions assigned</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshActivities}
                  disabled={activitiesLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${activitiesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading activity data...</p>
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.map((activity) => {
                    const IconComponent = getActivityIcon(activity.icon);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="mt-1">
                          <IconComponent className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{activity.description}</p>
                            <Badge 
                              variant="outline" 
                              className={`text-xs whitespace-nowrap ${getCategoryColor(activity.category)}`}
                            >
                              {activity.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <time className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleString()}
                            </time>
                            {activity.event_data?.url && (
                              <span className="text-xs text-muted-foreground">
                                • {new URL(activity.event_data.url).pathname}
                              </span>
                            )}
                          </div>
                          {activity.event_data?.error && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {activity.event_data.error}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No recent activity found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    User activities will appear here once they start using the system
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Change History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading audit logs...</div>
              ) : auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {log.old_role ? 
                            `Role changed from ${log.old_role} to ${log.new_role}` :
                            `Role ${log.new_role} assigned`
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">{log.reason}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                      </div>
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No audit logs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Status Information</CardTitle>
            </CardHeader>
            <CardContent>
              {accountStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={getStatusColor(accountStatus.status)}>
                        {accountStatus.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Changed</p>
                      <p>{formatDate(accountStatus.status_changed_at)}</p>
                    </div>
                  </div>
                  {accountStatus.reason && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reason</p>
                      <p>{accountStatus.reason}</p>
                    </div>
                  )}
                  {accountStatus.notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p>{accountStatus.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Badge variant="default">Active</Badge>
                  <p className="text-muted-foreground mt-2">Account is in good standing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDetailsView;