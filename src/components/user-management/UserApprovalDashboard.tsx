import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Check, X, UserCheck, UserX, Eye, Calendar, Mail, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
}

export const UserApprovalDashboard = () => {
  const { isSuperAdmin } = useUserRole();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingUsers();
    }
  }, [isSuperAdmin]);

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers((data || []) as PendingUser[]);
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
                <Card key={user.id} className="border-l-4 border-l-yellow-400">
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

                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Phone:</span>
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              disabled={actionLoading === user.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve User Access</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to approve <strong>{user.full_name}</strong> ({user.email})?
                                <br />
                                <br />
                                This will grant them access to the platform and they'll be able to log in.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproval(user.id, true)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve User
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
    </div>
  );
};