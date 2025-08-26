import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Edit, Save, X, Trash2, Calendar, Activity, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface PlayerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  onPlayerUpdated: () => void;
}

const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  isOpen,
  onClose,
  playerId,
  onPlayerUpdated
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const { toast } = useToast();
  const { isSuperAdmin, userRole } = useUserRole();

  const canEdit = isSuperAdmin || userRole === 'staff' || userRole === 'coach';

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerDetails();
    }
  }, [isOpen, playerId]);

  const fetchPlayerDetails = async () => {
    setLoading(true);
    try {
      // Fetch player details with profile info
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select(`
          *,
          profiles(full_name, email, phone),
          teams(name, division, age_group)
        `)
        .eq('id', playerId)
        .single();

      if (playerError) throw playerError;

      // Fetch attendance history
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('player_attendance')
        .select(`
          *,
          schedules(title, start_time, event_type)
        `)
        .eq('player_id', playerId)
        .order('marked_at', { ascending: false })
        .limit(10);

      if (!attendanceError) {
        setAttendanceHistory(attendanceData || []);
      }

      setPlayer(playerData);
      setTeam(playerData.teams);
      setFormData({
        name: playerData.name || '',
        jersey_number: playerData.jersey_number || '',
        position: playerData.position || '',
        height: playerData.height || '',
        weight: playerData.weight || '',
        date_of_birth: playerData.date_of_birth || '',
        emergency_contact_name: playerData.emergency_contact_name || '',
        emergency_contact_phone: playerData.emergency_contact_phone || '',
        medical_notes: playerData.medical_notes || '',
        notes: playerData.notes || ''
      });
    } catch (error) {
      console.error('Error fetching player details:', error);
      toast({
        title: "Error",
        description: "Failed to load player details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('players')
        .update(formData)
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player details updated successfully",
      });

      setEditing(false);
      onPlayerUpdated();
      fetchPlayerDetails();
    } catch (error) {
      console.error('Error updating player:', error);
      toast({
        title: "Error",
        description: "Failed to update player details",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      // Delete related attendance records
      await supabase
        .from('player_attendance')
        .delete()
        .eq('player_id', playerId);

      // Deactivate the player instead of deleting
      const { error } = await supabase
        .from('players')
        .update({ is_active: false })
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player deactivated successfully",
      });

      onPlayerUpdated();
      onClose();
    } catch (error) {
      console.error('Error deactivating player:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate player",
        variant: "destructive",
      });
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!player) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {player.profiles?.full_name || player.name || `Player #${player.jersey_number}`}
            {editing && <Badge variant="outline">Editing</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">Loading player details...</div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Player Details</TabsTrigger>
              <TabsTrigger value="attendance">Attendance History</TabsTrigger>
              <TabsTrigger value="medical">Medical & Emergency</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      {editing ? (
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      ) : (
                        <p className="p-2 border rounded">{player.name || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="jersey">Jersey Number</Label>
                      {editing ? (
                        <Input
                          id="jersey"
                          type="number"
                          value={formData.jersey_number}
                          onChange={(e) => setFormData({...formData, jersey_number: e.target.value})}
                        />
                      ) : (
                        <p className="p-2 border rounded">{player.jersey_number || 'Not assigned'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      {editing ? (
                        <Select value={formData.position} onValueChange={(value) => setFormData({...formData, position: value})}>
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
                        <p className="p-2 border rounded">{player.position || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Team</Label>
                      <p className="p-2 border rounded">
                        {team?.name || 'No team assigned'}
                        {team?.division && ` (${team.division})`}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="height">Height</Label>
                      {editing ? (
                        <Input
                          id="height"
                          value={formData.height}
                          placeholder="e.g., 6'2"
                          onChange={(e) => setFormData({...formData, height: e.target.value})}
                        />
                      ) : (
                        <p className="p-2 border rounded">{player.height || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight</Label>
                      {editing ? (
                        <Input
                          id="weight"
                          value={formData.weight}
                          placeholder="e.g., 180 lbs"
                          onChange={(e) => setFormData({...formData, weight: e.target.value})}
                        />
                      ) : (
                        <p className="p-2 border rounded">{player.weight || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      {editing ? (
                        <Input
                          id="dob"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                        />
                      ) : (
                        <p className="p-2 border rounded">
                          {player.date_of_birth ? format(new Date(player.date_of_birth), 'MMM d, yyyy') : 'Not provided'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge variant={player.is_active ? "default" : "secondary"}>
                        {player.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    {editing ? (
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        placeholder="Additional notes about the player..."
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      />
                    ) : (
                      <p className="p-2 border rounded min-h-[60px]">{player.notes || 'No notes'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recent Attendance ({attendanceHistory.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceHistory.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceHistory.map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{record.schedules?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(record.schedules?.start_time), 'MMM d, yyyy h:mm a')} • {record.schedules?.event_type}
                            </p>
                            {record.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>
                            )}
                          </div>
                          <Badge className={getAttendanceColor(record.status)}>
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No attendance records found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Emergency Contact & Medical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergency_name">Emergency Contact Name</Label>
                      {editing ? (
                        <Input
                          id="emergency_name"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                        />
                      ) : (
                        <p className="p-2 border rounded">{player.emergency_contact_name || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
                      {editing ? (
                        <Input
                          id="emergency_phone"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                        />
                      ) : (
                        <p className="p-2 border rounded">{player.emergency_contact_phone || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="medical_notes">Medical Notes</Label>
                    {editing ? (
                      <Textarea
                        id="medical_notes"
                        value={formData.medical_notes}
                        placeholder="Medical conditions, allergies, medications, etc."
                        onChange={(e) => setFormData({...formData, medical_notes: e.target.value})}
                      />
                    ) : (
                      <p className="p-2 border rounded min-h-[80px]">{player.medical_notes || 'No medical notes'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {canEdit && (
            <>
              {editing ? (
                <>
                  <Button onClick={handleSave} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: player.name || '',
                        jersey_number: player.jersey_number || '',
                        position: player.position || '',
                        height: player.height || '',
                        weight: player.weight || '',
                        date_of_birth: player.date_of_birth || '',
                        emergency_contact_name: player.emergency_contact_name || '',
                        emergency_contact_phone: player.emergency_contact_phone || '',
                        medical_notes: player.medical_notes || '',
                        notes: player.notes || ''
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Player
                </Button>
              )}

              {isSuperAdmin && !editing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Deactivate
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deactivate Player</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to deactivate this player? This will remove them from active rosters but preserve their data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Deactivate Player
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}

          <Button variant="outline" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailsModal;