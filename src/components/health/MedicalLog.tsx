import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText,
  Activity,
  Calendar,
  CheckCircle,
  Shield,
  Stethoscope,
  HeartPulse,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MedicalLogProps {
  userRole: string;
  isSuperAdmin: boolean;
  playerProfile?: any;
}

const MedicalLog: React.FC<MedicalLogProps> = ({ 
  userRole, 
  isSuperAdmin, 
  playerProfile 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('medical-history');

  useEffect(() => {
    fetchMedicalHistory();
  }, [userRole, playerProfile]);

  const fetchMedicalHistory = async () => {
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
        .order('date', { ascending: false });

      if (userRole === 'player' && playerProfile) {
        query = query.eq('player_id', playerProfile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      setMedicalHistory(data || []);
    } catch (error) {
      console.error('Error fetching medical history:', error);
      toast({
        title: "Error",
        description: "Failed to load medical records.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Medical & Recovery Log</h2>
          <p className="text-gray-600">Comprehensive medical history and rehabilitation tracking</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="medical-history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Medical History
          </TabsTrigger>
          <TabsTrigger value="rehabilitation" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Rehabilitation
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="return-to-play" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Return to Play
          </TabsTrigger>
        </TabsList>

        {/* Medical History Tab */}
        <TabsContent value="medical-history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Medical History
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete record of medical assessments and treatments
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading medical records...</p>
                </div>
              ) : medicalHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No medical records found.</h3>
                  <p className="text-gray-600">Medical history will appear here once records are added.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicalHistory.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Health Assessment</span>
                          {record.injury_status && (
                            <Badge variant={record.injury_status === 'injured' ? 'destructive' : 'outline'}>
                              {record.injury_status}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </span>
                      </div>

                      {userRole !== 'player' && record.players?.profiles && (
                        <p className="text-sm text-gray-600 mb-2">
                          Patient: {record.players.profiles.full_name}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {record.weight && (
                          <div>
                            <span className="text-gray-500">Weight:</span>
                            <span className="font-medium ml-1">{record.weight} lbs</span>
                          </div>
                        )}
                        {record.body_fat_percentage && (
                          <div>
                            <span className="text-gray-500">Body Fat:</span>
                            <span className="font-medium ml-1">{record.body_fat_percentage}%</span>
                          </div>
                        )}
                        {record.fitness_score && (
                          <div>
                            <span className="text-gray-500">Fitness:</span>
                            <span className="font-medium ml-1">{record.fitness_score}/10</span>
                          </div>
                        )}
                      </div>

                      {record.medical_notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">{record.medical_notes}</p>
                        </div>
                      )}

                      {record.injury_description && (
                        <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-100">
                          <h5 className="text-sm font-medium text-red-800 mb-1">Injury Notes:</h5>
                          <p className="text-sm text-red-700">{record.injury_description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rehabilitation Tab */}
        <TabsContent value="rehabilitation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Current Rehabilitation Plan
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track progress on assigned exercises and treatments
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No rehabilitation plan assigned.</h3>
                <p className="text-gray-600">
                  Rehabilitation plans and progress tracking will appear here when assigned by medical staff.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Appointments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Medical appointments and therapy sessions
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming appointments scheduled.</h3>
                <p className="text-gray-600 mb-4">
                  Medical appointments will be displayed here when scheduled.
                </p>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule New Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Return to Play Tab */}
        <TabsContent value="return-to-play">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Return-to-Play Protocol
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Medical clearance process for returning to full activity
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-semibold text-green-800 mb-2">Cleared for Play</h3>
                <p className="text-green-700 mb-6">
                  No active injuries. You are cleared for full participation.
                </p>

                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-green-800 mb-2">Current Status</h4>
                  <p className="text-green-700">
                    All clear for full participation in training and competition.
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  Request Medical Clearance Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicalLog;