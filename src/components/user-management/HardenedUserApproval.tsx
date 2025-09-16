import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck, UserX, Clock, RefreshCw } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  approval_status: string;
}

export const HardenedUserApproval = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      
      // Use the new hardened RPC function
      const { data, error } = await supabase.rpc('rpc_get_pending_users');

      if (error) {
        console.error('Error fetching pending users:', error);
        toast.error(`Failed to load pending users: ${error.message}`);
        return;
      }

      setPendingUsers(data || []);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUserApproval = async (userId: string, approve: boolean) => {
    setProcessingUsers(prev => new Set([...prev, userId]));

    try {
      // Update approval status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          approval_status: approve ? 'approved' : 'rejected',
          rejection_reason: approve ? null : 'Rejected by admin'
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user status:', updateError);
        toast.error(`Failed to ${approve ? 'approve' : 'reject'} user: ${updateError.message}`);
        return;
      }

      if (approve) {
        // Assign player role if approved
        const { error: roleError } = await supabase.rpc('assign_user_role', {
          target_user_id: userId,
          target_role: 'player'
        });

        if (roleError) {
          console.error('Error assigning role:', roleError);
          toast.error('User approved but failed to assign role');
        } else {
          toast.success('User approved and player role assigned');
        }
      } else {
        toast.success('User rejected');
      }

      // Refresh the list
      await fetchPendingUsers();
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setProcessingUsers(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  // Real-time subscription for new registrations
  useEffect(() => {
    const userChannel = supabase
      .channel('hardened-user-approvals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
          filter: 'approval_status=eq.pending'
        },
        () => {
          console.log('New user registration detected, refreshing...');
          fetchPendingUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('User profile updated, refreshing...');
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Loading Pending Users...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending User Approvals ({pendingUsers.length})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingUsers}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending user approvals
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{user.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.phone && (
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {user.approval_status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Registered: {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleUserApproval(user.id, false)}
                    disabled={processingUsers.has(user.id)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUserApproval(user.id, true)}
                    disabled={processingUsers.has(user.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};