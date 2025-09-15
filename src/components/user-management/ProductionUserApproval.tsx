import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { useRequireRole } from '@/hooks/useRequireRole';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  approval_status: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  roles: string[];
}

export const ProductionUserApproval = () => {
  useRequireRole('super_admin');
  
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  const fetchPendingUsers = async () => {
    try {
      // Use RPC instead of direct view access for better type safety
      const { data, error } = await supabase.rpc('rpc_get_pending_users');

      if (error) {
        console.error('Error fetching pending users:', error);
        toast.error('Failed to load pending users');
        return;
      }

      setPendingUsers(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    
    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleApproval = async (userId: string, decision: 'approved' | 'rejected', reason?: string) => {
    setProcessingUsers(prev => new Set([...prev, userId]));
    
    try {
      const { data, error } = await supabase.rpc('rpc_approve_user_secure', {
        target_user_id: userId,
        approval_decision: decision,
        rejection_reason: reason
      });

      if (error) {
        console.error('Approval error:', error);
        toast.error(`Failed to ${decision === 'approved' ? 'approve' : 'reject'} user: ${error.message}`);
        return;
      }

      toast.success(`User ${decision === 'approved' ? 'approved' : 'rejected'} successfully`);
      
      // Remove from pending list immediately for better UX
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading pending users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Approval Dashboard</h2>
          <p className="text-muted-foreground">Review and approve new user registrations</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {pendingUsers.length} Pending
        </Badge>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Check className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="text-muted-foreground">No pending user approvals at this time.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{user.full_name || 'Unknown'}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {user.approval_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Registered: {new Date(user.created_at).toLocaleDateString()}</p>
                    {user.roles?.length > 0 && (
                      <p>Requested roles: {user.roles.join(', ')}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproval(user.id, 'approved')}
                      disabled={processingUsers.has(user.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => handleApproval(user.id, 'rejected', 'Rejected by admin')}
                      disabled={processingUsers.has(user.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                  
                  {processingUsers.has(user.id) && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1 animate-spin" />
                      Processing...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Production Security Note</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This dashboard uses secure RPCs and follows production security standards. 
              All approval actions are logged and audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};