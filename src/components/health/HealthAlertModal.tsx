import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell, 
  Send, 
  AlertTriangle,
  Users,
  UserCheck,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface HealthAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const HealthAlertModal: React.FC<HealthAlertModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'high',
    alertType: 'emergency',
    sendToPlayers: true,
    sendToParents: true,
    sendToStaff: true,
    sendEmail: true,
    sendSMS: false
  });

  const alertTypes = [
    { value: 'emergency', label: 'Emergency Alert', color: 'red' },
    { value: 'injury', label: 'Injury Report', color: 'orange' },
    { value: 'health_advisory', label: 'Health Advisory', color: 'yellow' },
    { value: 'protocol_update', label: 'Protocol Update', color: 'blue' }
  ];

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Build recipient list
      const recipients = [];
      if (formData.sendToPlayers) recipients.push('player');
      if (formData.sendToParents) recipients.push('parent');
      if (formData.sendToStaff) recipients.push('staff');

      // Create the communication record
      const communicationData = {
        sender_id: user?.id,
        subject: formData.subject,
        message: formData.message,
        communication_type: formData.alertType,
        priority: formData.priority,
        recipient_type: 'multiple',
        recipient_ids: null, // Will be populated by edge function
        created_at: new Date().toISOString()
      };

      const { data: communication, error: commError } = await supabase
        .from('medical_communications')
        .insert([communicationData])
        .select()
        .single();

      if (commError) throw commError;

      // Send notifications via edge function
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-health-alert', {
        body: {
          communicationId: communication.id,
          subject: formData.subject,
          message: formData.message,
          alertType: formData.alertType,
          priority: formData.priority,
          recipients,
          sendEmail: formData.sendEmail,
          sendSMS: formData.sendSMS
        }
      });

      if (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the whole operation if notifications fail
      }

      toast({
        title: "Health Alert Sent",
        description: `Alert sent to ${recipients.length} recipient group(s)`,
      });

      // Reset form
      setFormData({
        subject: '',
        message: '',
        priority: 'high',
        alertType: 'emergency',
        sendToPlayers: true,
        sendToParents: true,
        sendToStaff: true,
        sendEmail: true,
        sendSMS: false
      });

      onClose();
    } catch (error) {
      console.error('Error sending alert:', error);
      toast({
        title: "Error",
        description: "Failed to send health alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedAlertType = alertTypes.find(type => type.value === formData.alertType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-600" />
            Send Health Alert
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Alert Type</label>
            <Select value={formData.alertType} onValueChange={(value) => setFormData({ ...formData, alertType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alertTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${type.color}-500`}></div>
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium mb-2 block">Priority Level</label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    High Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    Normal Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subject *</label>
            <Input
              placeholder="Enter alert subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message *</label>
            <Textarea
              placeholder="Enter alert message..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="min-h-[120px]"
            />
          </div>

          {/* Recipients */}
          <div>
            <label className="text-sm font-medium mb-3 block">Send To</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendToPlayers"
                  checked={formData.sendToPlayers}
                  onCheckedChange={(checked) => setFormData({ ...formData, sendToPlayers: checked as boolean })}
                />
                <label htmlFor="sendToPlayers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  All Players
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendToParents"
                  checked={formData.sendToParents}
                  onCheckedChange={(checked) => setFormData({ ...formData, sendToParents: checked as boolean })}
                />
                <label htmlFor="sendToParents" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  All Parents
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendToStaff"
                  checked={formData.sendToStaff}
                  onCheckedChange={(checked) => setFormData({ ...formData, sendToStaff: checked as boolean })}
                />
                <label htmlFor="sendToStaff" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  All Staff & Coaches
                </label>
              </div>
            </div>
          </div>

          {/* Delivery Methods */}
          <div>
            <label className="text-sm font-medium mb-3 block">Delivery Methods</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={formData.sendEmail}
                  onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked as boolean })}
                />
                <label htmlFor="sendEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email Notification
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendSMS"
                  checked={formData.sendSMS}
                  onCheckedChange={(checked) => setFormData({ ...formData, sendSMS: checked as boolean })}
                />
                <label htmlFor="sendSMS" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  SMS Alert (Emergency Only)
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {formData.subject && formData.message && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-2">Preview</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`bg-${selectedAlertType?.color}-100 text-${selectedAlertType?.color}-800`}>
                    {selectedAlertType?.label}
                  </Badge>
                  <Badge variant="outline">{formData.priority.toUpperCase()}</Badge>
                </div>
                <h5 className="font-medium">{formData.subject}</h5>
                <p className="text-sm text-gray-700">{formData.message}</p>
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
              disabled={loading || !formData.subject.trim() || !formData.message.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Sending...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Alert
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HealthAlertModal;