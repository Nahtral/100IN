
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
import { Heart, Save } from 'lucide-react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';

const healthWellnessFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  weight: z.number().min(0, 'Weight must be 0 or greater').optional(),
  body_fat_percentage: z.number().min(0).max(100, 'Body fat percentage must be between 0 and 100').optional(),
  fitness_score: z.number().min(1).max(10, 'Fitness score must be between 1 and 10').optional(),
  injury_status: z.string().optional(),
  injury_description: z.string().optional(),
  medical_notes: z.string().optional(),
});

type HealthWellnessFormData = z.infer<typeof healthWellnessFormSchema>;

interface HealthWellnessFormProps {
  onSubmit: (data: HealthWellnessFormData) => void;
  initialData?: Partial<HealthWellnessFormData>;
  isLoading?: boolean;
}

const HealthWellnessForm: React.FC<HealthWellnessFormProps> = ({ onSubmit, initialData, isLoading = false }) => {
  const { validateSensitiveInput, checkSQLInjection, logSecurityEvent } = useSecurityMonitoring();
  
  const form = useForm<HealthWellnessFormData>({
    resolver: zodResolver(healthWellnessFormSchema),
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      weight: initialData?.weight || undefined,
      body_fat_percentage: initialData?.body_fat_percentage || undefined,
      fitness_score: initialData?.fitness_score || undefined,
      injury_status: initialData?.injury_status || '',
      injury_description: initialData?.injury_description || '',
      medical_notes: initialData?.medical_notes || '',
    },
  });

  const handleSecureSubmit = (data: HealthWellnessFormData) => {
    // Validate and sanitize medical data
    const sanitizedData = {
      ...data,
      injury_description: data.injury_description ? validateSensitiveInput(data.injury_description, 'medical') : '',
      medical_notes: data.medical_notes ? validateSensitiveInput(data.medical_notes, 'medical') : '',
    };

    // Check for SQL injection attempts
    const inputs = [data.injury_description, data.medical_notes].filter(Boolean);
    for (const input of inputs) {
      if (checkSQLInjection(input)) {
        logSecurityEvent('sql_injection_attempt', { 
          form: 'health_wellness',
          blocked_input: input.substring(0, 100) 
        }, 'critical');
        return; // Block submission
      }
    }

    // Log medical data submission for audit
    logSecurityEvent('medical_data_submission', {
      form: 'health_wellness',
      has_injury_data: !!data.injury_description,
      has_medical_notes: !!data.medical_notes
    }, 'low');

    onSubmit(sanitizedData);
  };

  const injuryStatuses = ['Healthy', 'Minor Injury', 'Recovering', 'Injured', 'Out'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Health & Wellness Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSecureSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter weight" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="body_fat_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Fat Percentage (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter body fat percentage" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fitness_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fitness Score (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10" 
                        placeholder="Rate fitness level" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
            <FormField
              control={form.control}
              name="injury_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Injury Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select injury status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {injuryStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="injury_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Injury Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe any injuries or concerns..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="medical_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional medical notes, treatments, or observations..."
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
                {isLoading ? 'Saving...' : 'Save Health Data'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default HealthWellnessForm;
