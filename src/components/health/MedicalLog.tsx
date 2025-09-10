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
  Clock,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import AppointmentSchedulingModal from './AppointmentSchedulingModal';
import MedicalClearanceModal from './MedicalClearanceModal';
import RehabilitationManager from './RehabilitationManager';
import AppointmentsList from './AppointmentsList';
import ReturnToPlayStatus from './ReturnToPlayStatus';
import { useMedicalData } from '@/hooks/useMedicalData';
import { ErrorFallback, NotFoundErrorFallback } from '@/components/ui/ErrorFallback';
import { LoadingState } from '@/components/ui/LoadingState';

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
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);

  // Use the new medical data hook
  const { 
    data: medicalData, 
    loading: medicalDataLoading, 
    refreshData 
  } = useMedicalData({ userRole, playerProfile });

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
                <LoadingState
                  variant="spinner"
                  title="Loading Medical Records"
                  description="Fetching medical history and assessments..."
                />
              ) : medicalHistory.length === 0 ? (
                <NotFoundErrorFallback
                  resourceName="medical records"
                  onRetry={() => fetchMedicalHistory()}
                />
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
                Rehabilitation Plans
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track progress on assigned exercises and treatments
              </p>
            </CardHeader>
            <CardContent>
              {medicalDataLoading ? (
                <LoadingState
                  variant="spinner"
                  title="Loading Rehabilitation Plans"
                  description="Fetching active treatment programs..."
                />
              ) : (
                <RehabilitationManager
                  plans={medicalData.rehabilitationPlans}
                  userRole={userRole}
                  isSuperAdmin={isSuperAdmin}
                  onRefresh={refreshData}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Medical Appointments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Medical appointments and therapy sessions
              </p>
            </CardHeader>
            <CardContent>
              {medicalDataLoading ? (
                <LoadingState
                  variant="spinner"
                  title="Loading Appointments"
                  description="Fetching scheduled medical appointments..."
                />
              ) : (
                <AppointmentsList
                  appointments={medicalData.appointments}
                  userRole={userRole}
                  isSuperAdmin={isSuperAdmin}
                  onScheduleNew={() => setAppointmentModalOpen(true)}
                  onRefresh={refreshData}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Return to Play Tab */}
        <TabsContent value="return-to-play">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Return-to-Play Status
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Medical clearance status for returning to full activity
              </p>
            </CardHeader>
            <CardContent>
              {medicalDataLoading ? (
                <LoadingState
                  variant="spinner"
                  title="Loading Return-to-Play Status"
                  description="Calculating medical clearance status..."
                />
              ) : (
                <ReturnToPlayStatus
                  status={medicalData.returnToPlayStatus}
                  onRequestClearance={() => setClearanceModalOpen(true)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AppointmentSchedulingModal
        isOpen={appointmentModalOpen}
        onClose={() => {
          setAppointmentModalOpen(false);
          refreshData(); // Refresh data when appointment is scheduled
        }}
        playerProfile={playerProfile}
        isSuperAdmin={isSuperAdmin}
      />
      
      <MedicalClearanceModal
        isOpen={clearanceModalOpen}
        onClose={() => {
          setClearanceModalOpen(false);
          refreshData(); // Refresh data when clearance is requested
        }}
        playerProfile={playerProfile}
      />
    </div>
  );
};

export default MedicalLog;