import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Edit, Archive, Trash2, Save, X, Phone, Mail, Calendar, MapPin, Users, Activity, Shield } from 'lucide-react';
import { TeamManagementModal } from '@/components/player-teams/TeamManagementModal';
import MedicalInsuranceTab from './MedicalInsuranceTab';
import { MembershipCard } from '@/components/membership/MembershipCard';
import { MembershipAssignmentModalV2 } from '@/components/membership/MembershipAssignmentModalV2';
import { AdjustUsageModal } from '@/components/membership/AdjustUsageModal';
import { useMembershipSummaryV2 } from '@/hooks/useMembershipV2';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Player {
  id: string;
  user_id: string;
  team_id?: string;
  jersey_number?: number;
  position?: string;
  height?: string;
  weight?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  is_active: boolean;
  total_shots?: number;
  total_makes?: number;
  shooting_percentage?: number;
  avg_arc_degrees?: number;
  avg_depth_inches?: number;
  last_session_date?: string;
  total_sessions?: number;
  created_at?: string;
  updated_at?: string;
  profiles?: {
    full_name: string;
    email?: string;  // Optional since it may not always be accessible
    phone?: string;
  } | null;
  teams?: {
    name: string;
    season?: string;
  };
}

interface PlayerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onUpdate: () => void;
}

const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  isOpen,
  onClose,
  player,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showMembershipAssignment, setShowMembershipAssignment] = useState(false);
  const [editedPlayer, setEditedPlayer] = useState<Partial<Player>>({});
  const [isTeammate, setIsTeammate] = useState(false);
  
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const { user } = useAuth();
  
  const { membership, loading: membershipLoading, error: membershipError, refetch: refetchMembership } = useMembershipSummaryV2(player?.user_id);
  
  // Only show membership data if user has permission to view it
  const shouldShowMembership = isSuperAdmin || hasRole('staff') || hasRole('coach') || user?.id === player?.user_id;

  useEffect(() => {
    if (player) {
      setEditedPlayer({
        jersey_number: player.jersey_number,
        position: player.position,
        height: player.height,
        weight: player.weight,
        date_of_birth: player.date_of_birth,
        emergency_contact_name: player.emergency_contact_name,
        emergency_contact_phone: player.emergency_contact_phone,
        medical_notes: player.medical_notes,
        is_active: player.is_active
      });
    }
  }, [player]);

  // Check teammate status effect - moved here to ensure consistent hook ordering
  useEffect(() => {
    const checkTeammate = async () => {
      if (!user?.id || !player?.team_id || isSuperAdmin || hasRole('staff') || hasRole('coach') || user?.id === player?.user_id) {
        return;
      }
      
      try {
        // Check if users share any teams using the player_teams junction table
        const { data: userTeams } = await supabase
          .from('player_teams')
          .select('team_id, players!inner(user_id)')
          .eq('players.user_id', user.id)
          .eq('is_active', true);

        const { data: playerTeams } = await supabase
          .from('player_teams')
          .select('team_id')
          .eq('player_id', player.id)
          .eq('is_active', true);

        const userTeamIds = userTeams?.map(ut => ut.team_id) || [];
        const playerTeamIds = playerTeams?.map(pt => pt.team_id) || [];
        const hasSharedTeam = userTeamIds.some(teamId => playerTeamIds.includes(teamId));
        
        setIsTeammate(hasSharedTeam);
        console.log('Teammate check result:', { isTeammate: hasSharedTeam });
      } catch (error) {
        console.error('Error checking teammate status:', error);
      }
    };
    
    checkTeammate();
  }, [user?.id, player?.team_id, isSuperAdmin, hasRole, player?.user_id]);

  const handleSave = async () => {
    if (!player) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          jersey_number: editedPlayer.jersey_number,
          position: editedPlayer.position,
          height: editedPlayer.height,
          weight: editedPlayer.weight,
          date_of_birth: editedPlayer.date_of_birth,
          emergency_contact_name: editedPlayer.emergency_contact_name,
          emergency_contact_phone: editedPlayer.emergency_contact_phone,
          medical_notes: editedPlayer.medical_notes,
          is_active: editedPlayer.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player information updated successfully",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating player:', error);
      toast({
        title: "Error",
        description: "Failed to update player information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!player) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player archived successfully",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error archiving player:', error);
      toast({
        title: "Error",
        description: "Failed to archive player",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!player) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player deleted successfully",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle null player case in the render, not with early return
  if (!player) {
    return null;
  }

  // Check if current user can manage players (super admin, staff, or coach)
  const canManagePlayer = isSuperAdmin || hasRole('staff') || hasRole('coach');
  
  // Check if current user is viewing their own profile
  const isOwnProfile = user?.id === player.user_id;
  
  // Players can only see their own sensitive data or basic teammate info
  const canViewSensitiveData = canManagePlayer || isOwnProfile;
  
  // Add debugging logs
  console.log('PlayerDetailsModal Debug:', {
    userId: user?.id,
    playerUserId: player.user_id,
    canManagePlayer,
    isOwnProfile,
    canViewSensitiveData,
    isSuperAdmin,
    hasStaffRole: hasRole('staff'),
    hasCoachRole: hasRole('coach')
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Player Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header with Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">
                        {player.profiles?.full_name || 'Unknown Player'}
                      </h2>
                      {player.jersey_number && (
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          #{player.jersey_number}
                        </Badge>
                      )}
                      <Badge variant={player.is_active ? "default" : "secondary"}>
                        {player.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {player.position && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {player.position}
                        </div>
                      )}
                      {player.teams?.name && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {player.teams.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {canManagePlayer && (
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(false)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={loading}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setIsEditing(true)}
                           >
                             <Edit className="h-4 w-4 mr-1" />
                             Edit
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setShowTeamManagement(true)}
                           >
                             <Users className="h-4 w-4 mr-1" />
                             Teams
                           </Button>
                           {isSuperAdmin() && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={handleArchive}
                               disabled={loading}
                             >
                               <Archive className="h-4 w-4 mr-1" />
                               Archive
                             </Button>
                           )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Player</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this player? This action cannot be undone and will remove all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Tabbed Content */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className={`grid w-full ${canViewSensitiveData ? 'grid-cols-4' : 'grid-cols-1'}`}>
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Details
                </TabsTrigger>
                {canViewSensitiveData && (
                  <>
                    <TabsTrigger value="membership" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Membership
                    </TabsTrigger>
                    <TabsTrigger value="medical" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Medical
                    </TabsTrigger>
                    <TabsTrigger value="insurance" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Insurance
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Full Name</Label>
                        <p className="text-sm mt-1">{player.profiles?.full_name || 'N/A'}</p>
                      </div>
                       {canViewSensitiveData && (
                         <>
                           <div>
                             <Label>Email</Label>
                             <div className="flex items-center gap-2 mt-1">
                               <Mail className="h-4 w-4 text-muted-foreground" />
                               <p className="text-sm">{player.profiles?.email || 'N/A'}</p>
                             </div>
                           </div>
                           <div>
                             <Label>Phone</Label>
                             <div className="flex items-center gap-2 mt-1">
                               <Phone className="h-4 w-4 text-muted-foreground" />
                               <p className="text-sm">{player.profiles?.phone || 'N/A'}</p>
                             </div>
                           </div>
                         </>
                       )}
                      <div>
                        <Label>Date of Birth</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedPlayer.date_of_birth || ''}
                            onChange={(e) => setEditedPlayer(prev => ({ ...prev, date_of_birth: e.target.value }))}
                          />
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">
                              {player.date_of_birth ? format(new Date(player.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Player Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Player Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>Jersey Number</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedPlayer.jersey_number || ''}
                            onChange={(e) => setEditedPlayer(prev => ({ ...prev, jersey_number: parseInt(e.target.value) || undefined }))}
                          />
                        ) : (
                          <p className="text-sm mt-1">{player.jersey_number || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <Label>Position</Label>
                        {isEditing ? (
                          <Select
                            value={editedPlayer.position || ''}
                            onValueChange={(value) => setEditedPlayer(prev => ({ ...prev, position: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Point Guard">Point Guard</SelectItem>
                              <SelectItem value="Shooting Guard">Shooting Guard</SelectItem>
                              <SelectItem value="Small Forward">Small Forward</SelectItem>
                              <SelectItem value="Power Forward">Power Forward</SelectItem>
                              <SelectItem value="Center">Center</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm mt-1">{player.position || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <Label>Height</Label>
                        {isEditing ? (
                          <Input
                            value={editedPlayer.height || ''}
                            onChange={(e) => setEditedPlayer(prev => ({ ...prev, height: e.target.value }))}
                            placeholder="e.g., 6'2&quot;"
                          />
                        ) : (
                          <p className="text-sm mt-1">{player.height || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <Label>Weight</Label>
                        {isEditing ? (
                          <Input
                            value={editedPlayer.weight || ''}
                            onChange={(e) => setEditedPlayer(prev => ({ ...prev, weight: e.target.value }))}
                            placeholder="e.g., 180 lbs"
                          />
                        ) : (
                          <p className="text-sm mt-1">{player.weight || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact - Only for own profile or authorized users */}
                {canViewSensitiveData && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Emergency Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Contact Name</Label>
                          {isEditing ? (
                            <Input
                              value={editedPlayer.emergency_contact_name || ''}
                              onChange={(e) => setEditedPlayer(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                            />
                          ) : (
                            <p className="text-sm mt-1">{player.emergency_contact_name || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <Label>Contact Phone</Label>
                          {isEditing ? (
                            <Input
                              value={editedPlayer.emergency_contact_phone || ''}
                              onChange={(e) => setEditedPlayer(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                            />
                          ) : (
                            <p className="text-sm mt-1">{player.emergency_contact_phone || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata - Only for own profile or authorized users */}
                {canViewSensitiveData && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <Label className="text-xs">Created</Label>
                          <p>{player.created_at ? format(new Date(player.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Last Updated</Label>
                          <p>{player.updated_at ? format(new Date(player.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {canViewSensitiveData && (
                <>
                  <TabsContent value="membership" className="space-y-6 mt-6">
                    {shouldShowMembership ? (
                      <div className="space-y-4">
                        {isSuperAdmin && (
                          <Button 
                            onClick={() => setShowMembershipAssignment(true)}
                            className="w-full"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Assign New Membership
                          </Button>
                        )}
                        
                        {membershipSummary ? (
                          <MembershipCard
                            summary={membershipSummary}
                            loading={membershipLoading}
                            showAdminControls={isSuperAdmin()}
                            onToggleOverride={(active) => toggleOverride(membershipSummary?.membership_id || '', active)}
                            onSendReminder={() => sendReminder(player.id, 'REMINDER_MANUAL')}
                            onAdjustUsage={() => {/* TODO: Implement usage adjustment */}}
                          />
                        ) : membershipLoading ? (
                          <div className="text-center py-4">Loading membership data...</div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No membership data found
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>You don't have permission to view membership information.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="medical" className="space-y-6 mt-6">
                    {/* Medical Notes */}
                    {(isSuperAdmin || player.medical_notes) && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Medical Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isEditing ? (
                            <Textarea
                              value={editedPlayer.medical_notes || ''}
                              onChange={(e) => setEditedPlayer(prev => ({ ...prev, medical_notes: e.target.value }))}
                              placeholder="Add medical notes..."
                              rows={4}
                            />
                          ) : (
                            <p className="text-sm">{player.medical_notes || 'No medical notes'}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Medical Records</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">Medical records and health information will be displayed here.</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="insurance" className="space-y-6 mt-6">
                    <MedicalInsuranceTab playerId={player.id} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <TeamManagementModal
        isOpen={showTeamManagement}
        onClose={() => setShowTeamManagement(false)}
        playerId={player.id}
        playerName={player.profiles?.full_name || 'Unknown Player'}
        onUpdate={onUpdate}
      />

      <MembershipAssignmentModalV2
        open={showMembershipAssignment}
        onClose={() => setShowMembershipAssignment(false)}
        userId={player.user_id}
        onSuccess={() => {
          refetchMembership();
          onUpdate();
        }}
      />
    </>
  );
};

export default PlayerDetailsModal;