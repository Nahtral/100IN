
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Save } from 'lucide-react';
import { InputSanitizer } from '@/utils/inputSanitizer';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';

// Schema that matches actual database columns in players table
const playerFormSchema = z.object({
  // Maps to profiles.full_name (via user_id relationship)
  full_name: z.string().min(1, 'Full name is required'),
  // Maps to profiles.email (via user_id relationship) 
  email: z.string().refine((val) => val === '' || z.string().email().safeParse(val).success, 'Invalid email address'),
  // Maps to profiles.phone (via user_id relationship)
  phone: z.string().optional(),
  // Maps to players.date_of_birth
  date_of_birth: z.string().optional(),
  // Maps to players.position
  position: z.string().optional(),
  // Maps to players.height
  height: z.string().optional(),
  // Maps to players.weight
  weight: z.string().optional(),
  // Maps to players.jersey_number - must be number, not string
  jersey_number: z.number().int().positive().optional().or(z.literal('')),
  // Maps to players.emergency_contact_name
  emergency_contact_name: z.string().optional(),
  // Maps to players.emergency_contact_phone
  emergency_contact_phone: z.string().optional(),
  // Maps to players.medical_notes
  medical_notes: z.string().optional(),
});

type PlayerFormData = z.infer<typeof playerFormSchema>;

interface PlayerFormProps {
  onSubmit: (data: PlayerFormData) => void;
  initialData?: Partial<PlayerFormData>;
  isLoading?: boolean;
  isRequiredFieldsOnly?: boolean;
}

const PlayerForm: React.FC<PlayerFormProps> = ({ onSubmit, initialData, isLoading = false, isRequiredFieldsOnly = true }) => {
  const { validateSensitiveInput, checkSQLInjection, logSecurityEvent } = useSecurityMonitoring();
  
  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      full_name: initialData?.full_name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      date_of_birth: initialData?.date_of_birth || '',
      position: initialData?.position || '',
      height: initialData?.height || '',
      weight: initialData?.weight || '',
      jersey_number: initialData?.jersey_number || '',
      emergency_contact_name: initialData?.emergency_contact_name || '',
      emergency_contact_phone: initialData?.emergency_contact_phone || '',
      medical_notes: initialData?.medical_notes || '',
    },
  });

  const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];

  // Enhanced form submission with security validation
  const handleSecureSubmit = (data: PlayerFormData) => {
    // Check for SQL injection attempts
    const checkFields = [data.full_name, data.email, data.medical_notes, data.emergency_contact_name];
    const hasSQLInjection = checkFields.some(field => field && checkSQLInjection(field));
    
    if (hasSQLInjection) {
      logSecurityEvent('form_security_violation', {
        form_type: 'player_form',
        violation_type: 'sql_injection_attempt'
      }, 'critical');
      return; // Block submission
    }

    // Sanitize sensitive data
    const sanitizedData = {
      ...data,
      full_name: validateSensitiveInput(data.full_name, 'personal'),
      email: InputSanitizer.sanitizeEmail(data.email || ''),
      phone: InputSanitizer.sanitizePhone(data.phone || ''),
      medical_notes: validateSensitiveInput(data.medical_notes || '', 'medical'),
      emergency_contact_name: validateSensitiveInput(data.emergency_contact_name || '', 'personal'),
      emergency_contact_phone: InputSanitizer.sanitizePhone(data.emergency_contact_phone || ''),
      // Convert jersey_number to integer if provided
      jersey_number: typeof data.jersey_number === 'number' ? data.jersey_number : undefined,
    };

    // Log form submission for audit
    logSecurityEvent('form_submission', {
      form_type: 'player_form',
      has_medical_data: !!data.medical_notes,
      has_contact_data: !!data.emergency_contact_name
    }, 'low');

    onSubmit(sanitizedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Player Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSecureSubmit)} className="mobile-space-y">
            <div className="mobile-form-group grid grid-cols-1 sm:grid-cols-2 mobile-gap">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
                <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
                <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions.map((position) => (
                          <SelectItem key={position} value={position}>
                            {position}
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
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 6'2&quot;" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 180 lbs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="jersey_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jersey Number {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter jersey number" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emergency_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter emergency contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emergency_contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone {!isRequiredFieldsOnly && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter emergency contact phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="medical_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any medical conditions, allergies, or notes..."
                      className="min-h-[100px]"
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
                {isLoading ? 'Saving...' : 'Save Player'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PlayerForm;
