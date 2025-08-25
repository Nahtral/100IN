import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Stethoscope,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import * as z from 'zod';

interface AppointmentSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile?: any;
  isSuperAdmin: boolean;
}

const appointmentSchema = z.object({
  appointmentType: z.string().min(1, 'Appointment type is required'),
  providerName: z.string().min(1, 'Provider name is required'),
  appointmentDate: z.date(),
  appointmentTime: z.string().min(1, 'Appointment time is required'),
  duration: z.string().min(1, 'Duration is required'),
  location: z.string().optional(),
  notes: z.string().optional(),
  priority: z.string().min(1, 'Priority is required'),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const AppointmentSchedulingModal: React.FC<AppointmentSchedulingModalProps> = ({ 
  isOpen, 
  onClose, 
  playerProfile,
  isSuperAdmin
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState(playerProfile?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      appointmentType: '',
      providerName: '',
      appointmentTime: '',
      duration: '60',
      location: '',
      notes: '',
      priority: 'normal',
    }
  });

  useEffect(() => {
    if (isOpen && isSuperAdmin) {
      fetchPlayers();
    }
  }, [isOpen, isSuperAdmin]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          profiles (
            full_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('profiles(full_name)');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleSubmit = async (data: AppointmentFormData) => {
    const playerId = selectedPlayer || playerProfile?.id;
    if (!playerId) {
      toast({
        title: "Error",
        description: "Please select a player for the appointment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const appointmentDateTime = new Date(data.appointmentDate);
      const [hours, minutes] = data.appointmentTime.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

      const appointmentData = {
        player_id: playerId,
        appointment_type: data.appointmentType,
        provider_name: data.providerName,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: parseInt(data.duration),
        location: data.location || null,
        notes: data.notes || null,
        status: 'scheduled',
        created_by: user?.id
      };

      const { error } = await supabase
        .from('medical_appointments')
        .insert([appointmentData]);

      if (error) throw error;

      // Create notification for the player
      const selectedPlayerData = players.find(p => p.id === playerId) || playerProfile;
      const playerName = selectedPlayerData?.profiles?.full_name || 'Player';

      await supabase.rpc('create_notification', {
        target_user_id: selectedPlayerData?.user_id || user?.id,
        notification_type: 'appointment_scheduled',
        notification_title: 'Medical Appointment Scheduled',
        notification_message: `${data.appointmentType} scheduled with ${data.providerName} on ${format(appointmentDateTime, 'PPP')} at ${format(appointmentDateTime, 'p')}`,
        notification_priority: data.priority === 'high' ? 'high' : 'normal',
        entity_type: 'medical_appointment',
        expiry_hours: 24 * 7 // 1 week
      });

      toast({
        title: "Appointment Scheduled",
        description: `Medical appointment has been scheduled successfully for ${playerName}.`,
      });

      onClose();
      form.reset();
      setSelectedPlayer(playerProfile?.id || '');
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const appointmentTypes = [
    'Physical Therapy',
    'Medical Examination',
    'Injury Assessment',
    'Follow-up Visit',
    'Fitness Evaluation',
    'Mental Health Check',
    'Nutrition Consultation',
    'Specialist Referral',
    'Preventive Care',
    'Emergency Follow-up'
  ];

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00'
  ];

  const durations = [
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Schedule Medical Appointment
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Player Selection (for super admin) */}
            {isSuperAdmin && (
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Select Player
                </label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose player for appointment" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.profiles?.full_name || 'Unknown Player'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Stethoscope className="h-4 w-4" />
                      Appointment Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select appointment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="providerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Healthcare Provider *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Smith, Physical Therapist..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Appointment Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Time *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durations.map((duration) => (
                          <SelectItem key={duration.value} value={duration.value}>
                            {duration.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Medical center, clinic, or office..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Special instructions, preparation needed, etc..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentSchedulingModal;