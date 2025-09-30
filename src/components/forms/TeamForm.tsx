
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Save } from 'lucide-react';

const teamFormSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  age_group: z.string().min(1, 'Age group is required'),
  season: z.string().min(1, 'Season is required'),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface TeamFormProps {
  onSubmit: (data: TeamFormData) => Promise<void>;
  initialData?: Partial<TeamFormData>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ onSubmit, initialData, isLoading = false, onCancel }) => {
  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      age_group: initialData?.age_group || '',
      season: initialData?.season || '',
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter team name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="age_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Group</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., U16, U18, Adult" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2024-2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
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

export default TeamForm;
