
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Save } from 'lucide-react';

const performanceFormSchema = z.object({
  game_date: z.string().min(1, 'Game date is required'),
  opponent: z.string().min(1, 'Opponent is required'),
  points: z.number().min(0, 'Points must be 0 or greater'),
  assists: z.number().min(0, 'Assists must be 0 or greater'),
  rebounds: z.number().min(0, 'Rebounds must be 0 or greater'),
  steals: z.number().min(0, 'Steals must be 0 or greater'),
  blocks: z.number().min(0, 'Blocks must be 0 or greater'),
  turnovers: z.number().min(0, 'Turnovers must be 0 or greater'),
  field_goals_made: z.number().min(0, 'Field goals made must be 0 or greater'),
  field_goals_attempted: z.number().min(0, 'Field goals attempted must be 0 or greater'),
  free_throws_made: z.number().min(0, 'Free throws made must be 0 or greater'),
  free_throws_attempted: z.number().min(0, 'Free throws attempted must be 0 or greater'),
  minutes_played: z.number().min(0, 'Minutes played must be 0 or greater'),
});

type PerformanceFormData = z.infer<typeof performanceFormSchema>;

interface PerformanceFormProps {
  onSubmit: (data: PerformanceFormData) => void;
  initialData?: Partial<PerformanceFormData>;
  isLoading?: boolean;
}

const PerformanceForm: React.FC<PerformanceFormProps> = ({ onSubmit, initialData, isLoading = false }) => {
  const form = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceFormSchema),
    defaultValues: {
      game_date: initialData?.game_date || '',
      opponent: initialData?.opponent || '',
      points: initialData?.points || 0,
      assists: initialData?.assists || 0,
      rebounds: initialData?.rebounds || 0,
      steals: initialData?.steals || 0,
      blocks: initialData?.blocks || 0,
      turnovers: initialData?.turnovers || 0,
      field_goals_made: initialData?.field_goals_made || 0,
      field_goals_attempted: initialData?.field_goals_attempted || 0,
      free_throws_made: initialData?.free_throws_made || 0,
      free_throws_attempted: initialData?.free_throws_attempted || 0,
      minutes_played: initialData?.minutes_played || 0,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Player Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="game_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Opponent</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter opponent name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assists"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assists</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rebounds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rebounds</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="steals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Steals</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="blocks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blocks</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="turnovers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turnovers</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="field_goals_made"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Goals Made</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="field_goals_attempted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Goals Attempted</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="free_throws_made"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Throws Made</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="free_throws_attempted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Throws Attempted</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="minutes_played"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes Played</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Performance'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PerformanceForm;
