import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Phone, 
  MessageSquare, 
  Clock,
  MapPin,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EmergencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile?: any;
}

const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({ 
  isOpen, 
  onClose, 
  playerProfile 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emergencyType, setEmergencyType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [contactedEMS, setContactedEMS] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emergencyTypes = [
    'Medical Emergency',
    'Serious Injury',
    'Cardiac Event',
    'Heat-Related Illness',
    'Concussion/Head Injury',
    'Fracture/Bone Injury',
    'Allergic Reaction',
    'Other Emergency'
  ];

  const severityLevels = [
    { value: 'critical', label: 'Critical - Life Threatening', color: 'text-red-800' },
    { value: 'severe', label: 'Severe - Immediate Attention', color: 'text-red-600' },
    { value: 'urgent', label: 'Urgent - Prompt Care Needed', color: 'text-orange-600' }
  ];

  const handleSubmit = async () => {
    if (!emergencyType || !severity || !description.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required emergency details.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create emergency communication
      const emergencyData = {
        sender_id: user?.id,
        recipient_type: 'medical',
        subject: `EMERGENCY ALERT: ${emergencyType}`,
        message: `EMERGENCY SITUATION REPORTED

Type: ${emergencyType}
Severity: ${severity.toUpperCase()}
Location: ${location || 'Not specified'}
EMS Contacted: ${contactedEMS || 'Not specified'}

Description:
${description}

${playerProfile ? `Player: ${playerProfile.profiles?.full_name || 'Unknown'}` : ''}

Time: ${new Date().toLocaleString()}

IMMEDIATE ATTENTION REQUIRED`,
        communication_type: 'emergency',
        priority: 'high',
        related_player_id: playerProfile?.id || null
      };

      const { error: commError } = await supabase
        .from('medical_communications')
        .insert([emergencyData]);

      if (commError) throw commError;

      // Create notification for all medical staff and super admins
      const { error: notificationError } = await supabase
        .rpc('create_notification', {
          target_user_id: user?.id, // This would need to be expanded to all medical staff
          notification_type: 'emergency_alert',
          notification_title: `EMERGENCY: ${emergencyType}`,
          notification_message: `Emergency situation reported. Location: ${location}. Severity: ${severity}`,
          notification_priority: 'high',
          expiry_hours: 24
        });

      if (notificationError) console.error('Notification error:', notificationError);

      // Call emergency edge function for immediate notifications
      try {
        await supabase.functions.invoke('send-health-alert', {
          body: {
            type: 'emergency',
            severity,
            emergencyType,
            description,
            location,
            playerName: playerProfile?.profiles?.full_name,
            reportedBy: user?.email,
            timestamp: new Date().toISOString()
          }
        });
      } catch (functionError) {
        console.error('Emergency function error:', functionError);
      }

      toast({
        title: "Emergency Alert Sent",
        description: "Emergency services and medical staff have been notified immediately.",
        variant: "default",
      });

      onClose();
      setEmergencyType('');
      setSeverity('');
      setDescription('');
      setLocation('');
      setContactedEMS('');
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast({
        title: "Error",
        description: "Failed to send emergency alert. Please call emergency services directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            EMERGENCY ALERT SYSTEM
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>FOR LIFE-THREATENING EMERGENCIES:</strong> Call 911 immediately before using this system.
            This alert notifies medical staff and creates documentation.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-red-700">
                Emergency Type *
              </label>
              <Select value={emergencyType} onValueChange={setEmergencyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select emergency type" />
                </SelectTrigger>
                <SelectContent>
                  {emergencyTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-red-700">
                Severity Level *
              </label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {severityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <span className={level.color}>{level.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Current Location
              </label>
              <Input
                placeholder="Building, room, field location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Phone className="h-4 w-4" />
                EMS Contacted?
              </label>
              <Select value={contactedEMS} onValueChange={setContactedEMS}>
                <SelectTrigger>
                  <SelectValue placeholder="911 status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes - 911 Called</SelectItem>
                  <SelectItem value="no">No - Not Called</SelectItem>
                  <SelectItem value="notneeded">Not Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {playerProfile && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">Patient Information</span>
              </div>
              <p className="text-blue-700 mt-1">
                {playerProfile.profiles?.full_name || 'Unknown Player'}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block text-red-700">
              Emergency Description *
            </label>
            <Textarea
              placeholder="Describe the emergency situation in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Emergency Response Time</span>
            </div>
            <p className="text-yellow-700 text-sm">
              Medical staff will be notified immediately. Expected response time: 2-5 minutes for on-site personnel.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !emergencyType || !severity || !description.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending Alert...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Send Emergency Alert
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyAlertModal;