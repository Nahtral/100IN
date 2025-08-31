import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Users, CheckCircle, XCircle, Eye, Clock, UserPlus } from 'lucide-react';

interface ParentChildRequest {
  request_id: string;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_email: string;
  relationship_type: string;
  status: string;
  requested_at: string;
}

interface ParentProfile {
  id: string;
  full_name: string;
  email: string;
  children_count: number;
  pending_requests: number;
  created_at: string;
}

export const ParentsManagement = () => {
  const { toast } = useToast();
  const [parentChildRequests, setParentChildRequests] = useState<ParentChildRequest[]>([]);
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchParentChildRequests(),
        fetchParents()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchParentChildRequests = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_parent_child_requests');

      if (error) throw error;
      setParentChildRequests(data || []);
    } catch (error) {
      console.error('Error fetching parent-child requests:', error);
      toast({
        title: "Error",
        description: "Failed to load parent-child requests",
        variant: "destructive",
      });
    }
  };

  const fetchParents = async () => {
    try {
      // Get all users with parent role
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          created_at,
          user_roles!inner(role, is_active)
        `)
        .eq('user_roles.role', 'parent')
        .eq('user_roles.is_active', true);

      if (profilesError) throw profilesError;

      // Get children count and pending requests for each parent
      const parentsData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Count approved children
          const { count: childrenCount } = await supabase
            .from('parent_child_relationships')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', profile.id)
            .eq('status', 'approved');

          // Count pending requests
          const { count: pendingCount } = await supabase
            .from('parent_child_relationships')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', profile.id)
            .eq('status', 'pending');

          return {
            id: profile.id,
            full_name: profile.full_name || 'Unknown',
            email: profile.email,
            children_count: childrenCount || 0,
            pending_requests: pendingCount || 0,
            created_at: profile.created_at
          };
        })
      );

      setParents(parentsData);
    } catch (error) {
      console.error('Error fetching parents:', error);
      toast({
        title: "Error",
        description: "Failed to load parents data",
        variant: "destructive",
      });
    }
  };

  const handleRequestAction = async (requestId: string, approved: boolean) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('parent_child_relationships')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: approved ? "Request Approved" : "Request Rejected",
        description: `Parent-child relationship request has been ${approved ? 'approved' : 'rejected'}.`,
      });

      fetchData();
    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const filteredParents = parents.filter(parent => 
    parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Heart className="h-8 w-8 animate-spin mx-auto mb-4 text-panthers-red" />
          <p>Loading parent management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mobile-subtitle">Parent Management</h2>
          <p className="text-muted-foreground mobile-text-sm">
            Manage parent accounts and child relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {parents.length} Parents
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            {parentChildRequests.filter(r => r.status === 'pending').length} Pending
          </Badge>
        </div>
      </div>

      {/* Parent-Child Connection Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-panthers-red" />
            Parent-Child Connection Requests
            <Badge variant="secondary">
              {parentChildRequests.filter(r => r.status === 'pending').length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {parentChildRequests.filter(r => r.status === 'pending').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>No pending parent-child connection requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {parentChildRequests
                .filter(r => r.status === 'pending')
                .map((request) => (
                  <div key={request.request_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-panthers-red" />
                      <div>
                        <p className="font-medium">
                          {request.parent_name} → {request.child_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.parent_email} requesting {request.relationship_type} relationship with {request.child_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested: {formatTimeAgo(request.requested_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRequestAction(request.request_id, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* View details */}}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRequestAction(request.request_id, false)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parents Directory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Parent Directory
          </CardTitle>
          <div className="mt-4">
            <Input
              placeholder="Search parents by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredParents.map((parent) => (
              <div key={parent.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Heart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{parent.full_name}</p>
                    <p className="text-sm text-muted-foreground">{parent.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {parent.children_count} Children
                      </Badge>
                      {parent.pending_requests > 0 && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                          {parent.pending_requests} Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Child
                  </Button>
                </div>
              </div>
            ))}
            {filteredParents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p>No parents found matching your search</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};