import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Edit, 
  Eye, 
  X, 
  Settings,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UserDetailsView from './UserDetailsView';
import PermissionManager from './PermissionManager';
import UserActionsDropdown from './UserActionsDropdown';
import { EnhancedProductionReadiness } from '../admin/EnhancedProductionReadiness';
import { HardenedUserApproval } from './HardenedUserApproval';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  latest_tryout_total?: number;
  latest_tryout_placement?: string;
  latest_tryout_date?: string;
  roles: Array<{
    role: string;
    is_active: boolean;
    created_at: string;
  }>;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  user_count: number;
  permissions: Permission[];
}

const EnhancedUserManagement = () => {
  const { currentUser } = useCurrentUser();
  const { isSuperAdmin } = useOptimizedAuth();
  const isSuper = isSuperAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedViewUser, setSelectedViewUser] = useState<UserProfile | null>(null);
  const [permissionManagerUser, setPermissionManagerUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [permissionManagerOpen, setPermissionManagerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (isSuper) {
      fetchUsers();
      fetchPermissions();
      fetchRoleTemplates();
    }
  }, [isSuper]);

const fetchUsers = async () => {
  try {
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, is_active, created_at');

    if (rolesError) throw rolesError;

    const rolesByUser = new Map<string, { role: string; is_active: boolean; created_at: string; }[]>();
    (rolesData || []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) || [];
      arr.push({ role: r.role as string, is_active: r.is_active as boolean, created_at: r.created_at as string });
      rolesByUser.set(r.user_id, arr);
    });

    const processedUsers: UserProfile[] = (profiles || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      phone: u.phone ?? undefined,
      approval_status: (u.approval_status as 'pending' | 'approved' | 'rejected') ?? 'pending',
      rejection_reason: u.rejection_reason ?? undefined,
      latest_tryout_total: u.latest_tryout_total ?? undefined,
      latest_tryout_placement: u.latest_tryout_placement ?? undefined,
      latest_tryout_date: u.latest_tryout_date ?? undefined,
      roles: rolesByUser.get(u.id) || []
    }));

    setUsers(processedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    toast.error('Failed to fetch users');
  } finally {
    setLoading(false);
  }
};

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

const fetchRoleTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('role_templates')
      .select('id, name, description')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const templates: RoleTemplate[] = (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      user_count: 0,
      permissions: []
    }));
    setRoleTemplates(templates);
  } catch (error) {
    console.error('Error fetching role templates:', error);
  }
};

const handleAssignRole = async (userId: string, role: string, reason: string) => {
  try {
    const { error } = await supabase.rpc('assign_user_role', {
      target_user_id: userId,
      target_role: role as any
    });

      if (error) throw error;
      
      toast.success(`Role ${role} assigned successfully`);
      await fetchUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  const revokeRole = async (userId: string, role: string) => {
    try {
const { error } = await supabase.rpc('remove_user_role', {
  target_user_id: userId,
  target_role: role as any
});

      if (error) throw error;
      
      toast.success(`Role ${role} revoked successfully`);
      await fetchUsers();
    } catch (error) {
      console.error('Error revoking role:', error);
      toast.error('Failed to revoke role');
    }
  };

  const grantPermission = async (userId: string, permissionId: string, reason: string) => {
    try {
      const permission = permissions.find(p => p.id === permissionId);
      if (!permission) throw new Error('Permission not found');

      const { error } = await supabase.rpc('assign_user_permission', {
        target_user_id: userId,
        permission_name: permission.name,
        assigned_by_user_id: currentUser?.id,
        assignment_reason: reason
      });

      if (error) throw error;
      
      toast.success(`Permission ${permission.name} granted successfully`);
      await fetchUsers();
    } catch (error) {
      console.error('Error granting permission:', error);
      toast.error('Failed to grant permission');
    }
  };

  const applyTemplate = async (templateId: string, userId: string) => {
    try {
      const { error } = await supabase.rpc('apply_role_template', {
        template_id: templateId,
        user_id: userId
      });

      if (error) throw error;
      
      toast.success('Role template applied successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    }
  };

  const archiveUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'rejected',
          rejection_reason: reason 
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User archived successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Error archiving user:', error);
      toast.error('Failed to archive user');
    }
  };

  const reactivateUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'approved',
          rejection_reason: null 
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User reactivated successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error('Failed to reactivate user');
    }
  };

  const deleteUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User deleted successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const viewUserDetails = (user: UserProfile) => {
    setSelectedViewUser(user);
    setViewDetailsOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.approval_status === statusFilter;
    
    const matchesRole = roleFilter === 'all' || 
                       user.roles.some(r => r.is_active && r.role === roleFilter);
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  if (!isSuper) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            You need super admin privileges to access user management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold">{user.full_name || 'Unnamed User'}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge 
                              variant={
                                user.approval_status === 'approved' ? 'default' :
                                user.approval_status === 'pending' ? 'secondary' : 'destructive'
                              }
                            >
                              {user.approval_status}
                            </Badge>
                            {user.roles.filter(r => r.is_active).map((roleObj) => (
                              <Badge key={roleObj.role} variant="outline">
                                {roleObj.role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {user.phone && (
                          <p className="text-sm text-muted-foreground">Phone: {user.phone}</p>
                        )}
                        {user.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            Rejection reason: {user.rejection_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPermissionManagerUser(user);
                            setPermissionManagerOpen(true);
                          }}
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Permissions
                        </Button>
                        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit User: {selectedUser?.full_name}</DialogTitle>
                            </DialogHeader>
                            <UserEditForm 
                              user={selectedUser}
                              permissions={permissions}
                              roleTemplates={roleTemplates}
                              onSave={() => {
                                fetchUsers();
                                setEditDialogOpen(false);
                              }}
                              onAssignRole={handleAssignRole}
                              onRevokeRole={revokeRole}
                              onGrantPermission={grantPermission}
                              onApplyTemplate={applyTemplate}
                            />
                          </DialogContent>
                        </Dialog>
                        <UserActionsDropdown 
                          user={user}
                          onArchive={() => archiveUser(user.id, 'Archived by admin')}
                          onReactivate={() => reactivateUser(user.id, 'Reactivated by admin')}
                          onDelete={() => deleteUser(user.id, 'Permanently deleted by admin')}
                          onViewDetails={() => viewUserDetails(user)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Permission Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pre-defined permission sets for different user roles. Coach template provides 
                basic access - additional permissions granted by super admin on case-by-case basis.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roleTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="outline">{template.user_count} users</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                      <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Apply Template
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {template.permissions.slice(0, 6).map((permission) => (
                        <Badge key={permission.id} variant="default" className="text-xs">
                          {permission.name.replace('_', ' ')}
                        </Badge>
                      ))}
                      {template.permissions.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.permissions.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="production" className="space-y-4">
          <EnhancedProductionReadiness />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <HardenedUserApproval />
        </TabsContent>
      </Tabs>

      {/* User Details Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedViewUser && (
            <UserDetailsView user={selectedViewUser} />
          )}
        </DialogContent>
      </Dialog>

      {/* Permission Manager Modal */}
      <Dialog open={permissionManagerOpen} onOpenChange={setPermissionManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
          </DialogHeader>
          {permissionManagerUser && (
            <PermissionManager 
              user={permissionManagerUser} 
              onClose={() => setPermissionManagerOpen(false)}
              onUserUpdate={fetchUsers}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UserEditForm = ({ 
  user, 
  permissions, 
  roleTemplates, 
  onSave, 
  onAssignRole, 
  onRevokeRole, 
  onGrantPermission,
  onApplyTemplate 
}: {
  user: UserProfile | null;
  permissions: Permission[];
  roleTemplates: RoleTemplate[];
  onSave: () => void;
  onAssignRole: (userId: string, role: string, reason: string) => Promise<void>;
  onRevokeRole: (userId: string, role: string) => Promise<void>;
  onGrantPermission: (userId: string, permissionId: string, reason: string) => Promise<void>;
  onApplyTemplate: (templateId: string, userId: string) => Promise<void>;
}) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [reason, setReason] = useState('');

  if (!user) return null;

  const handleAssignRole = async () => {
    if (!selectedRole || !reason) return;
    await onAssignRole(user.id, selectedRole, reason);
    setSelectedRole('');
    setReason('');
    onSave();
  };

  const handleGrantPermissions = async () => {
    if (selectedPermissions.length === 0 || !reason) return;
    
    for (const permissionId of selectedPermissions) {
      await onGrantPermission(user.id, permissionId, reason);
    }
    
    setSelectedPermissions([]);
    setReason('');
    onSave();
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    await onApplyTemplate(selectedTemplate, user.id);
    setSelectedTemplate('');
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="role">Assign Role</Label>
          <div className="flex gap-2 mt-1">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAssignRole} disabled={!selectedRole || !reason}>
              Assign
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="permission">Grant Additional Permission</Label>
          <div className="flex gap-2 mt-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  {selectedPermissions.length === 0 
                    ? "Select permissions..." 
                    : `${selectedPermissions.length} permission${selectedPermissions.length > 1 ? 's' : ''} selected`
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4">
                  <h4 className="font-medium mb-3">Select Permissions</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {permissions.map((permission) => {
                      const isSelected = selectedPermissions.includes(permission.id);
                      return (
                        <div 
                          key={permission.id} 
                          className="flex items-start space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => {
                            setSelectedPermissions(prev => 
                              isSelected 
                                ? prev.filter(id => id !== permission.id)
                                : [...prev, permission.id]
                            );
                          }}
                        >
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              setSelectedPermissions(prev => 
                                checked 
                                  ? [...prev, permission.id]
                                  : prev.filter(id => id !== permission.id)
                              );
                            }}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {permission.name.replace('_', ' ')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {permission.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPermissions([])}
                    >
                      Clear All
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {selectedPermissions.length} selected
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleGrantPermissions} disabled={selectedPermissions.length === 0 || !reason}>
              Grant
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="template">Apply Role Template</Label>
          <div className="flex gap-2 mt-1">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {roleTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleApplyTemplate} disabled={!selectedTemplate}>
              Apply
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a reason for this action..."
            className="mt-1"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Current Roles</h4>
        <div className="flex flex-wrap gap-2">
          {user.roles.filter(r => r.is_active).map((roleObj) => (
            <div key={roleObj.role} className="flex items-center gap-2">
              <Badge variant="outline">{roleObj.role}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRevokeRole(user.id, roleObj.role)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedUserManagement;
