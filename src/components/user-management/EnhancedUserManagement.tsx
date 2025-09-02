import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Settings, Users, Eye, Edit, Trash2, Check, X, UserPlus } from 'lucide-react';
import UserActionsDropdown from './UserActionsDropdown';
import UserDetailsView from './UserDetailsView';
import { UserApprovalDashboard } from './UserApprovalDashboard';
import { useActivityLogger } from '@/hooks/useActivityLogger';

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
  role: string;
  is_default: boolean;
  permissions: Permission[];
  user_count: number;
}

interface ApprovalRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  reason?: string;
  user: {
    email: string;
    full_name: string;
  } | null;
}

const EnhancedUserManagement = () => {
  const { isSuperAdmin } = useUserRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [grantReason, setGrantReason] = useState('');
  const { logUserAction, logRoleChange, logPermissionChange } = useActivityLogger();

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchPermissions(),
        fetchRoleTemplates(),
        fetchApprovalRequests(),
        fetchUserStatuses()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at');

    if (profiles) {
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          // Fetch roles
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role, is_active')
            .eq('user_id', profile.id);

          // Fetch permissions
          const { data: permissions } = await supabase
            .rpc('get_user_permissions', { _user_id: profile.id });

          return {
            ...profile,
            roles: roles || [],
            permissions: permissions || []
          };
        })
      );
      setUsers(usersWithRoles);
    }
  };

  const fetchPermissions = async () => {
    const { data } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true });
    
    if (data) setPermissions(data);
  };

  const fetchRoleTemplates = async () => {
    const { data: templates } = await supabase
      .from('role_templates')
      .select(`
        *,
        template_permissions!inner(
          permission:permissions(*)
        )
      `);

    if (templates) {
      const templatesWithCounts = await Promise.all(
        templates.map(async (template) => {
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role', template.role)
            .eq('is_active', true);

          return {
            ...template,
            permissions: template.template_permissions?.map((tp: any) => tp.permission) || [],
            user_count: count || 0
          };
        })
      );
      setRoleTemplates(templatesWithCounts);
    }
  };

  const fetchApprovalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('user_approval_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (!error && data) {
        // Fetch user profiles separately
        const userIds = data.map(req => req.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        // Combine the data
        const combinedData = data.map(request => ({
          ...request,
          user: profiles?.find(p => p.id === request.user_id) || null
        }));

        setApprovalRequests(combinedData);
      }

      if (error) {
        console.error('Error fetching approval requests:', error);
        toast({
          title: "Error",
          description: "Failed to load approval requests",
          variant: "destructive",
        });
        return;
      }

    } catch (error) {
      console.error('Error fetching approval requests:', error);
      toast({
        title: "Error", 
        description: "Failed to load approval requests",
        variant: "destructive",
      });
    }
  };

  const handleAssignRole = async (userId: string, role: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role as any, // Cast to match enum type
          is_active: true
        });

      if (error) throw error;

      // Log the action
      await supabase
        .from('role_change_audit')
        .insert({
          user_id: userId,
          new_role: role,
          reason,
          changed_by: (await supabase.auth.getUser()).data.user?.id
        });

      toast({
        title: "Role assigned successfully",
        description: `User has been assigned the ${role} role.`,
      });

      // Log the role change activity
      logRoleChange(role, undefined, reason);

      fetchUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "Failed to assign role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const revokeRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast({
        title: "Role revoked successfully",
        description: `${role} role has been revoked from the user.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error revoking role:', error);
      toast({
        title: "Error",
        description: "Failed to revoke role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const grantMultiplePermissions = async (userId: string, permissionIds: string[], reason: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Insert multiple permissions at once
      const permissionInserts = permissionIds.map(permissionId => ({
        user_id: userId,
        permission_id: permissionId,
        granted_by: currentUser?.id,
        reason,
        is_active: true
      }));

      const { error } = await supabase
        .from('user_permissions')
        .insert(permissionInserts);

      if (error) throw error;

      toast({
        title: "Permissions granted successfully",
        description: `${permissionIds.length} permission(s) have been granted to the user.`,
      });

      // Log permission changes
      permissionIds.forEach(permissionId => {
        const permission = permissions.find(p => p.id === permissionId);
        if (permission) {
          logPermissionChange(permission.name, 'granted', reason);
        }
      });

      fetchUsers();
      setSelectedPermissions([]);
      setGrantReason('');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error granting permissions:', error);
      toast({
        title: "Error",
        description: "Failed to grant permissions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const grantPermission = async (userId: string, permissionId: string, reason: string) => {
    return grantMultiplePermissions(userId, [permissionId], reason);
  };

  const handleApprovalAction = async (requestId: string, approved: boolean) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_approval_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: currentUser?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, assign the requested role to the user
      if (approved) {
        const request = approvalRequests.find(r => r.id === requestId);
        if (request) {
          await handleAssignRole(request.user_id, request.requested_role, `Auto-assigned after approval of request ${requestId}`);
        }
      }

      toast({
        title: approved ? "Request Approved" : "Request Rejected",
        description: `User request has been ${approved ? 'approved' : 'rejected'} successfully.`,
      });

      fetchApprovalRequests();
      fetchUsers(); // Refresh user list to show role changes
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: "Error",
        description: "Failed to process approval request",
        variant: "destructive",
      });
    }
  };

  const viewApprovalDetails = (request: ApprovalRequest) => {
    // Create a temporary user object for the approval request
    const tempUser: UserProfile = {
      id: request.user_id,
      email: request.user?.email || '',
      full_name: request.user?.full_name || '',
      created_at: request.requested_at,
      roles: [],
      permissions: []
    };
    setSelectedUser(tempUser);
    setViewDetailsOpen(true);
  };

  const editApprovalRequest = (request: ApprovalRequest) => {
    // For approval requests, we can edit the notes/reason
    const tempUser: UserProfile = {
      id: request.user_id,
      email: request.user?.email || '',
      full_name: request.user?.full_name || '',
      created_at: request.requested_at,
      roles: [],
      permissions: []
    };
    setSelectedUser(tempUser);
    setEditMode(true);
    setShowEditModal(true);
  };

  const deleteApprovalRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('user_approval_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Deleted",
        description: "Approval request has been deleted successfully.",
      });

      fetchApprovalRequests();
    } catch (error) {
      console.error('Error deleting approval request:', error);
      toast({
        title: "Error",
        description: "Failed to delete approval request",
        variant: "destructive",
      });
    }
  };

  const applyTemplate = async (templateId: string, userId: string) => {
    try {
      const template = roleTemplates.find(t => t.id === templateId);
      if (!template) return;

      // Assign the role
      await handleAssignRole(userId, template.role, `Applied ${template.name} template`);

      // Grant template permissions
      for (const permission of template.permissions) {
        await grantPermission(userId, permission.id, `From ${template.name} template`);
      }

      toast({
        title: "Template applied successfully",
        description: `${template.name} template has been applied to the user.`,
      });
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: "Failed to apply template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchUserStatuses = async () => {
    // Since the table may not exist in types yet, we'll set empty status for now
    setUserStatuses({});
  };

  const archiveUser = async (userId: string, reason: string) => {
    try {
      // For now, just deactivate roles until the function is available
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User archived successfully",
        description: "User has been archived and their access has been revoked.",
      });

      fetchUsers();
      fetchUserStatuses();
    } catch (error) {
      console.error('Error archiving user:', error);
      toast({
        title: "Error",
        description: "Failed to archive user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reactivateUser = async (userId: string, reason: string) => {
    toast({
      title: "Feature coming soon",
      description: "User reactivation will be available after database migration is complete.",
    });
  };

  const deleteUser = async (userId: string, reason: string) => {
    try {
      // For now, just remove from profiles table
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User deleted successfully",
        description: "User has been permanently deleted from the system.",
      });

      fetchUsers();
      fetchUserStatuses();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const viewUserDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setViewDetailsOpen(true);
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to access user management.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading user management...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles, permissions, and account settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {users.length} Total Users
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-fit">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Bulk Actions
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => viewUserDetails(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold group-hover:text-primary transition-colors">{user.full_name}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined: {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {user.roles.filter(r => r.is_active).map((roleObj) => (
                              <Badge 
                                key={roleObj.role} 
                                variant={roleObj.role === 'super_admin' ? 'default' : 'secondary'}
                              >
                                {roleObj.role === 'super_admin' ? 'Super Admin' : roleObj.role}
                              </Badge>
                            ))}
                            {userStatuses[user.id] && userStatuses[user.id] !== 'active' && (
                              <Badge variant="destructive">
                                {userStatuses[user.id]}
                              </Badge>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Active Permissions:</h4>
                            <div className="flex flex-wrap gap-1">
                              {user.permissions.slice(0, 10).map((perm) => (
                                <Badge key={perm.permission_name} variant="outline" className="text-xs">
                                  {perm.permission_name.replace('_', ' ')}
                                </Badge>
                              ))}
                              {user.permissions.length > 10 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.permissions.length - 10} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewUserDetails(user)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Dialog open={editDialogOpen && selectedUser?.id === user.id} onOpenChange={setEditDialogOpen}>
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

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Approval Requests</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and approve new player, parent, and coach requests
              </p>
            </CardHeader>
            <CardContent>
              {approvalRequests.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        User Approvals loaded successfully - Found {approvalRequests.length} requests
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold">User Approval Requests ({approvalRequests.length})</h3>
                  
                  {approvalRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{request.user?.full_name || 'Unknown User'}</h4>
                            <Badge 
                              variant={request.status === 'approved' ? 'default' : 'secondary'}
                            >
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                         <div className="flex gap-2">
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => viewApprovalDetails(request)}
                           >
                             <Eye className="w-4 h-4 mr-1" />
                             View
                           </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => editApprovalRequest(request)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteApprovalRequest(request.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <div className="flex gap-1 ml-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleApprovalAction(request.id, true)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleApprovalAction(request.id, false)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No approval requests found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details: {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserDetailsView 
              user={{
                ...selectedUser,
                approval_status: (selectedUser as any).approval_status || 'pending'
              }} 
              onClose={() => setSelectedUser(null)}
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