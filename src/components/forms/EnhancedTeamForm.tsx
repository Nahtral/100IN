import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Save, AlertTriangle, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { InputSanitizer } from '@/utils/inputSanitizer';
import { ErrorLogger } from '@/utils/errorLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

// Enhanced validation schema with security checks
const teamFormSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters')
    .refine(val => !val.includes('<script'), 'Invalid characters detected'),
  ageGroup: z.string()
    .min(1, 'Age group is required')
    .max(50, 'Age group must be less than 50 characters'),
  season: z.string()
    .min(1, 'Season is required')
    .max(50, 'Season must be less than 50 characters')
    .regex(/^\d{4}-\d{4}$|^\d{4}$|^[A-Za-z\s\d-]+$/, 'Please use valid season format (e.g., 2024-2025)'),
  coachId: z.string().optional(),
  staffIds: z.array(z.string()).optional(),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface Coach {
  id: string;
  full_name: string;
}

interface Staff {
  id: string;
  full_name: string;
}

interface EnhancedTeamFormProps {
  onSubmit: (data: TeamFormData) => Promise<void>;
  initialData?: Partial<TeamFormData>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const EnhancedTeamForm: React.FC<EnhancedTeamFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false,
  onCancel
}) => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuth();
  const { primaryRole } = useOptimizedAuth();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      ageGroup: initialData?.ageGroup || '',
      season: initialData?.season || '',
      coachId: initialData?.coachId || '',
      staffIds: initialData?.staffIds || [],
    },
  });

  const ageGroups = [
    'U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U21', 'Adult', 'Senior'
  ];

  const currentYear = new Date().getFullYear();
  const seasons = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear + 1}-${currentYear + 2}`,
    'Spring 2024',
    'Summer 2024',
    'Fall 2024',
    'Winter 2024',
  ];

  const fetchCoaches = useCallback(async () => {
    try {
      setLoadingCoaches(true);
      
      // Get users with coach role
      const { data: coachRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coach')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      if (!coachRoles || coachRoles.length === 0) {
        setCoaches([]);
        return;
      }

      const coachIds = coachRoles.map(role => role.user_id);

      // Get profiles for coaches
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', coachIds)
        .order('full_name');

      if (profilesError) throw profilesError;

      setCoaches(profiles || []);
    } catch (error) {
      await ErrorLogger.logError(error, {
        component: 'EnhancedTeamForm',
        action: 'fetchCoaches',
        userId: user?.id,
        userRole
      });
      setCoaches([]);
    } finally {
      setLoadingCoaches(false);
    }
  }, [user?.id, userRole]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      
      // Get users with staff role
      const { data: staffRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      if (!staffRoles || staffRoles.length === 0) {
        setStaff([]);
        return;
      }

      const staffIds = staffRoles.map(role => role.user_id);

      // Get profiles for staff
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds)
        .order('full_name');

      if (profilesError) throw profilesError;

      setStaff(profiles || []);
    } catch (error) {
      await ErrorLogger.logError(error, {
        component: 'EnhancedTeamForm',
        action: 'fetchStaff',
        userId: user?.id,
        userRole
      });
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [user?.id, userRole]);

  useEffect(() => {
    fetchCoaches();
    fetchStaff();
  }, [fetchCoaches, fetchStaff]);

  const handleStaffToggle = (staffId: string, checked: boolean) => {
    const currentStaffIds = form.getValues('staffIds') || [];
    if (checked) {
      form.setValue('staffIds', [...currentStaffIds, staffId]);
    } else {
      form.setValue('staffIds', currentStaffIds.filter(id => id !== staffId));
    }
  };

  const handleSubmit = async (data: TeamFormData) => {
    try {
      setSubmitError(null);
      const sanitizedData: TeamFormData = {
        name: InputSanitizer.sanitizeText(data.name),
        ageGroup: InputSanitizer.sanitizeText(data.ageGroup),
        season: InputSanitizer.sanitizeText(data.season),
        coachId: data.coachId && data.coachId !== 'none' && InputSanitizer.isValidUUID(data.coachId) ? data.coachId : undefined,
        staffIds: data.staffIds ? data.staffIds.filter(id => InputSanitizer.isValidUUID(id)) : undefined,
      };

      await onSubmit(sanitizedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save team';
      setSubmitError(errorMessage);
      
      await ErrorLogger.logError(error, {
        component: 'EnhancedTeamForm',
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
          <Users className="h-5 w-5" />
          {initialData ? 'Edit Team' : 'Create New Team'}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter team name" {...field} maxLength={100} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ageGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Group *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ageGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
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
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season} value={season}>
                            {season}
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
                name="coachId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coach</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select coach (optional)" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                         <SelectItem value="none">No coach assigned</SelectItem>
                         {loadingCoaches ? (
                           <SelectItem value="loading" disabled>Loading coaches...</SelectItem>
                         ) : coaches.length === 0 ? (
                           <SelectItem value="no-coaches" disabled>No coaches available</SelectItem>
                         ) : (
                           coaches.map((coach) => (
                             <SelectItem key={coach.id} value={coach.id}>
                               {coach.full_name}
                             </SelectItem>
                           ))
                         )}
                       </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Staff Selection */}
            <FormField
              control={form.control}
              name="staffIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Assign Staff Members
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-3 max-h-48 overflow-y-auto border rounded-md p-3">
                      {loadingStaff ? (
                        <div className="text-sm text-muted-foreground">Loading staff...</div>
                      ) : staff.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No staff members available</div>
                      ) : (
                        staff.map((staffMember) => (
                          <div key={staffMember.id} className="flex items-center space-x-2">
                             <Checkbox
                               id={`staff-${staffMember.id}`}
                               checked={(field.value || []).includes(staffMember.id)}
                               onCheckedChange={(checked) => 
                                 handleStaffToggle(staffMember.id, checked as boolean)
                               }
                             />
                            <label
                              htmlFor={`staff-${staffMember.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {staffMember.full_name}
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
            
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Team'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EnhancedTeamForm;