import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageSquare, 
  Send, 
  User,
  Heart,
  Activity,
  AlertTriangle,
  FileText,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ParentCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const ParentCommunicationModal: React.FC<ParentCommunicationModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    communicationType: 'health_update',
    priority: 'normal',
    includeHealthSummary: true,
    includeRecommendations: true,
    requestResponse: false,
    confidential: false
  });

  const communicationTypes = [
    { value: 'health_update', label: 'Health Status Update', icon: Heart, color: 'green' },
    { value: 'injury_report', label: 'Injury Report', icon: AlertTriangle, color: 'red' },
    { value: 'fitness_progress', label: 'Fitness Progress', icon: Activity, color: 'blue' },
    { value: 'medical_clearance', label: 'Medical Clearance', icon: FileText, color: 'purple' },
    { value: 'health_advisory', label: 'Health Advisory', icon: Clock, color: 'orange' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          profiles!inner(full_name, email),
          teams(name),
          health_wellness(fitness_score, injury_status),
          parent_child_relationships!inner(
            parent:profiles!parent_child_relationships_parent_id_fkey(full_name, email)
          )
        `)
        .eq('is_active', true)
        .order('profiles.full_name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handlePlayerSelection = (playerId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlayers([...selectedPlayers, playerId]);
    } else {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    }
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(players.map(player => player.id));
    }
  };

  const generateHealthSummary = (player: any) => {
    const healthData = player.health_wellness?.[0];
    if (!healthData) return "No recent health data available.";

    let summary = `Current Status: `;
    if (healthData.injury_status === 'injured') {
      summary += `🔴 Injured - Under medical supervision`;
    } else if (healthData.fitness_score >= 80) {
      summary += `🟢 Excellent health - Fitness score: ${healthData.fitness_score}/100`;
    } else if (healthData.fitness_score >= 60) {
      summary += `🟡 Good health - Fitness score: ${healthData.fitness_score}/100`;
    } else {
      summary += `🔴 Needs attention - Fitness score: ${healthData.fitness_score}/100`;
    }

    return summary;
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.message.trim() || selectedPlayers.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select at least one player",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create communications for each selected player
      const communications = selectedPlayers.map(playerId => ({
        sender_id: user?.id,
        subject: formData.subject,
        message: formData.message,
        communication_type: formData.communicationType,
        priority: formData.priority,
        recipient_type: 'parent',
        related_player_id: playerId,
        created_at: new Date().toISOString()
      }));

      const { data: createdComms, error: commError } = await supabase
        .from('medical_communications')
        .insert(communications)
        .select();

      if (commError) throw commError;

      // Send notifications via edge function
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-parent-communication', {
        body: {
          communications: createdComms,
          subject: formData.subject,
          message: formData.message,
          communicationType: formData.communicationType,
          priority: formData.priority,
          playerIds: selectedPlayers,
          includeHealthSummary: formData.includeHealthSummary,
          includeRecommendations: formData.includeRecommendations,
          requestResponse: formData.requestResponse,
          confidential: formData.confidential
        }
      });

      if (notificationError) {
        console.error('Notification error:', notificationError);
      }

      toast({
        title: "Parent Communication Sent",
        description: `Messages sent to parents of ${selectedPlayers.length} player(s)`,
      });

      // Reset form
      setFormData({
        subject: '',
        message: '',
        communicationType: 'health_update',
        priority: 'normal',
        includeHealthSummary: true,
        includeRecommendations: true,
        requestResponse: false,
        confidential: false
      });
      setSelectedPlayers([]);

      onClose();
    } catch (error) {
      console.error('Error sending parent communication:', error);
      toast({
        title: "Error",
        description: "Failed to send parent communication. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCommType = communicationTypes.find(type => type.value === formData.communicationType);
  const IconComponent = selectedCommType?.icon || MessageSquare;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Parent Communication
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            {/* Communication Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Communication Type</label>
              <Select value={formData.communicationType} onValueChange={(value) => setFormData({ ...formData, communicationType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communicationTypes.map((type) => {
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

            {/* Priority */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium mb-2 block">Subject *</label>
              <Input
                placeholder="Enter message subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium mb-2 block">Message *</label>
              <Textarea
                placeholder="Enter your message to parents..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[120px]"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHealthSummary"
                  checked={formData.includeHealthSummary}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeHealthSummary: checked as boolean })}
                />
                <label htmlFor="includeHealthSummary" className="text-sm font-medium leading-none">
                  Include Health Summary
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRecommendations"
                  checked={formData.includeRecommendations}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeRecommendations: checked as boolean })}
                />
                <label htmlFor="includeRecommendations" className="text-sm font-medium leading-none">
                  Include Health Recommendations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requestResponse"
                  checked={formData.requestResponse}
                  onCheckedChange={(checked) => setFormData({ ...formData, requestResponse: checked as boolean })}
                />
                <label htmlFor="requestResponse" className="text-sm font-medium leading-none">
                  Request Parent Response
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confidential"
                  checked={formData.confidential}
                  onCheckedChange={(checked) => setFormData({ ...formData, confidential: checked as boolean })}
                />
                <label htmlFor="confidential" className="text-sm font-medium leading-none">
                  Mark as Confidential
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Player Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Players *</label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedPlayers.length === players.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="border rounded-lg max-h-80 overflow-y-auto">
              {players.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2" />
                  <p>No players with parent contacts found</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {players.map((player) => (
                    <Card key={player.id} className={selectedPlayers.includes(player.id) ? 'ring-2 ring-blue-500' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`player-${player.id}`}
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={(checked) => handlePlayerSelection(player.id, checked as boolean)}
                          />
                          <div className="flex-1 min-w-0">
                            <label htmlFor={`player-${player.id}`} className="text-sm font-medium cursor-pointer">
                              {player.profiles?.full_name}
                            </label>
                            <p className="text-xs text-gray-500">{player.teams?.name || 'No team'}</p>
                            {formData.includeHealthSummary && (
                              <p className="text-xs text-gray-600 mt-1">
                                {generateHealthSummary(player)}
                              </p>
                            )}
                            {player.parent_child_relationships?.[0] && (
                              <p className="text-xs text-blue-600">
                                Parent: {player.parent_child_relationships[0].parent?.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {selectedPlayers.length > 0 && (
              <p className="text-sm text-gray-600">
                {selectedPlayers.length} player(s) selected
              </p>
            )}
          </div>
        </div>

        {/* Preview */}
        {formData.subject && formData.message && selectedPlayers.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50 mt-6">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`bg-${selectedCommType?.color}-100 text-${selectedCommType?.color}-800`}>
                  <IconComponent className="h-3 w-3 mr-1" />
                  {selectedCommType?.label}
                </Badge>
                <Badge variant="outline">{selectedPlayers.length} Recipients</Badge>
                {formData.confidential && <Badge variant="destructive">Confidential</Badge>}
              </div>
              <h5 className="font-medium">{formData.subject}</h5>
              <p className="text-sm text-gray-700">{formData.message}</p>
              {formData.includeHealthSummary && (
                <p className="text-xs text-gray-600">+ Individual health summaries will be included</p>
              )}
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
            disabled={loading || !formData.subject.trim() || !formData.message.trim() || selectedPlayers.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Sending...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send to Parents
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParentCommunicationModal;