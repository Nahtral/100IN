import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Send,
  Clock,
  Shield,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MedicalClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile?: any;
}

const MedicalClearanceModal: React.FC<MedicalClearanceModalProps> = ({ 
  isOpen, 
  onClose, 
  playerProfile 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clearanceType, setClearanceType] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearanceTypes = [
    { value: 'return_to_play', label: 'Return to Play Clearance', icon: Activity },
    { value: 'fitness_assessment', label: 'Fitness Assessment Clearance', icon: CheckCircle },
    { value: 'competition_clearance', label: 'Competition Clearance', icon: Shield },
    { value: 'training_modification', label: 'Training Modification Assessment', icon: AlertTriangle },
    { value: 'annual_physical', label: 'Annual Physical Clearance', icon: FileText },
    { value: 'injury_clearance', label: 'Post-Injury Clearance', icon: Activity }
  ];

  const activityLevels = [
    'Full Contact/Competition',
    'Limited Contact Training',
    'Non-Contact Training Only',
    'Light Training/Conditioning',
    'Rehabilitation Activities Only',
    'Complete Rest'
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low - Routine Assessment', color: 'text-green-600' },
    { value: 'normal', label: 'Normal - Standard Timeline', color: 'text-blue-600' },
    { value: 'high', label: 'High - Needed Soon', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent - ASAP', color: 'text-red-600' }
  ];

  const handleSubmit = async () => {
    if (!clearanceType || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select clearance type and provide a reason.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedType = clearanceTypes.find(ct => ct.value === clearanceType);
      
      // Create medical communication request
      const communicationData = {
        sender_id: user?.id,
        recipient_type: 'medical',
        subject: `Medical Clearance Request: ${selectedType?.label}`,
        message: `MEDICAL CLEARANCE REQUEST

Patient: ${playerProfile?.profiles?.full_name || 'Unknown Player'}
Clearance Type: ${selectedType?.label}
Activity Level Requested: ${activityLevel || 'Not specified'}
Urgency: ${urgency.toUpperCase()}

Reason for Request:
${reason}

Current Status: Awaiting medical evaluation
Request Date: ${new Date().toLocaleString()}

Please assess and provide medical clearance recommendation.`,
        communication_type: 'clearance_request',
        priority: urgency === 'urgent' ? 'high' : urgency === 'high' ? 'medium' : 'normal',
        related_player_id: playerProfile?.id || null
      };

      const { error: commError } = await supabase
        .from('medical_communications')
        .insert([communicationData]);

      if (commError) throw commError;

      // Create medical appointment for assessment
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + (urgency === 'urgent' ? 1 : urgency === 'high' ? 3 : 7));

      const appointmentData = {
        player_id: playerProfile?.id,
        appointment_type: 'medical_clearance_assessment',
        provider_name: 'Medical Team',
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: 60,
        location: 'Medical Center',
        notes: `Clearance assessment for: ${selectedType?.label}. Urgency: ${urgency}`,
        status: 'scheduled',
        created_by: user?.id
      };

      const { error: appointmentError } = await supabase
        .from('medical_appointments')
        .insert([appointmentData]);

      if (appointmentError) console.error('Appointment creation error:', appointmentError);

      // Create notification
      await supabase.rpc('create_notification', {
        target_user_id: user?.id,
        notification_type: 'clearance_request_submitted',
        notification_title: 'Medical Clearance Request Submitted',
        notification_message: `Your ${selectedType?.label.toLowerCase()} request has been submitted to the medical team.`,
        notification_priority: 'normal',
        entity_type: 'medical_clearance',
        expiry_hours: 24 * 14 // 2 weeks
      });

      toast({
        title: "Clearance Request Submitted",
        description: "Your medical clearance request has been sent to the medical team for evaluation.",
      });

      onClose();
      setClearanceType('');
      setActivityLevel('');
      setReason('');
      setUrgency('normal');
    } catch (error) {
      console.error('Error submitting clearance request:', error);
      toast({
        title: "Error",
        description: "Failed to submit clearance request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = clearanceTypes.find(ct => ct.value === clearanceType);
  const selectedUrgency = urgencyLevels.find(ul => ul.value === urgency);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Request Medical Clearance Assessment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Info */}
          {playerProfile && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Patient Information</span>
                </div>
                <p className="text-blue-700 mt-1">
                  {playerProfile.profiles?.full_name || 'Unknown Player'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Clearance Type Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Type of Medical Clearance Needed *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clearanceTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all ${
                      clearanceType === type.value 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setClearanceType(type.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`h-4 w-4 ${
                          clearanceType === type.value ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          clearanceType === type.value ? 'text-blue-800' : 'text-gray-700'
                        }`}>
                          {type.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Activity Level */}
          {clearanceType && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Desired Activity Level
              </label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select desired activity level" />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Urgency Level */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Request Urgency *
            </label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {urgencyLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <span className={level.color}>{level.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Reason for Clearance Request *
            </label>
            <Textarea
              placeholder="Please explain why you need this medical clearance (e.g., returning from injury, routine assessment, upcoming competition, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Request Summary */}
          {clearanceType && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Request Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clearance Type:</span>
                    <span className="font-medium">{selectedType?.label}</span>
                  </div>
                  {activityLevel && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Activity Level:</span>
                      <span className="font-medium">{activityLevel}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Urgency:</span>
                    <Badge variant="outline" className={selectedUrgency?.color}>
                      {selectedUrgency?.label.split(' - ')[0]}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Response:</span>
                    <span className="font-medium">
                      {urgency === 'urgent' ? '1-2 days' : 
                       urgency === 'high' ? '3-5 days' : 
                       urgency === 'normal' ? '1 week' : '2 weeks'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
              disabled={isSubmitting || !clearanceType || !reason.trim()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Clearance Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MedicalClearanceModal;