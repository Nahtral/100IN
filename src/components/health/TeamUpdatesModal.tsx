import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Send, 
  Calendar,
  Activity,
  Heart,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TeamUpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const TeamUpdatesModal: React.FC<TeamUpdatesModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    updateType: 'general',
    selectedTeams: [] as string[],
    includeParents: true,
    includeCoaches: true,
    scheduledFor: '',
    attachments: [] as File[]
  });

  const updateTypes = [
    { value: 'general', label: 'General Update', icon: Users, color: 'blue' },
    { value: 'health_summary', label: 'Health Summary', icon: Heart, color: 'red' },
    { value: 'training_update', label: 'Training Update', icon: Activity, color: 'green' },
    { value: 'safety_protocol', label: 'Safety Protocol', icon: Shield, color: 'orange' },
    { value: 'schedule_change', label: 'Schedule Change', icon: Calendar, color: 'purple' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, sport')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        selectedTeams: [...formData.selectedTeams, teamId]
      });
    } else {
      setFormData({
        ...formData,
        selectedTeams: formData.selectedTeams.filter(id => id !== teamId)
      });
    }
  };

  const handleSelectAllTeams = () => {
    const allTeamIds = teams.map(team => team.id);
    setFormData({
      ...formData,
      selectedTeams: formData.selectedTeams.length === teams.length ? [] : allTeamIds
    });
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.message.trim() || formData.selectedTeams.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select at least one team",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create the communication record
      const communicationData = {
        sender_id: user?.id,
        subject: formData.subject,
        message: formData.message,
        communication_type: formData.updateType,
        priority: 'normal',
        recipient_type: 'team',
        recipient_ids: formData.selectedTeams,
        created_at: new Date().toISOString()
      };

      const { data: communication, error: commError } = await supabase
        .from('medical_communications')
        .insert([communicationData])
        .select()
        .single();

      if (commError) throw commError;

      // Send notifications via edge function
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-team-update', {
        body: {
          communicationId: communication.id,
          subject: formData.subject,
          message: formData.message,
          updateType: formData.updateType,
          teamIds: formData.selectedTeams,
          includeParents: formData.includeParents,
          includeCoaches: formData.includeCoaches,
          scheduledFor: formData.scheduledFor || null
        }
      });

      if (notificationError) {
        console.error('Notification error:', notificationError);
      }

      toast({
        title: "Team Update Sent",
        description: `Update sent to ${formData.selectedTeams.length} team(s)`,
      });

      // Reset form
      setFormData({
        subject: '',
        message: '',
        updateType: 'general',
        selectedTeams: [],
        includeParents: true,
        includeCoaches: true,
        scheduledFor: '',
        attachments: []
      });

      onClose();
    } catch (error) {
      console.error('Error sending team update:', error);
      toast({
        title: "Error",
        description: "Failed to send team update. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedUpdateType = updateTypes.find(type => type.value === formData.updateType);
  const IconComponent = selectedUpdateType?.icon || Users;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Send Team Updates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Update Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Update Type</label>
            <Select value={formData.updateType} onValueChange={(value) => setFormData({ ...formData, updateType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {updateTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 text-${type.color}-500`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Select Teams *</label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAllTeams}
              >
                {formData.selectedTeams.length === teams.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
              {teams.length === 0 ? (
                <p className="text-sm text-gray-500">No teams available</p>
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`team-${team.id}`}
                        checked={formData.selectedTeams.includes(team.id)}
                        onCheckedChange={(checked) => handleTeamSelection(team.id, checked as boolean)}
                      />
                      <label htmlFor={`team-${team.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {team.name} {team.sport && `(${team.sport})`}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {formData.selectedTeams.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {formData.selectedTeams.length} team(s) selected
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subject *</label>
            <Input
              placeholder="Enter update subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message *</label>
            <Textarea
              placeholder="Enter team update message..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="min-h-[120px]"
            />
          </div>

          {/* Additional Recipients */}
          <div>
            <label className="text-sm font-medium mb-3 block">Additional Recipients</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeParents"
                  checked={formData.includeParents}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeParents: checked as boolean })}
                />
                <label htmlFor="includeParents" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Include Parents/Guardians
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCoaches"
                  checked={formData.includeCoaches}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeCoaches: checked as boolean })}
                />
                <label htmlFor="includeCoaches" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Include Coaching Staff
                </label>
              </div>
            </div>
          </div>

          {/* Schedule Delivery */}
          <div>
            <label className="text-sm font-medium mb-2 block">Schedule Delivery (Optional)</label>
            <Input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to send immediately</p>
          </div>

          {/* Preview */}
          {formData.subject && formData.message && formData.selectedTeams.length > 0 && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-2">Preview</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`bg-${selectedUpdateType?.color}-100 text-${selectedUpdateType?.color}-800`}>
                    <IconComponent className="h-3 w-3 mr-1" />
                    {selectedUpdateType?.label}
                  </Badge>
                  <Badge variant="outline">
                    {formData.selectedTeams.length} Team(s)
                  </Badge>
                </div>
                <h5 className="font-medium">{formData.subject}</h5>
                <p className="text-sm text-gray-700">{formData.message}</p>
                <div className="text-xs text-gray-500">
                  Recipients: Players
                  {formData.includeParents && ', Parents'}
                  {formData.includeCoaches && ', Coaches'}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !formData.subject.trim() || !formData.message.trim() || formData.selectedTeams.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Sending...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {formData.scheduledFor ? 'Schedule Update' : 'Send Update'}
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamUpdatesModal;