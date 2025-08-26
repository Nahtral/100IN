import React, { useState, useEffect } from 'react';
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
import { Calendar, Save, Users, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const scheduleFormSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  eventType: z.string().min(1, 'Event type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().min(2, 'Location is required'),
  opponent: z.string().optional(),
  teamIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceEndDate: z.string().optional(),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurrenceDaysOfWeek: z.array(z.number()).optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface Team {
  id: string;
  name: string;
}

interface ScheduleFormProps {
  onSubmit: (data: ScheduleFormData) => void;
  initialData?: Partial<ScheduleFormData>;
  isLoading?: boolean;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ onSubmit, initialData, isLoading = false }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      eventType: initialData?.eventType || '',
      startDate: initialData?.startDate || '',
      startTime: initialData?.startTime || '',
      endDate: initialData?.endDate || '',
      endTime: initialData?.endTime || '',
      location: initialData?.location || '',
      opponent: initialData?.opponent || '',
      teamIds: initialData?.teamIds || [],
      isRecurring: initialData?.isRecurring || false,
      recurrenceEndDate: initialData?.recurrenceEndDate || '',
      recurrencePattern: initialData?.recurrencePattern || 'daily',
      recurrenceDaysOfWeek: initialData?.recurrenceDaysOfWeek || [],
    },
  });

  const isRecurring = form.watch('isRecurring');
  const eventTypes = ['game', 'practice', 'meeting', 'scrimmage', 'tournament'];
  const daysOfWeek = [
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
    { label: 'Sunday', value: 0 },
  ];

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      console.log('Fetching teams...');
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Supabase error fetching teams:', error);
        throw error;
      }
      
      console.log('Teams fetched successfully:', data);
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]); // Set empty array on error
    } finally {
      setLoadingTeams(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Event
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event title" {...field} />
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
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
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
                    <FormLabel>Start Time</FormLabel>
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
                    <FormLabel>End Date</FormLabel>
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
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="opponent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opponent (for games)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter opponent name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Team Selection */}
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
                            <label
                              htmlFor={`team-${team.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
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

            {/* Recurring Event Toggle */}
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2 text-base">
                      <Repeat className="h-4 w-4" />
                      Recurring Event
                    </FormLabel>
                    <p className="text-sm text-gray-600">
                      Make this event repeat on a schedule
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Recurring Options */}
            {isRecurring && (
              <div className="space-y-4 border rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-900">Recurring Settings</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurrencePattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Pattern</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrenceEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date for Recurring</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('recurrencePattern') === 'weekly' && (
                  <FormField
                    control={form.control}
                    name="recurrenceDaysOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days of Week</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {daysOfWeek.map((day) => (
                              <div key={day.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`day-${day.value}`}
                                  checked={field.value?.includes(day.value) || false}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, day.value]);
                                    } else {
                                      field.onChange(currentValue.filter((d) => d !== day.value));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`day-${day.value}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {day.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
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

export default ScheduleForm;