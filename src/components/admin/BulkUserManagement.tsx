import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApprovedUser {
  id: string;
  email: string;
  full_name: string;
  approval_status: string;
  created_at: string;
  roles: string[];
  has_player_record: boolean;
}

interface BulkUserManagementProps {
  onPlayerCreated?: () => void;
}

const BulkUserManagement: React.FC<BulkUserManagementProps> = ({ onPlayerCreated }) => {
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovedUsers();
  }, []);

  const fetchApprovedUsers = async () => {
    try {
      setLoading(true);
      
      // Get all approved users with their roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          approval_status,
          created_at
        `)
        .eq('approval_status', 'approved');

      if (profilesError) throw profilesError;

      if (!profilesData) {
        setUsers([]);
        return;
      }

      // Get roles for each user
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, is_active')
        .in('user_id', profilesData.map(u => u.id))
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Get existing player records
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('user_id')
        .in('user_id', profilesData.map(u => u.id));

      if (playersError) throw playersError;

      const playerUserIds = new Set(playersData?.map(p => p.user_id) || []);

      // Combine the data
      const usersWithRoles = profilesData.map(user => {
        const userRoles = rolesData?.filter(r => r.user_id === user.id).map(r => r.role) || [];
        const hasPlayerRecord = playerUserIds.has(user.id);
        
        return {
          ...user,
          roles: userRoles,
          has_player_record: hasPlayerRecord
        };
      });

      // Filter to show only users who need player setup, excluding administrative roles
      const administrativeRoles = ['super_admin', 'staff', 'coach', 'medical'];
      const usersNeedingPlayerSetup = usersWithRoles.filter(user => {
        // Skip users who have administrative roles (they shouldn't be converted to players)
        const hasAdminRole = user.roles.some(role => administrativeRoles.includes(role));
        if (hasAdminRole) return false;
        
        // Include users who need either player role or player record
        return !user.roles.includes('player') || !user.has_player_record;
      });

      setUsers(usersNeedingPlayerSetup);
    } catch (error: any) {
      console.error('Error fetching approved users:', error);
      toast({
        title: "Error",
        description: `Failed to load users: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedUsers(prev => 
      prev.length === users.length ? [] : users.map(user => user.id)
    );
  };

  const convertUsersToPlayers = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select at least one user to convert.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const userId of selectedUsers) {
        const user = users.find(u => u.id === userId);
        if (!user) {
          errorCount++;
          errors.push(`User not found: ${userId}`);
          continue;
        }

        try {
          let roleAssigned = false;
          let playerRecordCreated = false;

          // Assign player role if not already assigned
          if (!user.roles.includes('player')) {
            const { error: roleError } = await supabase.rpc('assign_user_role', {
              target_user_id: userId,
              target_role: 'player'
            });

            if (roleError) {
              throw new Error(`Failed to assign player role: ${roleError.message}`);
            }
            roleAssigned = true;
          }

          // Create player record if it doesn't exist
          if (!user.has_player_record) {
            const { error: playerError } = await supabase
              .from('players')
              .insert({
                user_id: userId,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (playerError) {
              throw new Error(`Failed to create player record: ${playerError.message}`);
            }
            playerRecordCreated = true;
          }

          // If we got here, the user was successfully processed
          if (roleAssigned || playerRecordCreated) {
            successCount++;
            console.log(`Successfully converted ${user.email} to player`);
          }

        } catch (userError: any) {
          errorCount++;
          const errorMsg = `${user.email}: ${userError.message}`;
          errors.push(errorMsg);
          console.error(`Error converting ${user.email}:`, userError);
        }
      }

      // Show detailed results
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "Complete Success",
          description: `Successfully converted ${successCount} user${successCount !== 1 ? 's' : ''} to players.`,
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "Partial Success",
          description: `Converted ${successCount} users successfully, ${errorCount} failed. Check console for details.`,
          variant: "destructive",
        });
      } else if (errorCount > 0) {
        toast({
          title: "Conversion Failed",
          description: `Failed to convert ${errorCount} user${errorCount !== 1 ? 's' : ''}. Check console for details.`,
          variant: "destructive",
        });
      }

      // Log detailed errors for debugging
      if (errors.length > 0) {
        console.error('Conversion errors:', errors);
      }

      // Reset selections and refetch data
      setSelectedUsers([]);
      await fetchApprovedUsers();
      
      // Notify parent component to refresh player list
      if (onPlayerCreated) {
        onPlayerCreated();
      }

    } catch (error: any) {
      console.error('Error converting users to players:', error);
      toast({
        title: "System Error",
        description: `System error during conversion: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading users...</span>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            All approved users already have player roles and records.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Convert Users to Players ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectedUsers.length === users.length}
              onCheckedChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select All ({selectedUsers.length} selected)
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                // One-click process all: select all users and convert them
                const allUserIds = users.map(user => user.id);
                setSelectedUsers(allUserIds);
                
                // Small delay to show selection, then process
                setTimeout(() => {
                  convertUsersToPlayers();
                }, 100);
              }}
              disabled={users.length === 0 || processing}
              variant="default"
              size="sm"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Process All ({users.length})
            </Button>
            
            <Button
              onClick={convertUsersToPlayers}
              disabled={selectedUsers.length === 0 || processing}
              variant="outline"
              size="sm"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Convert Selected ({selectedUsers.length})
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={() => toggleUserSelection(user.id)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{user.full_name}</span>
                  <div className="flex gap-1">
                    {user.roles.map(role => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
                
                <div className="flex gap-2 mt-1 text-xs">
                  {!user.roles.includes('player') && (
                    <Badge variant="outline" className="text-xs">
                      Needs Player Role
                    </Badge>
                  )}
                  {!user.has_player_record && (
                    <Badge variant="outline" className="text-xs">
                      Needs Player Record
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkUserManagement;