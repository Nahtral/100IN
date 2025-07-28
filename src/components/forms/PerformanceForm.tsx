
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
  gameDate: z.string().min(1, 'Game date is required'),
  opponent: z.string().min(1, 'Opponent is required'),
  points: z.number().min(0, 'Points must be 0 or greater'),
  assists: z.number().min(0, 'Assists must be 0 or greater'),
  rebounds: z.number().min(0, 'Rebounds must be 0 or greater'),
  steals: z.number().min(0, 'Steals must be 0 or greater'),
  blocks: z.number().min(0, 'Blocks must be 0 or greater'),
  turnovers: z.number().min(0, 'Turnovers must be 0 or greater'),
  fieldGoalsMade: z.number().min(0, 'Field goals made must be 0 or greater'),
  fieldGoalsAttempted: z.number().min(0, 'Field goals attempted must be 0 or greater'),
  freeThrowsMade: z.number().min(0, 'Free throws made must be 0 or greater'),
  freeThrowsAttempted: z.number().min(0, 'Free throws attempted must be 0 or greater'),
  minutesPlayed: z.number().min(0, 'Minutes played must be 0 or greater'),
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
      gameDate: initialData?.gameDate || '',
      opponent: initialData?.opponent || '',
      points: initialData?.points || 0,
      assists: initialData?.assists || 0,
      rebounds: initialData?.rebounds || 0,
      steals: initialData?.steals || 0,
      blocks: initialData?.blocks || 0,
      turnovers: initialData?.turnovers || 0,
      fieldGoalsMade: initialData?.fieldGoalsMade || 0,
      fieldGoalsAttempted: initialData?.fieldGoalsAttempted || 0,
      freeThrowsMade: initialData?.freeThrowsMade || 0,
      freeThrowsAttempted: initialData?.freeThrowsAttempted || 0,
      minutesPlayed: initialData?.minutesPlayed || 0,
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
                name="gameDate"
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
                name="fieldGoalsMade"
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
                name="fieldGoalsAttempted"
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
                name="freeThrowsMade"
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
                name="freeThrowsAttempted"
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
                name="minutesPlayed"
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
