import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  user_id: string;
  full_name: string;
  status?: string;
  notes?: string;
  membership_id?: string;
  remaining_classes?: number;
  membership_type_name?: string;
}

interface AttendanceModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  teamId: string;
  eventTitle: string;
}

export const AttendanceModalV2: React.FC<AttendanceModalV2Props> = ({
  isOpen,
  onClose,
  eventId,
  teamId,
  eventTitle
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Fetch team members and their attendance status
  const fetchPlayersAndAttendance = async () => {
    if (!eventId || !teamId) return;

    try {
      setLoading(true);

      // Get team members with their profile info using proper join
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (teamError) throw teamError;

      // Get existing attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('player_id, status, notes')
        .eq('event_id', eventId);

      if (attendanceError) throw attendanceError;

      // Get membership data using the new view
      const { data: membershipData, error: membershipError } = await supabase
        .from('vw_membership_summary_v2')
        .select('*')
        .in('user_id', teamMembers?.map(tm => tm.user_id) || []);

      if (membershipError) {
        console.warn('Could not fetch membership data:', membershipError);
      }

      // Combine the data
      const playersWithAttendance = teamMembers?.map(member => {
        const attendance = attendanceRecords?.find(ar => ar.player_id === member.user_id);
        const membership = membershipData?.find(md => md.user_id === member.user_id);
        
        return {
          id: member.user_id,
          user_id: member.user_id, // Same as id, for consistency
          full_name: member.profiles?.full_name || member.profiles?.email || 'Unknown',
          status: attendance?.status,
          notes: attendance?.notes,
          membership_id: membership?.membership_id,
          remaining_classes: membership?.remaining_classes,
          membership_type_name: membership?.membership_type_name
        };
      }) || [];

      setPlayers(playersWithAttendance);
      if (playersWithAttendance.length > 0) {
        setSelectedPlayer(playersWithAttendance[0]);
      }
    } catch (error) {
      console.error('Error fetching players and attendance:', error);
      toast({
        title: "Error loading data",
        description: "Could not load team members and attendance data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && eventId && teamId) {
      fetchPlayersAndAttendance();
    }
  }, [isOpen, eventId, teamId]);

  // Handle attendance status change using new atomic RPC
  const handleStatusChange = async (status: string) => {
    if (!selectedPlayer) return;

    try {
      setSaving(true);

      // Use the new atomic RPC that handles attendance + membership deduction
      const { data, error } = await supabase.rpc('rpc_record_attendance_with_membership_v2', {
        p_event_id: eventId,
        p_team_id: teamId,
        p_attendance_records: [
          {
            user_id: selectedPlayer.user_id,
            status: status,
            notes: selectedPlayer.notes || ''
          }
        ]
      });

      if (error) {
        throw error;
      }

      const result = data?.[0];
      if (result?.membership_deducted) {
        toast({
          title: "Attendance recorded",
          description: `${status === 'present' ? 'Class deducted from membership' : 'Attendance updated'}`,
        });
      } else {
        toast({
          title: "Attendance recorded",
          description: "Attendance status updated successfully.",
        });
      }

      // Update local state
      const updatedPlayers = players.map(p => 
        p.user_id === selectedPlayer.user_id 
          ? { ...p, status }
          : p
      );
      setPlayers(updatedPlayers);
      setSelectedPlayer({ ...selectedPlayer, status });

      // Refresh membership data
      await fetchPlayersAndAttendance();
      
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      toast({
        title: "Failed to update attendance",
        description: error.message || "An error occurred while updating attendance.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
      case 'absent':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
      case 'late':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Late</Badge>;
      case 'excused':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><AlertTriangle className="w-3 h-3 mr-1" />Excused</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] h-[600px]">
          <DialogHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 h-full">
            <Skeleton className="w-full h-full" />
            <Skeleton className="w-full h-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance - {eventTitle}
          </DialogTitle>
          <DialogDescription>
            Record attendance for team members. Membership classes will be automatically deducted for present players.
          </DialogDescription>
        </DialogHeader>

        {players.length === 0 ? (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              No team members found for this event.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Team Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team Members ({players.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {players.map((player) => (
                  <div
                    key={player.user_id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPlayer?.user_id === player.user_id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{player.full_name}</span>
                      </div>
                      {getStatusBadge(player.status)}
                    </div>
                    {player.membership_type_name && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        {player.membership_type_name} ({player.remaining_classes || 0} classes left)
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Selected Player Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedPlayer ? `${selectedPlayer.full_name}` : 'Select a Player'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPlayer ? (
                  <div className="space-y-4">
                    {/* Membership Info */}
                    {selectedPlayer.membership_type_name && (
                      <div className="p-3 bg-accent/50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Membership Status</h4>
                        <div className="space-y-1 text-sm">
                          <div>Type: {selectedPlayer.membership_type_name}</div>
                          <div>Remaining Classes: {selectedPlayer.remaining_classes || 0}</div>
                        </div>
                      </div>
                    )}

                    {/* Current Status */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Current Status</h4>
                      {getStatusBadge(selectedPlayer.status)}
                    </div>

                    {/* Action Buttons */}
                    <div>
                      <h4 className="font-medium text-sm mb-3">Update Attendance</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusChange('present')}
                          disabled={saving}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusChange('absent')}
                          disabled={saving}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Absent
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          onClick={() => handleStatusChange('late')}
                          disabled={saving}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange('excused')}
                          disabled={saving}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Excused
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a team member to record their attendance
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};