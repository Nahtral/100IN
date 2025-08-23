import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Save, Users, Repeat, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { InputSanitizer } from '@/utils/inputSanitizer';
import { ErrorLogger } from '@/utils/errorLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

// Enhanced validation schema with security checks
const scheduleFormSchema = z.object({
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title must be less than 100 characters')
    .refine(val => !val.includes('<script'), 'Invalid characters detected'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  eventType: z.enum(['game', 'practice', 'meeting', 'scrimmage', 'tournament'], {
    message: 'Please select a valid event type'
  }),
  startDate: z.string()
    .min(1, 'Start date is required')
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
  startTime: z.string()
    .min(1, 'Start time is required')
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endDate: z.string()
    .min(1, 'End date is required')
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
  endTime: z.string()
    .min(1, 'End time is required')
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  location: z.string()
    .min(2, 'Location is required')
    .max(200, 'Location must be less than 200 characters'),
  opponent: z.string()
    .max(100, 'Opponent name must be less than 100 characters')
    .optional(),
  teamIds: z.array(z.string().uuid('Invalid team ID')).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceEndDate: z.string().optional(),
  recurrencePattern: z.enum(['weekly', 'monthly']).optional(),
  recurrenceDaysOfWeek: z.array(z.number().min(0).max(6)).optional(),
}).refine(data => {
  const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
  const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
  return endDateTime > startDateTime;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface Team {
  id: string;
  name: string;
}

interface EnhancedScheduleFormProps {
  onSubmit: (data: ScheduleFormData) => Promise<void>;
  initialData?: Partial<ScheduleFormData>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const EnhancedScheduleForm: React.FC<EnhancedScheduleFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false,
  onCancel
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuth();
  const { userRole } = useUserRole();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      eventType: initialData?.eventType || 'practice',
      startDate: initialData?.startDate || '',
      startTime: initialData?.startTime || '',
      endDate: initialData?.endDate || '',
      endTime: initialData?.endTime || '',
      location: initialData?.location || '',
      opponent: initialData?.opponent || '',
      teamIds: initialData?.teamIds || [],
      isRecurring: initialData?.isRecurring || false,
      recurrenceEndDate: initialData?.recurrenceEndDate || '',
      recurrencePattern: initialData?.recurrencePattern || 'weekly',
      recurrenceDaysOfWeek: initialData?.recurrenceDaysOfWeek || [],
    },
  });

  const isRecurring = form.watch('isRecurring');
  const eventType = form.watch('eventType');

  const daysOfWeek = [
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
    { label: 'Sunday', value: 0 },
  ];

  const fetchTeams = useCallback(async () => {
    try {
      setLoadingTeams(true);
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      await ErrorLogger.logError(error, {
        component: 'EnhancedScheduleForm',
        action: 'fetchTeams',
        userId: user?.id,
        userRole
      });
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  }, [user?.id, userRole]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleSubmit = async (data: ScheduleFormData) => {
    try {
      setSubmitError(null);
      const sanitizedData: ScheduleFormData = {
        ...data,
        title: InputSanitizer.sanitizeText(data.title),
        description: data.description ? InputSanitizer.sanitizeText(data.description) : undefined,
        location: InputSanitizer.sanitizeText(data.location),
        opponent: data.opponent ? InputSanitizer.sanitizeText(data.opponent) : undefined,
        startDate: InputSanitizer.sanitizeDate(data.startDate),
        startTime: InputSanitizer.sanitizeTime(data.startTime),
        endDate: InputSanitizer.sanitizeDate(data.endDate),
        endTime: InputSanitizer.sanitizeTime(data.endTime),
        recurrenceEndDate: data.recurrenceEndDate ? InputSanitizer.sanitizeDate(data.recurrenceEndDate) : undefined,
        teamIds: data.teamIds?.filter(id => InputSanitizer.isValidUUID(id)) || []
      };

      await onSubmit(sanitizedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save event';
      setSubmitError(errorMessage);
      
      await ErrorLogger.logError(error, {
        component: 'EnhancedScheduleForm',
        action: 'submit',
        userId: user?.id,
        userRole,
        metadata: { formData: data }
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {initialData ? 'Edit Event' : 'Create New Event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submitError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event title" {...field} maxLength={100} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="game">Game</SelectItem>
                        <SelectItem value="practice">Practice</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="scrimmage">Scrimmage</SelectItem>
                        <SelectItem value="tournament">Tournament</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
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
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter location" {...field} maxLength={200} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {eventType === 'game' && (
                <FormField
                  control={form.control}
                  name="opponent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opponent</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter opponent name" {...field} maxLength={100} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="teamIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Select Teams
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-gray-50">
                      {loadingTeams ? (
                        <p className="text-sm text-gray-500 col-span-full">Loading teams...</p>
                      ) : teams.length === 0 ? (
                        <p className="text-sm text-gray-500 col-span-full">No teams available</p>
                      ) : (
                        teams.map((team) => (
                          <div key={team.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`team-${team.id}`}
                              checked={field.value?.includes(team.id) || false}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValue, team.id]);
                                } else {
                                  field.onChange(currentValue.filter((id) => id !== team.id));
                                }
                              }}
                            />
                            <label htmlFor={`team-${team.id}`} className="text-sm font-medium cursor-pointer">
                              {team.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter event description..."
                      className="min-h-[80px]"
                      maxLength={1000}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Event'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EnhancedScheduleForm;