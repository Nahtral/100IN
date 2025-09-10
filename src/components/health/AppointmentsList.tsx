import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar,
  Clock,
  MapPin,
  User,
  Stethoscope,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Edit,
  FileText
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AppointmentsListProps {
  appointments: any[];
  userRole: string;
  isSuperAdmin: boolean;
  onScheduleNew: () => void;
  onRefresh: () => void;
}

const AppointmentsList: React.FC<AppointmentsListProps> = ({ 
  appointments, 
  userRole, 
  isSuperAdmin,
  onScheduleNew,
  onRefresh 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [appointmentStatus, setAppointmentStatus] = useState('');
  const [appointmentOutcome, setAppointmentOutcome] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusBadge = (status: string, appointmentDate: string) => {
    const date = new Date(appointmentDate);
    const statusConfig = {
      scheduled: { 
        variant: isPast(date) ? 'destructive' as const : 'default' as const, 
        label: isPast(date) ? 'Missed' : 'Scheduled',
        color: isPast(date) ? 'text-red-600' : 'text-blue-600'
      },
      confirmed: { variant: 'secondary' as const, label: 'Confirmed', color: 'text-green-600' },
      completed: { variant: 'secondary' as const, label: 'Completed', color: 'text-green-600' },
      cancelled: { variant: 'outline' as const, label: 'Cancelled', color: 'text-gray-600' },
      rescheduled: { variant: 'outline' as const, label: 'Rescheduled', color: 'text-orange-600' },
      no_show: { variant: 'destructive' as const, label: 'No Show', color: 'text-red-600' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (type: string) => {
    const highPriorityTypes = ['Emergency Follow-up', 'Injury Assessment'];
    if (highPriorityTypes.includes(type)) {
      return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
    }
    return null;
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return 'Past';
    return format(date, 'MMM dd');
  };

  const updateAppointment = async () => {
    if (!selectedAppointment) return;

    setIsUpdating(true);
    try {
      const updateData: any = {
        notes: appointmentNotes,
        updated_at: new Date().toISOString()
      };

      if (appointmentStatus) {
        updateData.status = appointmentStatus;
      }

      if (appointmentOutcome) {
        updateData.outcome = appointmentOutcome;
      }

      const { error } = await supabase
        .from('medical_appointments')
        .update(updateData)
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment Updated",
        description: "Appointment details have been updated successfully.",
      });

      onRefresh();
      setSelectedAppointment(null);
      setAppointmentNotes('');
      setAppointmentStatus('');
      setAppointmentOutcome('');
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canManageAppointments = isSuperAdmin || ['medical', 'staff'].includes(userRole);

  // Separate appointments by status
  const upcomingAppointments = appointments.filter(apt => 
    ['scheduled', 'confirmed'].includes(apt.status) && !isPast(new Date(apt.appointment_date))
  );
  const pastAppointments = appointments.filter(apt => 
    apt.status === 'completed' || isPast(new Date(apt.appointment_date))
  );

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments scheduled.</h3>
        <p className="text-gray-600 mb-4">
          Medical appointments will be displayed here when scheduled.
        </p>
        <Button 
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          onClick={onScheduleNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Appointment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Upcoming Appointments ({upcomingAppointments.length})
          </h3>
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => {
              const appointmentDate = new Date(appointment.appointment_date);
              return (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">{appointment.appointment_type}</h4>
                          {getPriorityBadge(appointment.appointment_type)}
                        </div>
                        <p className="text-sm text-gray-600">{appointment.provider_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-blue-600">
                          {getDateLabel(appointmentDate)}
                        </Badge>
                        {getStatusBadge(appointment.status, appointment.appointment_date)}
                      </div>
                    </div>

                    {/* Patient Info (for medical staff) */}
                    {userRole !== 'player' && appointment.players?.profiles && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <User className="h-4 w-4" />
                        <span>Patient: {appointment.players.profiles.full_name}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{format(appointmentDate, 'PPP')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{format(appointmentDate, 'p')} ({appointment.duration_minutes} min)</span>
                      </div>
                      {appointment.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{appointment.location}</span>
                        </div>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-700">{appointment.notes}</p>
                      </div>
                    )}

                    {canManageAppointments && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setAppointmentNotes(appointment.notes || '');
                            setAppointmentStatus(appointment.status);
                            setAppointmentOutcome(appointment.outcome || '');
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Update
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Appointment History ({pastAppointments.length})
          </h3>
          <div className="space-y-3">
            {pastAppointments.slice(0, 5).map((appointment) => {
              const appointmentDate = new Date(appointment.appointment_date);
              return (
                <Card key={appointment.id} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800">{appointment.appointment_type}</h4>
                        <p className="text-sm text-gray-600">{appointment.provider_name}</p>
                        <p className="text-xs text-gray-500">{format(appointmentDate, 'PPP')}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(appointment.status, appointment.appointment_date)}
                        {appointment.outcome && (
                          <p className="text-xs text-gray-600 mt-1">{appointment.outcome}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {pastAppointments.length > 5 && (
              <p className="text-center text-sm text-gray-500">
                +{pastAppointments.length - 5} more appointments in history
              </p>
            )}
          </div>
        </div>
      )}

      {/* Schedule New Button */}
      <div className="text-center">
        <Button 
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          onClick={onScheduleNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Appointment
        </Button>
      </div>

      {/* Update Appointment Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAppointment && (
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium">{selectedAppointment.appointment_type}</h4>
                <p className="text-sm text-gray-600">{selectedAppointment.provider_name}</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedAppointment.appointment_date), 'PPP p')}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={appointmentStatus} onValueChange={setAppointmentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Update status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Outcome</label>
              <Textarea
                placeholder="Appointment outcome or results..."
                value={appointmentOutcome}
                onChange={(e) => setAppointmentOutcome(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="Additional notes..."
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedAppointment(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={updateAppointment}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Clock className="h-4 w-4 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Update Appointment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsList;