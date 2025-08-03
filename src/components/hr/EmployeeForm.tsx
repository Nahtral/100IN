import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().min(1, 'Position is required'),
  hireDate: z.date(),
  employmentStatus: z.string().min(1, 'Employment status is required'),
  paymentType: z.string().min(1, 'Payment type is required'),
  hourlyRate: z.string().optional(),
  salary: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hire_date: string;
  employment_status: string;
  payment_type: string;
  hourly_rate: number;
  salary: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSuccess, onCancel }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: employee?.employee_id || '',
      firstName: employee?.first_name || '',
      lastName: employee?.last_name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      department: employee?.department || '',
      position: employee?.position || '',
      hireDate: employee ? new Date(employee.hire_date) : undefined,
      employmentStatus: employee?.employment_status || 'active',
      paymentType: employee?.payment_type || 'hourly',
      hourlyRate: employee?.hourly_rate?.toString() || '',
      salary: employee?.salary?.toString() || '',
      emergencyContactName: employee?.emergency_contact_name || '',
      emergencyContactPhone: employee?.emergency_contact_phone || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const employeeData = {
        employee_id: values.employeeId,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone || null,
        department: values.department || null,
        position: values.position,
        hire_date: values.hireDate.toISOString().split('T')[0],
        employment_status: values.employmentStatus,
        payment_type: values.paymentType,
        hourly_rate: values.hourlyRate ? parseFloat(values.hourlyRate) : null,
        salary: values.salary ? parseFloat(values.salary) : null,
        emergency_contact_name: values.emergencyContactName || null,
        emergency_contact_phone: values.emergencyContactPhone || null,
        created_by: user?.id,
      };

      if (employee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employee.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Employee updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([employeeData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Employee added successfully.",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save employee.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee ID</FormLabel>
                <FormControl>
                  <Input placeholder="EMP001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="employmentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
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
                  <Input type="email" placeholder="john.doe@company.com" {...field} />
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Human Resources" {...field} />
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
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input placeholder="HR Manager" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Hire Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
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
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="25.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Salary ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="50000.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergencyContactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency Contact Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergencyContactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency Contact Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 987-6543" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="btn-panthers">
            {employee ? 'Update Employee' : 'Add Employee'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EmployeeForm;