import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAttendanceSecure } from '@/hooks/useAttendanceSecure';
import { useHardenedMembership } from '@/hooks/useHardenedMembership';
import { UserCheck, UserX, Clock, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Player {
  id: string;
  user_id: string;
  full_name: string;
  current_status?: string;
  notes?: string;
}

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  teamId: string;
  eventTitle: string;
}

export const HardenedAttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  eventId,
  teamId,
  eventTitle
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { saveAttendance, saving } = useAttendanceSecure();
  const { membership, loading: membershipLoading } = useHardenedMembership(selectedPlayer?.user_id);

  // Fetch team members and their current attendance
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!isOpen || !teamId || !eventId) return;

      try {
        setLoading(true);

        // Get team members
        const { data: teamMembers, error: membersError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            profiles:user_id (
              id,
              full_name
            )
          `)
          .eq('team_id', teamId)
          .eq('is_active', true);

        if (membersError) {
          console.error('Error fetching team members:', membersError);
          toast.error('Failed to load team members');
          return;
        }

        // Get existing attendance for this event
        const playerIds = teamMembers?.map(m => m.user_id) || [];
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('player_id, status, notes')
          .eq('event_id', eventId)
          .in('player_id', playerIds);

        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError);
        }

        // Combine data
        const playersWithAttendance = teamMembers?.map(member => ({
          id: member.user_id,
          user_id: member.user_id,
          full_name: (member.profiles as any)?.full_name || 'Unknown',
          current_status: attendanceData?.find(a => a.player_id === member.user_id)?.status,
          notes: attendanceData?.find(a => a.player_id === member.user_id)?.notes
        })) || [];

        setPlayers(playersWithAttendance);
        
        if (playersWithAttendance.length > 0 && !selectedPlayer) {
          setSelectedPlayer(playersWithAttendance[0]);
        }
      } catch (error) {
        console.error('Error loading attendance data:', error);
        toast.error('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [isOpen, eventId, teamId, selectedPlayer]);

  const handleStatusChange = async (status: string) => {
    if (!selectedPlayer) return;

    const success = await saveAttendance(
      eventId,
      teamId,
      selectedPlayer.user_id,
      status,
      selectedPlayer.notes
    );

    if (success) {
      // Update local state optimistically
      setPlayers(prev => 
        prev.map(p => 
          p.user_id === selectedPlayer.user_id 
            ? { ...p, current_status: status }
            : p
        )
      );
      
      setSelectedPlayer(prev => 
        prev ? { ...prev, current_status: status } : null
      );
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-600"><UserCheck className="h-3 w-3 mr-1" />Present</Badge>;
      case 'absent':
        return <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" />Absent</Badge>;
      case 'late':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Late</Badge>;
      case 'excused':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Excused</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading Attendance...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendance - {eventTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Team Members ({players.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {players.map(player => (
                <div
                  key={player.user_id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedPlayer?.user_id === player.user_id 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{player.full_name}</div>
                      <div className="mt-1">
                        {getStatusBadge(player.current_status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Player Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedPlayer ? `Attendance: ${selectedPlayer.full_name}` : 'Select a Player'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPlayer ? (
                <div className="space-y-4">
                  {/* Current Status */}
                  <div>
                    <div className="text-sm font-medium mb-2">Current Status:</div>
                    {getStatusBadge(selectedPlayer.current_status)}
                  </div>

                  {/* Membership Info */}
                  {!membershipLoading && membership && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm font-medium">Membership Status</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Type: {membership.membership_type_name}</div>
                        <div>Remaining Classes: {membership.remaining_classes}/{membership.allocated_classes}</div>
                        {membership.days_left !== null && (
                          <div>Days Left: {membership.days_left}</div>
                        )}
                        {membership.should_deactivate && (
                          <div className="text-amber-600 font-medium">⚠️ Membership expiring soon</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attendance Buttons */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Mark Attendance:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleStatusChange('present')}
                        disabled={saving}
                        className={`${
                          selectedPlayer.current_status === 'present' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : ''
                        }`}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Present
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleStatusChange('absent')}
                        disabled={saving}
                        className={
                          selectedPlayer.current_status === 'absent' 
                            ? 'opacity-100' 
                            : ''
                        }
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Absent
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleStatusChange('late')}
                        disabled={saving}
                        className={
                          selectedPlayer.current_status === 'late' 
                            ? 'bg-secondary' 
                            : ''
                        }
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Late
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange('excused')}
                        disabled={saving}
                        className={
                          selectedPlayer.current_status === 'excused' 
                            ? 'bg-muted' 
                            : ''
                        }
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Excused
                      </Button>
                    </div>
                  </div>

                  {saving && (
                    <div className="text-center py-2 text-muted-foreground">
                      Saving attendance...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a player to manage their attendance
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};