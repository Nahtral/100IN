
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.string().min(1, 'Role is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserRegistrationData = z.infer<typeof userRegistrationSchema>;

interface UserRegistrationFormProps {
  onSubmit: (data: UserRegistrationData) => void;
  initialData?: Partial<UserRegistrationData>;
  isLoading?: boolean;
}

const UserRegistrationForm: React.FC<UserRegistrationFormProps> = ({ onSubmit, initialData, isLoading = false }) => {
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const form = useForm<UserRegistrationData>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      email: initialData?.email || '',
      full_name: initialData?.full_name || '',
      phone: initialData?.phone || '',
      role: initialData?.role || '',
      password: '',
      confirmPassword: '',
    },
  });

  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setEmailChecking(true);
    setEmailError(null);
    
    try {
      const { data: emailAvailable, error } = await supabase
        .rpc('is_email_available', { check_email: email });

      if (error) {
        console.error('Email check error:', error);
        return;
      }

      if (!emailAvailable) {
        setEmailError('An account with this email already exists');
        form.setError('email', { 
          type: 'manual', 
          message: 'An account with this email already exists' 
        });
      } else {
        form.clearErrors('email');
      }
    } catch (error) {
      console.error('Email availability check failed:', error);
    } finally {
      setEmailChecking(false);
    }
  };

  const handleFormSubmit = async (data: UserRegistrationData) => {
    // Final email check before submission
    if (emailError) {
      toast({
        title: "Email Error",
        description: "Please use a different email address.",
        variant: "destructive",
      });
      return;
    }
    
    onSubmit(data);
  };

  const roles = [
    { value: 'player', label: 'Player' },
    { value: 'parent', label: 'Parent' },
    { value: 'coach', label: 'Coach' },
    { value: 'staff', label: 'Staff' },
    { value: 'medical', label: 'Medical Team' },
    { value: 'partner', label: 'Partner' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          User Registration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="email" 
                          placeholder="Enter email" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            // Debounce email check
                            setTimeout(() => checkEmailAvailability(e.target.value), 500);
                          }}
                          className={emailError ? 'border-red-500' : ''}
                        />
                        {emailChecking && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                          </div>
                        )}
                        {emailError && !emailChecking && (
                          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {emailError && (
                      <p className="text-sm text-red-600 mt-1">{emailError}</p>
                    )}
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || emailChecking || !!emailError}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Registering...' : emailChecking ? 'Checking email...' : 'Register User'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default UserRegistrationForm;
