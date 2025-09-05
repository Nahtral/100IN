import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { LocationSelector } from './LocationSelector';
import { SimpleImageUpload } from './SimpleImageUpload';
import { cn } from '@/lib/utils';

interface Team {
  id: string;
  name: string;
  season?: string;
}

interface ScheduleEvent {
  id?: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location?: string;
  location_id?: string;
  opponent?: string;
  description?: string;
  team_ids?: string[];
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_interval?: number;
  recurrence_days_of_week?: number[];
  recurrence_end_date?: string;
  image_url?: string;
}

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: ScheduleEvent) => void;
  event?: ScheduleEvent | null;
  isEditing?: boolean;
}

const eventTypeOptions = [
  { value: 'FNL', label: 'FNL' },
  { value: 'DBL', label: 'DBL' },
  { value: 'Team Building', label: 'Team Building' },
  { value: 'game', label: 'Game' },
  { value: 'practice', label: 'Practice' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'scrimmage', label: 'Scrimmage' },
  { value: 'tournament', label: 'Tournament' },
];

export const EventForm: React.FC<EventFormProps> = ({
  isOpen,
  onClose,
  onSave,
  event,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<ScheduleEvent>({
    title: '',
    event_type: '',
    start_time: '',
    end_time: '',
    location_id: '',
    opponent: '',
    description: '',
    team_ids: [],
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
    recurrence_days_of_week: [],
    recurrence_end_date: '',
    image_url: ''
  });

  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, season')
        .order('name');
      
      if (error) throw error;
      return data as Team[];
    }
  });

  useEffect(() => {
    if (event && isOpen) {
      setFormData({
        ...event,
        team_ids: event.team_ids || [],
        // For backward compatibility with existing events that have location instead of location_id
        location_id: event.location_id || ''
      });
      
      // Parse date and times from start_time
      if (event.start_time) {
        const startDate = new Date(event.start_time);
        setDate(startDate);
        setStartTime(format(startDate, 'HH:mm'));
      }
      
      if (event.end_time) {
        const endDate = new Date(event.end_time);
        setEndTime(format(endDate, 'HH:mm'));
      }
      
      if (event.recurrence_end_date) {
        setRecurrenceEndDate(new Date(event.recurrence_end_date));
      }
    } else if (isOpen) {
      // Reset form for new event
      setFormData({
        title: '',
        event_type: '',
        start_time: '',
        end_time: '',
        location_id: '',
        opponent: '',
        description: '',
        team_ids: [],
        is_recurring: false,
        recurrence_pattern: 'weekly',
        recurrence_interval: 1,
        recurrence_days_of_week: [],
        recurrence_end_date: '',
        image_url: ''
      });
      setDate(undefined);
      setStartTime('');
      setEndTime('');
      setRecurrenceEndDate(undefined);
      setErrors({});
    }
  }, [event, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.event_type) {
      newErrors.event_type = 'Event type is required';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (!startTime) {
      newErrors.start_time = 'Start time is required';
    }

    if (!endTime) {
      newErrors.end_time = 'End time is required';
    }

    if (!formData.location_id) {
      newErrors.location_id = 'Location is required';
    }

    // Validate that end time is after start time
    if (startTime && endTime && startTime >= endTime) {
      newErrors.end_time = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Combine date and times
      const startDateTime = new Date(date!);
      const [startHour, startMinute] = startTime.split(':');
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

      const endDateTime = new Date(date!);
      const [endHour, endMinute] = endTime.split(':');
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

      const eventData: ScheduleEvent = {
        ...formData,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        recurrence_end_date: recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : undefined,
      };

      // Remove location field as we're using location_id
      delete eventData.location;

      onSave(eventData);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save event',
        variant: 'destructive'
      });
    }
  };

  const handleTeamToggle = (teamId: string) => {
    const currentTeams = formData.team_ids || [];
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter(id => id !== teamId)
      : [...currentTeams, teamId];
    
    setFormData({ ...formData, team_ids: newTeams });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter event title"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="event_type">Event Type *</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger className={errors.event_type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.event_type && <p className="text-sm text-red-600">{errors.event_type}</p>}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                    errors.date && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
          </div>

          {/* Start and End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start_time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={cn("pl-10", errors.start_time && "border-red-500")}
                />
              </div>
              {errors.start_time && <p className="text-sm text-red-600">{errors.start_time}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end_time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={cn("pl-10", errors.end_time && "border-red-500")}
                />
              </div>
              {errors.end_time && <p className="text-sm text-red-600">{errors.end_time}</p>}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location *</Label>
            <LocationSelector
              value={formData.location_id}
              onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              error={errors.location_id}
            />
          </div>

          {/* Opponent */}
          <div className="space-y-2">
            <Label htmlFor="opponent">Opponent</Label>
            <Input
              id="opponent"
              value={formData.opponent || ''}
              onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
              placeholder="Enter opponent name (optional)"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter event description (optional)"
              rows={3}
            />
          </div>

          {/* Event Image */}
          <div className="space-y-2">
            <Label>Event Image</Label>
            <SimpleImageUpload
              currentImageUrl={formData.image_url}
              onUpload={(url) => setFormData({ ...formData, image_url: url })}
              onRemove={() => setFormData({ ...formData, image_url: '' })}
            />
          </div>

          {/* Teams Selection */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Assign Teams</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`team-${team.id}`}
                      checked={formData.team_ids?.includes(team.id) || false}
                      onChange={() => handleTeamToggle(team.id)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`team-${team.id}`} className="flex-1 cursor-pointer">
                      {team.name}
                      {team.season && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({team.season})
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Event Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_recurring"
                checked={formData.is_recurring || false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
              <Label htmlFor="is_recurring">Recurring Event</Label>
            </div>

            {formData.is_recurring && (
              <div className="space-y-3 pl-6 border-l-2 border-muted">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
                    <Select
                      value={formData.recurrence_pattern || 'weekly'}
                      onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor="recurrence_interval">Repeat Every</Label>
                      <Input
                        id="recurrence_interval"
                        type="number"
                        min="1"
                        value={formData.recurrence_interval || 1}
                        onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !recurrenceEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : <span>Select end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={recurrenceEndDate}
                          onSelect={setRecurrenceEndDate}
                          initialFocus
                          className="pointer-events-auto"
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-sm text-muted-foreground">
                      Leave blank for indefinite recurrence
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};