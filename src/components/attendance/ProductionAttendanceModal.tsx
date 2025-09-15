import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAttendanceSecure } from '@/hooks/useAttendanceSecure';
import { useRealtimeMembership } from '@/hooks/useRealtimeMembership';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Clock, AlertCircle, Users, Calendar } from 'lucide-react';

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

const statusOptions = [
  { value: 'present', label: 'Present', icon: Check, color: 'bg-green-600' },
  { value: 'absent', label: 'Absent', icon: X, color: 'bg-red-600' },
  { value: 'late', label: 'Late', icon: Clock, color: 'bg-yellow-600' },
  { value: 'excused', label: 'Excused', icon: AlertCircle, color: 'bg-blue-600' },
];

export const ProductionAttendanceModal: React.FC<AttendanceModalProps> = ({
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
  const { membership } = useRealtimeMembership(selectedPlayer?.user_id);

  // Fetch team players and existing attendance
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!isOpen || !teamId) return;

      try {
        setLoading(true);
        
        // Get team members with their attendance status for this event
        const { data: teamMembers, error: membersError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            profiles!team_members_user_id_fkey(id, full_name)
          `)
          .eq('team_id', teamId)
          .eq('is_active', true);

        if (membersError) throw membersError;

        // Get existing attendance for this event
        const { data: attendance } = await supabase
          .from('attendance')
          .select('player_id, status, notes')
          .eq('event_id', eventId);

        const attendanceMap = new Map(
          attendance?.map(a => [a.player_id, { status: a.status, notes: a.notes }]) || []
        );

        const playersWithAttendance = teamMembers?.map(member => ({
          id: (member as any).profiles?.id || member.user_id,
          user_id: member.user_id,
          full_name: (member as any).profiles?.full_name || 'Unknown Player',
          current_status: attendanceMap.get(member.user_id)?.status,
          notes: attendanceMap.get(member.user_id)?.notes
        })) || [];

        setPlayers(playersWithAttendance);
        if (playersWithAttendance.length > 0 && !selectedPlayer) {
          setSelectedPlayer(playersWithAttendance[0]);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [isOpen, teamId, eventId, selectedPlayer]);

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
      setPlayers(prev => prev.map(player => 
        player.user_id === selectedPlayer.user_id 
          ? { ...player, current_status: status }
          : player
      ));
      
      // Update selected player
      setSelectedPlayer(prev => prev ? { ...prev, current_status: status } : null);
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;
    return (
      <Badge className={`${statusConfig.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance - {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Players List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Team Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading players...</div>
              ) : (
                players.map(player => (
                  <div
                    key={player.user_id}
                    className={`p-2 rounded cursor-pointer border transition-colors ${
                      selectedPlayer?.user_id === player.user_id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="font-medium text-sm">{player.full_name}</div>
                    <div className="mt-1">
                      {player.current_status ? getStatusBadge(player.current_status) : (
                        <Badge variant="outline" className="text-xs">Not Set</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Attendance Controls */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedPlayer ? `Attendance for ${selectedPlayer.full_name}` : 'Select a Player'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPlayer ? (
                <>
                  {/* Status Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = selectedPlayer.current_status === option.value;
                      
                      return (
                        <Button
                          key={option.value}
                          variant={isSelected ? "default" : "outline"}
                          className={isSelected ? option.color : ""}
                          onClick={() => handleStatusChange(option.value)}
                          disabled={saving}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>

                  <Separator />

                  {/* Membership Info */}
                  {membership && (
                    <div className="bg-muted p-3 rounded">
                      <div className="text-sm font-medium mb-2">Membership Status</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Classes Used: <span className="font-mono">{membership.used_classes}</span></div>
                        <div>Classes Remaining: <span className="font-mono">{membership.remaining_classes}</span></div>
                        <div>Total Classes: <span className="font-mono">{membership.allocated_classes}</span></div>
                        <div>Status: <Badge variant="outline">{membership.status}</Badge></div>
                      </div>
                      {membership.remaining_classes <= 0 && (
                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                          ⚠️ No remaining classes - attendance will be recorded but no credits will be deducted
                        </div>
                      )}
                    </div>
                  )}

                  {/* Current Status Display */}
                  <div className="bg-background border rounded p-3">
                    <div className="text-sm font-medium mb-2">Current Status</div>
                    {selectedPlayer.current_status ? (
                      <div className="flex items-center justify-between">
                        {getStatusBadge(selectedPlayer.current_status)}
                        <div className="text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Last updated: Just now
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No attendance recorded for this event
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  Select a player from the list to manage their attendance
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};