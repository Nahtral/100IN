import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
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
  RefreshCw,
  Save,
  Plus,
  Minus,
  Settings,
  ChevronDown,
  X
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

interface Role {
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Permission {
  permission_name: string;
  permission_description: string;
  source: string;
  is_active: boolean;
  name?: string;
  description?: string;
  category?: string;
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
  const [rolesLoading, setRolesLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  
  // Role and permission management state
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const { activities, loading: activitiesLoading, refreshActivities } = useActivityTracking(user.id);
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    fetchUserData();
    fetchRolesAndPermissions();
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

  const fetchRolesAndPermissions = async () => {
    try {
      setRolesLoading(true);
      setPermissionsLoading(true);

      // Call the database function to get complete role and permission data
      const { data, error } = await supabase.rpc('get_user_roles_and_permissions', {
        target_user_id: user.id
      });

      if (error) throw error;

      if (data) {
        // Type cast the data object properly
        const responseData = data as any;
        
        // Set user's current roles
        const roles = responseData.roles || [];
        setUserRoles(roles);
        setSelectedRoles(roles.filter((r: any) => r.is_active).map((r: any) => r.role));

        // Set user's current permissions
        const permissions = responseData.permissions || [];
        setUserPermissions(permissions.filter((p: any) => p.is_active));
        setSelectedPermissions(permissions.filter((p: any) => p.is_active).map((p: any) => p.permission_name));

        // Set available options
        setAvailableRoles(responseData.available_roles || []);
        setAvailablePermissions(responseData.available_permissions || []);
      }
    } catch (error) {
      console.error('Error fetching roles and permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load role and permission data",
        variant: "destructive",
      });
    } finally {
      setRolesLoading(false);
      setPermissionsLoading(false);
    }
  };

  const handleRoleChange = (roleName: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, roleName]);
    } else {
      setSelectedRoles(prev => prev.filter(role => role !== roleName));
    }
  };

  const handlePermissionChange = (permissionName: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permissionName]);
    } else {
      setSelectedPermissions(prev => prev.filter(perm => perm !== permissionName));
    }
  };

  const saveRolesAndPermissions = async () => {
    try {
      setRolesLoading(true);
      setPermissionsLoading(true);

      // Get current active roles
      const currentRoles = userRoles.filter(r => r.is_active).map(r => r.role);
      
      // Get current active permissions
      const currentPermissions = userPermissions.filter(p => p.is_active).map(p => p.permission_name);

      // Handle role changes
      const rolesToAdd = selectedRoles.filter(role => !currentRoles.includes(role));
      const rolesToRemove = currentRoles.filter(role => !selectedRoles.includes(role));

      // Handle permission changes
      const permissionsToAdd = selectedPermissions.filter(perm => !currentPermissions.includes(perm));
      const permissionsToRemove = currentPermissions.filter(perm => !selectedPermissions.includes(perm));

      // Execute role assignments
      for (const role of rolesToAdd) {
        const { error } = await supabase.rpc('assign_user_role', {
          target_user_id: user.id,
          target_role: role as any
        });
        if (error) throw error;
      }

      // Execute role removals
      for (const role of rolesToRemove) {
        const { error } = await supabase.rpc('remove_user_role', {
          target_user_id: user.id,
          target_role: role as any
        });
        if (error) throw error;
      }

      // Execute permission assignments
      for (const permission of permissionsToAdd) {
        const { error } = await supabase.rpc('assign_user_permission', {
          target_user_id: user.id,
          permission_name: permission
        });
        if (error) throw error;
      }

      // Execute permission removals
      for (const permission of permissionsToRemove) {
        const { error } = await supabase.rpc('remove_user_permission', {
          target_user_id: user.id,
          permission_name: permission
        });
        if (error) throw error;
      }

      // Refresh data and exit edit mode
      await fetchRolesAndPermissions();
      setIsEditing(false);

      toast({
        title: "Success",
        description: "Roles and permissions updated successfully",
      });

    } catch (error) {
      console.error('Error saving roles and permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update roles and permissions",
        variant: "destructive",
      });
    } finally {
      setRolesLoading(false);
      setPermissionsLoading(false);
    }
  };

  const cancelEditing = () => {
    // Reset selections to current state
    setSelectedRoles(userRoles.filter(r => r.is_active).map(r => r.role));
    setSelectedPermissions(userPermissions.filter(p => p.is_active).map(p => p.permission_name));
    setIsEditing(false);
  };

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
          {isSuperAdmin && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Role & Permission Management</span>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    size="sm"
                    disabled={rolesLoading || permissionsLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={cancelEditing} 
                      variant="outline" 
                      size="sm"
                      disabled={rolesLoading || permissionsLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveRolesAndPermissions} 
                      size="sm"
                      disabled={rolesLoading || permissionsLoading}
                    >
                      <Save className="w-4 w-4 mr-2" />
                      {rolesLoading || permissionsLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Current Roles</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        role="combobox" 
                        className="w-full justify-between h-auto min-h-[40px] p-3"
                        disabled={rolesLoading}
                      >
                        <div className="flex flex-wrap gap-1 flex-1">
                          {selectedRoles.length > 0 ? (
                            selectedRoles.map((role) => (
                              <Badge 
                                key={role} 
                                variant="secondary" 
                                className="mr-1 mb-1"
                              >
                                {formatRoleName(role)}
                                <button
                                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleRoleChange(role, false);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={() => handleRoleChange(role, false)}
                                >
                                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Select roles...</span>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search roles..." />
                        <CommandEmpty>No roles found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {availableRoles.map((role) => (
                            <CommandItem
                              key={role}
                              value={role}
                              onSelect={() => {
                                handleRoleChange(role, !selectedRoles.includes(role));
                              }}
                            >
                              <Checkbox
                                checked={selectedRoles.includes(role)}
                                className="mr-2"
                              />
                              {formatRoleName(role)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="min-h-[120px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 flex flex-wrap gap-2 content-start">
                  {userRoles.filter(r => r.is_active).map((roleObj) => (
                    <Badge 
                      key={roleObj.role} 
                      variant={roleObj.role === 'super_admin' ? 'default' : 'secondary'}
                    >
                      {formatRoleName(roleObj.role)}
                    </Badge>
                  ))}
                  {userRoles.filter(r => r.is_active).length === 0 && (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                      No active roles assigned
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions ({userPermissions.filter(p => p.is_active).length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        role="combobox" 
                        className="w-full justify-between h-auto min-h-[40px] p-3"
                        disabled={permissionsLoading}
                      >
                        <div className="flex flex-wrap gap-1 flex-1">
                          {selectedPermissions.length > 0 ? (
                            selectedPermissions.map((permissionName) => {
                              const permission = availablePermissions.find(p => 
                                (p.name || p.permission_name) === permissionName
                              );
                              return (
                                <Badge 
                                  key={permissionName} 
                                  variant="secondary" 
                                  className="mr-1 mb-1"
                                >
                                  {permissionName.replace('_', ' ')}
                                  <button
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handlePermissionChange(permissionName, false);
                                      }
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onClick={() => handlePermissionChange(permissionName, false)}
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground">Select permissions...</span>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search permissions..." />
                        <CommandEmpty>No permissions found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {availablePermissions.map((permission) => {
                            const permissionName = permission.name || permission.permission_name || '';
                            return (
                              <CommandItem
                                key={permissionName}
                                value={permissionName}
                                onSelect={() => {
                                  handlePermissionChange(permissionName, !selectedPermissions.includes(permissionName));
                                }}
                                className="flex flex-col items-start p-2"
                              >
                                <div className="flex items-center w-full">
                                  <Checkbox
                                    checked={selectedPermissions.includes(permissionName)}
                                    className="mr-2"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{permissionName.replace('_', ' ')}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {permission.description || permission.permission_description}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="min-h-[120px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  {userPermissions.filter(p => p.is_active).length > 0 ? (
                    <div className="space-y-2">
                      {userPermissions.filter(p => p.is_active).map((perm, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{perm.permission_name.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">{perm.permission_description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2">
                            {perm.source || 'direct'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                      No permissions assigned
                    </div>
                  )}
                </div>
              )}
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