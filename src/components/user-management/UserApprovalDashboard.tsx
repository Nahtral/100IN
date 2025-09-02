import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, UserCheck, UserX, Eye, Calendar, Mail, User, Shield, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserDetailsView from './UserDetailsView';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  requested_role?: string;
}

interface UserRole {
  role: string;
  is_active: boolean;
  approved_at: string | null;
}

export const UserApprovalDashboard = () => {
  const { isSuperAdmin } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [viewDetailsUser, setViewDetailsUser] = useState<PendingUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roleAssignmentReason, setRoleAssignmentReason] = useState('');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingUsers();
    }
  }, [isSuperAdmin]);

  const fetchPendingUsers = async () => {
    try {
      // Fetch pending users and their requested roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get requested roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role, is_active')
            .eq('user_id', profile.id)
            .eq('is_active', false)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...profile,
            requested_role: roles?.[0]?.role || 'player'
          };
        })
      );

      setPendingUsers(usersWithRoles as PendingUser[]);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        title: "Error",
        description: "Failed to load pending users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    setActionLoading(userId);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const updateData = {
        approval_status: approved ? 'approved' : 'rejected',
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString(),
        ...(approved ? {} : { rejection_reason: rejectionReason })
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // If approved and role is selected, activate the role
      if (approved && selectedRole) {
        await assignRoleToUser(userId, selectedRole, roleAssignmentReason || 'Role assigned during approval process');
      }

      toast({
        title: approved ? "User Approved" : "User Rejected",
        description: `User has been ${approved ? 'approved and can now access the platform' : 'rejected'}.`,
      });

      // Send email notification would go here
      if (approved) {
        // TODO: Call edge function to send approval email
        console.log('Would send approval email to user');
      } else {
        // TODO: Call edge function to send rejection email
        console.log('Would send rejection email to user');
      }

      fetchPendingUsers();
      setRejectionReason('');
      setSelectedUser(null);
      setSelectedRole('');
      setRoleAssignmentReason('');
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: "Error",
        description: "Failed to process user approval",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const assignRoleToUser = async (userId: string, role: string, reason: string) => {
    try {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role as 'player' | 'parent' | 'coach' | 'staff' | 'medical' | 'partner' | 'super_admin')
        .single();

      if (existingRole) {
        // Activate existing role
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ 
            is_active: true, 
            approved_by: user?.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', existingRole.id);

        if (updateError) throw updateError;
      } else {
        // Insert new role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: role as 'player' | 'parent' | 'coach' | 'staff' | 'medical' | 'partner' | 'super_admin',
            is_active: true,
            approved_by: user?.id,
            approved_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      // Log the role assignment if audit table is available
      try {
        await supabase
          .from('role_change_audit')
          .insert({
            user_id: userId,
            new_role: role,
            changed_by: user?.id,
            reason: reason
          });
      } catch (auditError) {
        console.error('Failed to log role assignment:', auditError);
      }

    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  };

  const availableRoles = ['player', 'parent', 'coach', 'staff', 'medical', 'partner'] as const;

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Access denied. Super Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            User Approval Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading pending users...</div>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">All registered users have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <Card 
                  key={user.id} 
                  className="border-l-4 border-l-yellow-400 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setViewDetailsUser(user)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{user.full_name}</span>
                          </div>
                          {getStatusBadge(user.approval_status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Registered {formatDistanceToNow(new Date(user.created_at))} ago</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Phone:</span>
                              <span>{user.phone}</span>
                            </div>
                          )}
                          {user.requested_role && (
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Requested Role:</span>
                              <Badge variant="outline" className="text-xs">
                                {getRoleDisplayName(user.requested_role)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              disabled={actionLoading === user.id}
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedRole(user.requested_role || 'player');
                                setRoleAssignmentReason(`Approved as ${getRoleDisplayName(user.requested_role || 'player')}`);
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve & Assign Role
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Approve User & Assign Role
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Approve <strong>{user.full_name}</strong> ({user.email}) and assign their role.
                                <br />
                                This will grant them access to the platform with the specified role permissions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="role-select">Assign Role</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        <div className="flex items-center gap-2">
                                          <Shield className="h-4 w-4" />
                                          {getRoleDisplayName(role)}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {user.requested_role && (
                                  <p className="text-xs text-muted-foreground">
                                    User requested: {getRoleDisplayName(user.requested_role)}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="role-reason">Role Assignment Reason</Label>
                                <Textarea
                                  id="role-reason"
                                  placeholder="Explain why this role is being assigned..."
                                  value={roleAssignmentReason}
                                  onChange={(e) => setRoleAssignmentReason(e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </div>

                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                setSelectedUser(null);
                                setSelectedRole('');
                                setRoleAssignmentReason('');
                              }}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproval(user.id, true)}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={!selectedRole || !roleAssignmentReason.trim()}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Approve & Assign Role
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              disabled={actionLoading === user.id}
                              onClick={() => setSelectedUser(user)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject User Access</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to reject <strong>{user.full_name}</strong> ({user.email})?
                                <br />
                                <br />
                                Please provide a reason for rejection:
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Textarea
                                placeholder="Enter rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                setRejectionReason('');
                                setSelectedUser(null);
                              }}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproval(user.id, false)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={!rejectionReason.trim()}
                              >
                                Reject User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!viewDetailsUser} onOpenChange={(open) => !open && setViewDetailsUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details - {viewDetailsUser?.full_name}</DialogTitle>
          </DialogHeader>
          {viewDetailsUser && (
            <UserDetailsView 
              user={{
                id: viewDetailsUser.id,
                email: viewDetailsUser.email,
                full_name: viewDetailsUser.full_name,
                created_at: viewDetailsUser.created_at,
                approval_status: viewDetailsUser.approval_status || 'pending'
              }}
              onClose={() => setViewDetailsUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};