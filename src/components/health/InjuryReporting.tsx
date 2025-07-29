import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  AlertTriangle,
  Plus,
  Clock,
  MapPin,
  Activity,
  Shield,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

interface InjuryReportingProps {
  userRole: string;
  isSuperAdmin: boolean;
  playerProfile?: any;
}

const injurySchema = z.object({
  injuryType: z.string().min(1, 'Injury type is required'),
  bodyPart: z.string().min(1, 'Body part is required'),
  severity: z.string().min(1, 'Severity assessment is required'),
  dateOccurred: z.string().min(1, 'Date of occurrence is required'),
  description: z.string().min(10, 'Please provide a detailed description'),
  circumstances: z.string().optional(),
  immediateAction: z.string().optional()
});

type InjuryFormData = z.infer<typeof injurySchema>;

const InjuryReporting: React.FC<InjuryReportingProps> = ({ 
  userRole, 
  isSuperAdmin, 
  playerProfile 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [injuries, setInjuries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InjuryFormData>({
    resolver: zodResolver(injurySchema),
    defaultValues: {
      injuryType: '',
      bodyPart: '',
      severity: '',
      dateOccurred: new Date().toISOString().split('T')[0],
      description: '',
      circumstances: '',
      immediateAction: ''
    }
  });

  useEffect(() => {
    fetchInjuries();
  }, [userRole, playerProfile]);

  const fetchInjuries = async () => {
    try {
      let query = supabase
        .from('health_wellness')
        .select(`
          *,
          players!inner (
            profiles (
              full_name,
              email
            )
          )
        `)
        .not('injury_status', 'is', null)
        .neq('injury_status', 'healthy')
        .order('date', { ascending: false });

      if (userRole === 'player' && playerProfile) {
        query = query.eq('player_id', playerProfile.id);
      } else if (userRole === 'coach') {
        // Filter by team - would need team association logic
      }

      const { data, error } = await query;
      if (error) throw error;

      setInjuries(data || []);
    } catch (error) {
      console.error('Error fetching injuries:', error);
      toast({
        title: "Error",
        description: "Failed to load injury records.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: InjuryFormData) => {
    if (!playerProfile && userRole === 'player') return;

    setIsSubmitting(true);
    try {
      const injuryRecord = {
        player_id: playerProfile?.id,
        date: data.dateOccurred,
        injury_status: 'injured',
        injury_description: `${data.injuryType} - ${data.bodyPart}\n\nDescription: ${data.description}\n\nCircumstances: ${data.circumstances}\n\nImmediate Action: ${data.immediateAction}`,
        medical_notes: `Severity: ${data.severity}\nReported: ${format(new Date(), 'PPpp')}`,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('health_wellness')
        .insert([injuryRecord]);

      if (error) throw error;

      toast({
        title: "Injury Reported",
        description: "Your injury report has been submitted successfully.",
      });

      setIsFormOpen(false);
      form.reset();
      fetchInjuries();
    } catch (error) {
      console.error('Error submitting injury report:', error);
      toast({
        title: "Error",
        description: "Failed to submit injury report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInjuryStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'injured':
        return <Badge variant="destructive">Injured</Badge>;
      case 'recovering':
        return <Badge variant="secondary">Recovering</Badge>;
      case 'monitoring':
        return <Badge variant="outline">Monitoring</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (notes: string) => {
    if (notes?.includes('severe')) return <Badge variant="destructive">Severe</Badge>;
    if (notes?.includes('moderate')) return <Badge variant="secondary">Moderate</Badge>;
    if (notes?.includes('mild')) return <Badge variant="outline">Mild</Badge>;
    return null;
  };

  const injuryTypes = [
    'Ankle Sprain', 'Knee Injury', 'Shoulder Injury', 'Back Injury', 
    'Hamstring Strain', 'Concussion', 'Wrist Injury', 'Hip Injury', 'Other'
  ];

  const bodyParts = [
    'Ankle', 'Knee', 'Shoulder', 'Back', 'Hamstring', 'Head/Neck', 
    'Wrist', 'Hip', 'Foot', 'Elbow', 'Chest', 'Other'
  ];

  const severityLevels = ['Mild', 'Moderate', 'Severe'];

  if (userRole === 'player' && !playerProfile) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No player profile found</h3>
          <p className="text-gray-600">Please contact your administrator.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Injury Reporting</h2>
          <p className="text-gray-600">Report and track injuries for proper medical attention</p>
        </div>
        {(userRole === 'player' || ['coach', 'staff', 'medical'].includes(userRole) || isSuperAdmin) && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Report New Injury
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  New Injury Report
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Please provide detailed information about the injury for proper assessment
                </p>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="injuryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Injury Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select injury type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {injuryTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bodyPart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Part *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select body part" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bodyParts.map((part) => (
                                <SelectItem key={part} value={part}>{part}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity Assessment *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Assess severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {severityLevels.map((level) => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOccurred"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Occurrence *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description of Injury</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what happened and the nature of the injury..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="circumstances"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Circumstances</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What were you doing when the injury occurred? (training, game, etc.)"
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
                    name="immediateAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Immediate Action Taken</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What immediate care or treatment was provided?"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsFormOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Injury Report'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Injury History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Injury History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track and monitor your injury recovery progress
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading injury records...</p>
            </div>
          ) : injuries.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No injuries reported yet.</h3>
              <p className="text-gray-600">
                {userRole === 'player' 
                  ? "We hope you stay injury-free!" 
                  : "No injury reports found for your scope."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {injuries.map((injury) => (
                <div key={injury.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {injury.injury_description?.split('\n')[0] || 'Injury Report'}
                        </h4>
                        {getInjuryStatusBadge(injury.injury_status)}
                        {getSeverityBadge(injury.medical_notes || '')}
                      </div>
                      
                      {userRole !== 'player' && injury.players?.profiles && (
                        <p className="text-sm text-gray-600 mb-2">
                          Player: {injury.players.profiles.full_name}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(injury.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      
                      {injury.injury_description && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                          {injury.injury_description.split('\n\n')[1]?.replace('Description: ', '') || injury.injury_description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InjuryReporting;