import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  ChevronDown,
  X,
  Edit
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  approval_status: string;
}

interface Role {
  role: 'super_admin' | 'staff' | 'coach' | 'player' | 'parent' | 'medical' | 'partner';
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

interface UserDetailsViewProps {
  user: UserProfile;
  onClose: () => void;
}

export const UserDetailsView: React.FC<UserDetailsViewProps> = ({ user, onClose }) => {
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [availableRoles, setAvailableRoles] = useState<('super_admin' | 'staff' | 'coach' | 'player' | 'parent' | 'medical' | 'partner')[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRolesAndPermissions = async () => {
    try {
      setRolesLoading(true);
      setPermissionsLoading(true);
      setError(null);

      console.log('Fetching roles and permissions for user:', user.id);

      // Fetch user roles directly
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, is_active, created_at')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        throw rolesError;
      }

      // Fetch all permissions for the dropdown
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('name, description, category');

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
        throw permissionsError;
      }

      // Fetch user's current permissions
      const { data: userPermissionsData, error: userPermissionsError } = await supabase
        .from('user_permissions')
        .select(`
          permission_id,
          is_active,
          granted_at,
          permissions!inner(name, description, category)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (userPermissionsError) {
        console.error('Error fetching user permissions:', userPermissionsError);
      }

      console.log('Direct queries successful:', { rolesData, permissionsData, userPermissionsData });

      // Set user's current roles
      const roles = rolesData || [];
      setUserRoles(roles);
      setSelectedRoles(roles.filter((r: any) => r.is_active).map((r: any) => r.role));

      // Set available permissions (transform to match expected format)
      const allPermissions = permissionsData?.map(p => ({
        permission_name: p.name,
        permission_description: p.description,
        source: 'available',
        is_active: true,
        name: p.name,
        description: p.description,
        category: p.category
      })) || [];

      // Set user's current permissions
      const currentUserPermissions = userPermissionsData?.map((up: any) => ({
        permission_name: up.permissions.name,
        permission_description: up.permissions.description,
        source: 'direct',
        is_active: up.is_active,
        name: up.permissions.name,
        description: up.permissions.description,
        category: up.permissions.category
      })) || [];

      setUserPermissions(currentUserPermissions);
      setSelectedPermissions(currentUserPermissions.map(p => p.name || p.permission_name));

      // Set available roles manually since we're not using the RPC function
      setAvailableRoles(['super_admin', 'staff', 'coach', 'player', 'parent', 'medical', 'partner']);
      setAvailablePermissions(allPermissions);

    } catch (error: any) {
      console.error('Error fetching roles and permissions:', error);
      setError(`Failed to load role and permission data: ${error?.message || 'Unknown error'}`);
      
      // Set empty arrays on error
      setUserRoles([]);
      setUserPermissions([]);
      setAvailableRoles(['super_admin', 'staff', 'coach', 'player', 'parent', 'medical', 'partner']);
      setAvailablePermissions([]);
    } finally {
      setRolesLoading(false);
      setPermissionsLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [user.id]);

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, role]);
    } else {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permission]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    }
  };

  const saveRolesAndPermissions = async () => {
    try {
      setSaving(true);

      // Save roles
      for (const role of selectedRoles) {
        await supabase.rpc('assign_user_role', {
          target_user_id: user.id,
          target_role: role as 'super_admin' | 'staff' | 'coach' | 'player' | 'parent' | 'medical' | 'partner'
        });
      }

      // Save permissions
      for (const permission of selectedPermissions) {
        await supabase.rpc('assign_user_permission', {
          target_user_id: user.id,
          permission_name: permission
        });
      }

      toast({
        title: "Success",
        description: "Roles and permissions updated successfully"
      });

      setIsEditing(false);
      await fetchRolesAndPermissions();
    } catch (error: any) {
      console.error('Error saving roles and permissions:', error);
      toast({
        title: "Error",
        description: `Failed to save: ${error?.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-muted-foreground mb-1">Full Name</h4>
            <p className="text-lg">{user.full_name}</p>
          </div>
          <div>
            <h4 className="font-medium text-muted-foreground mb-1">Email</h4>
            <p className="text-lg">{user.email}</p>
          </div>
          <div>
            <h4 className="font-medium text-muted-foreground mb-1">Account Created</h4>
            <p className="text-lg">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <h4 className="font-medium text-muted-foreground mb-1">Account Status</h4>
            <Badge variant={user.approval_status === 'approved' ? 'default' : 'secondary'}>
              {user.approval_status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Role and Permission Management */}
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="account" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Account Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Role & Permission Management
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedRoles(userRoles.filter(r => r.is_active).map(r => r.role));
                          setSelectedPermissions([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={saveRolesAndPermissions}
                        disabled={saving}
                      >
                        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setIsEditing(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Roles */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Current Roles</h3>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto min-h-[40px] p-3 bg-background hover:bg-muted"
                        >
                          <div className="flex flex-wrap gap-1 flex-1">
                            {selectedRoles.length > 0 ? (
                              selectedRoles.map((role) => (
                                <Badge 
                                  key={role} 
                                  variant="secondary" 
                                  className="mr-1 mb-1 flex items-center gap-1"
                                >
                                  {role.replace('_', ' ')}
                                  <X 
                                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRoleChange(role, false);
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Select roles...</span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-background border shadow-lg z-50" align="start">
                        <div className="max-h-64 overflow-auto p-2 bg-background">
                          {availableRoles.map((role) => {
                            const isSelected = selectedRoles.includes(role);
                            return (
                              <div
                                key={role}
                                className="flex items-center space-x-2 py-2 px-2 hover:bg-muted rounded-md cursor-pointer"
                                onClick={() => handleRoleChange(role, !isSelected)}
                              >
                                <Checkbox checked={isSelected} />
                                <span className="text-sm font-medium">{role.replace('_', ' ')}</span>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="min-h-[120px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    {userRoles.filter(r => r.is_active).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userRoles.filter(r => r.is_active).map((role, index) => (
                          <Badge key={index} variant="default">
                            {role.role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        No active roles assigned
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Permissions ({availablePermissions.length})</h3>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto min-h-[40px] p-3 bg-background hover:bg-muted"
                        >
                          <div className="flex flex-wrap gap-1 flex-1">
                            {selectedPermissions.length > 0 ? (
                              selectedPermissions.map((permissionName) => (
                                <Badge 
                                  key={permissionName} 
                                  variant="secondary" 
                                  className="mr-1 mb-1 flex items-center gap-1"
                                >
                                  {permissionName.replace(/_/g, ' ')}
                                  <X 
                                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handlePermissionChange(permissionName, false);
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Select permissions...</span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-background border shadow-lg z-50" align="start">
                        <div className="max-h-64 overflow-auto p-2 bg-background">
                          {availablePermissions.length > 0 ? (
                            availablePermissions.map((permission) => {
                              const permissionName = permission.name || permission.permission_name || '';
                              const isSelected = selectedPermissions.includes(permissionName);
                              
                              if (!permissionName) return null;
                              
                              return (
                                <div
                                  key={permissionName}
                                  className="flex items-center space-x-2 py-2 px-2 hover:bg-muted rounded-md cursor-pointer"
                                  onClick={() => handlePermissionChange(permissionName, !isSelected)}
                                >
                                  <Checkbox checked={isSelected} />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{permissionName.replace(/_/g, ' ')}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description || permission.permission_description}
                                    </p>
                                    {permission.category && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {permission.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              No permissions available
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="min-h-[120px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    {availablePermissions.length > 0 ? (
                      <div className="space-y-2">
                        {availablePermissions.map((perm, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{(perm.name || perm.permission_name)?.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-muted-foreground">{perm.description || perm.permission_description}</p>
                            </div>
                            <Badge variant="outline" className="text-xs ml-2">
                              available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        No permissions found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Activity tracking coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Audit log coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Account Status</h4>
                    <p className="text-sm text-muted-foreground">Current approval status</p>
                  </div>
                  <Badge variant={user.approval_status === 'approved' ? 'default' : 'secondary'}>
                    {user.approval_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDetailsView;