import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: Array<{
    role: string;
    is_active: boolean;
    approved_at: string | null;
  }>;
}

const SecureUserManagement = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const roles = ['player', 'parent', 'coach', 'staff', 'medical', 'partner'] as const;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role, is_active, approved_at')
            .eq('user_id', profile.id);

          if (rolesError) {
            console.error('Error fetching roles for user:', profile.id, rolesError);
            return { ...profile, roles: [] };
          }

          return { ...profile, roles: roles || [] };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a user, role, and provide a reason.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', selectedUser)
        .eq('role', selectedRole as 'player' | 'parent' | 'coach' | 'staff' | 'medical' | 'partner' | 'super_admin')
        .single();

      if (existingRole) {
        if (existingRole.is_active) {
          toast({
            title: "Role Already Assigned",
            description: "User already has this active role.",
            variant: "destructive",
          });
          return;
        } else {
          // Reactivate the role
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ 
              is_active: true, 
              approved_by: user?.id,
              approved_at: new Date().toISOString()
            })
            .eq('id', existingRole.id);

          if (updateError) throw updateError;
        }
      } else {
        // Insert new role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser,
            role: selectedRole as 'player' | 'parent' | 'coach' | 'staff' | 'medical' | 'partner' | 'super_admin',
            is_active: true,
            approved_by: user?.id,
            approved_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      // Log the role change
      const { error: auditError } = await supabase
        .from('role_change_audit')
        .insert({
          user_id: selectedUser,
          new_role: selectedRole,
          changed_by: user?.id,
          reason: reason
        });

      if (auditError) {
        console.error('Failed to log role change:', auditError);
      }

      toast({
        title: "Role Assigned Successfully",
        description: `${selectedRole} role has been assigned to the user.`,
      });

      // Reset form and refresh data
      setSelectedUser('');
      setSelectedRole('');
      setReason('');
      fetchUsers();

    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const revokeRole = async (userId: string, role: string) => {
    if (!window.confirm(`Are you sure you want to revoke the ${role} role from this user?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role', role as 'player' | 'parent' | 'coach' | 'staff' | 'medical' | 'partner' | 'super_admin');

      if (error) throw error;

      // Log the role change
      const { error: auditError } = await supabase
        .from('role_change_audit')
        .insert({
          user_id: userId,
          old_role: role,
          new_role: 'revoked',
          changed_by: user?.id,
          reason: 'Role revoked by admin'
        });

      if (auditError) {
        console.error('Failed to log role change:', auditError);
      }

      toast({
        title: "Role Revoked",
        description: `${role} role has been revoked.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error revoking role:', error);
      toast({
        title: "Error",
        description: "Failed to revoke role",
        variant: "destructive",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-600">Only super administrators can access user management.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Role Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-select">Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Role Assignment</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this role is being assigned..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Button 
            onClick={assignRole} 
            disabled={actionLoading}
            className="w-full"
          >
            {actionLoading ? "Assigning Role..." : "Assign Role"}
          </Button>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{user.full_name}</h4>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.roles.length === 0 ? (
                      <Badge variant="outline">No roles assigned</Badge>
                    ) : (
                      user.roles.map((userRole) => (
                        <div key={userRole.role} className="flex items-center gap-1">
                          <Badge 
                            variant={userRole.is_active ? "default" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            {userRole.is_active ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {userRole.role}
                          </Badge>
                          {userRole.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => revokeRole(user.id, userRole.role)}
                              className="h-6 px-2 text-xs"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecureUserManagement;