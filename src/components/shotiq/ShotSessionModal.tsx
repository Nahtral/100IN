import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Trash2, 
  Archive, 
  BarChart3, 
  Target, 
  Clock,
  MapPin,
  User,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface ShotSession {
  id: string;
  player_id: string;
  super_admin_id: string;
  session_name: string;
  location?: string;
  rim_height_inches: number;
  total_shots: number;
  makes: number;
  avg_arc_degrees?: number;
  avg_depth_inches?: number;
  avg_lr_deviation_inches?: number;
  session_duration_minutes?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'archived';
}

interface ShotSessionModalProps {
  session?: ShotSession | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'view' | 'create' | 'edit';
}

interface Player {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
}

const ShotSessionModal: React.FC<ShotSessionModalProps> = ({
  session,
  open,
  onClose,
  onSuccess,
  mode
}) => {
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessionShots, setSessionShots] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    session_name: '',
    player_id: '',
    location: 'Court',
    rim_height_inches: 120,
    notes: ''
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadPlayers();
      if (session) {
        setFormData({
          session_name: session.session_name || '',
          player_id: session.player_id || '',
          location: session.location || 'Court',
          rim_height_inches: session.rim_height_inches || 120,
          notes: session.notes || ''
        });
        loadSessionShots(session.id);
      } else {
        resetForm();
      }
    }
  }, [open, session]);

  const loadPlayers = async () => {
    try {
      const { data: playersData } = await supabase
        .from('players')
        .select('id, user_id')
        .eq('is_active', true);

      const userIds = playersData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const combinedData = playersData?.map(player => {
        const profile = profilesData?.find(p => p.id === player.user_id);
        return {
          ...player,
          full_name: profile?.full_name || profile?.email || 'Unknown Player',
          email: profile?.email
        };
      });

      setPlayers(combinedData || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadSessionShots = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('shots')
        .select('*')
        .eq('session_id', sessionId)
        .order('shot_number', { ascending: true });
      
      setSessionShots(data || []);
    } catch (error) {
      console.error('Error loading session shots:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      session_name: '',
      player_id: '',
      location: 'Court',
      rim_height_inches: 120,
      notes: ''
    });
    setErrors({});
    setSessionShots([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.session_name.trim()) {
      newErrors.session_name = 'Session name is required';
    }
    if (!formData.player_id) {
      newErrors.player_id = 'Player selection is required';
    }
    if (formData.rim_height_inches < 72 || formData.rim_height_inches > 144) {
      newErrors.rim_height_inches = 'Rim height must be between 6-12 feet';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (mode === 'create') {
        const { data, error } = await supabase
          .from('shot_sessions')
          .insert({
            ...formData,
            super_admin_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Session Created",
          description: "New shot session has been created successfully",
        });
      } else if (mode === 'edit' && session) {
        const { error } = await supabase
          .from('shot_sessions')
          .update(formData)
          .eq('id', session.id);

        if (error) throw error;

        toast({
          title: "Session Updated",
          description: "Session details have been updated successfully",
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session || !isSuperAdmin) return;

    if (!confirm('Are you sure you want to delete this session? This will also delete all associated shot data.')) {
      return;
    }

    setLoading(true);
    try {
      // First delete associated shots
      await supabase
        .from('shots')
        .delete()
        .eq('session_id', session.id);

      // Then delete the session
      const { error } = await supabase
        .from('shot_sessions')
        .delete()
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Session Deleted",
        description: "Session and all associated data have been deleted",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!session) return;

    setLoading(true);
    try {
      // For now, we'll just add a note about archiving since the table might not have status column
      const { error } = await supabase
        .from('shot_sessions')
        .update({ 
          notes: (session.notes || '') + (session.notes ? '\n' : '') + `[ARCHIVED at ${new Date().toISOString()}]`
        })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Session Archived",
        description: "Session has been marked as archived in notes",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error archiving session:', error);
      toast({
        title: "Error",
        description: "Failed to archive session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'archived': return 'outline';
      default: return 'outline';
    }
  };

  const playerName = players.find(p => p.id === (session?.player_id || formData.player_id))?.full_name || 'Unknown Player';
  const shootingPercentage = session ? 
    (session.total_shots > 0 ? ((session.makes / session.total_shots) * 100).toFixed(1) : '0') : 
    '0';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {mode === 'create' ? 'Create New Session' : 
             mode === 'edit' ? 'Edit Session' : 'Session Details'}
            {session && (
              <Badge variant="default" className="ml-2">
                Active
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="analytics" disabled={!session}>Analytics</TabsTrigger>
            <TabsTrigger value="shots" disabled={!session}>Shots ({sessionShots.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session Name */}
              <div className="space-y-2">
                <Label htmlFor="session-name">Session Name *</Label>
                <Input
                  id="session-name"
                  value={formData.session_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_name: e.target.value }))}
                  placeholder="Enter session name"
                  disabled={mode === 'view'}
                  className={errors.session_name ? 'border-destructive' : ''}
                />
                {errors.session_name && (
                  <p className="text-sm text-destructive">{errors.session_name}</p>
                )}
              </div>

              {/* Player Selection */}
              <div className="space-y-2">
                <Label htmlFor="player-select">Player *</Label>
                <Select 
                  value={formData.player_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, player_id: value }))}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger className={errors.player_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.player_id && (
                  <p className="text-sm text-destructive">{errors.player_id}</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Court location"
                  disabled={mode === 'view'}
                />
              </div>

              {/* Rim Height */}
              <div className="space-y-2">
                <Label htmlFor="rim-height">Rim Height (inches) *</Label>
                <Input
                  id="rim-height"
                  type="number"
                  min="72"
                  max="144"
                  value={formData.rim_height_inches}
                  onChange={(e) => setFormData(prev => ({ ...prev, rim_height_inches: parseInt(e.target.value) || 120 }))}
                  disabled={mode === 'view'}
                  className={errors.rim_height_inches ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">Standard: 120 inches (10 feet)</p>
                {errors.rim_height_inches && (
                  <p className="text-sm text-destructive">{errors.rim_height_inches}</p>
                )}
              </div>

              {false && ( // Remove status selection for now
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Active" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Session notes and observations..."
                disabled={mode === 'view'}
                rows={3}
              />
            </div>

            {/* Session Stats (View/Edit mode) */}
            {session && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{session.total_shots}</div>
                      <div className="text-sm text-muted-foreground">Total Shots</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{session.makes}</div>
                      <div className="text-sm text-muted-foreground">Makes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{shootingPercentage}%</div>
                      <div className="text-sm text-muted-foreground">Shooting %</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {session.session_duration_minutes || 0}m
                      </div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-6">
            {session && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Average Arc</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {session.avg_arc_degrees?.toFixed(1) || '0.0'}°
                    </div>
                    <p className="text-xs text-muted-foreground">Optimal: 45-50°</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Average Depth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {session.avg_depth_inches?.toFixed(1) || '0.0'}"
                    </div>
                    <p className="text-xs text-muted-foreground">Optimal: 8-12"</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">L/R Deviation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {session.avg_lr_deviation_inches?.toFixed(1) || '0.0'}"
                    </div>
                    <p className="text-xs text-muted-foreground">Optimal: ±2"</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shots" className="space-y-4 mt-6">
            {sessionShots.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessionShots.map((shot, index) => (
                  <Card key={shot.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">#{shot.shot_number}</div>
                        <Badge variant={shot.made ? "default" : "destructive"}>
                          {shot.made ? "MADE" : "MISS"}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {shot.shot_type}
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>Arc: {shot.arc_degrees?.toFixed(1)}°</span>
                        <span>Depth: {shot.depth_inches?.toFixed(1)}"</span>
                        <span>L/R: {shot.lr_deviation_inches?.toFixed(1)}"</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No shots recorded in this session</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {!isSuperAdmin && mode !== 'view' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only Super Admins can modify shot sessions.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {mode !== 'create' && session && isSuperAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  disabled={loading}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {mode !== 'view' && isSuperAdmin && (
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShotSessionModal;