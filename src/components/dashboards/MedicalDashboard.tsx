
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Calendar,
  FileText,
  Users,
  Building2
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import InjuryDetailsModal from "@/components/health/InjuryDetailsModal";
import FitnessDetailsModal from "@/components/health/FitnessDetailsModal";
import CheckInDetailsModal from "@/components/health/CheckInDetailsModal";
import MedicalReportGenerator from "@/components/health/MedicalReportGenerator";

const MedicalDashboard = () => {
  const { currentUser } = useCurrentUser();
  const { isSuperAdmin } = useUserRole();
  const [medicalData, setMedicalData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showInjuriesModal, setShowInjuriesModal] = useState(false);
  const [showFitnessModal, setShowFitnessModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  useEffect(() => {
    const fetchMedicalData = async () => {
      try {
        // Get all players for injury tracking
        const { data: players } = await supabase
          .from('players')
          .select('id, user_id')
          .eq('is_active', true);

        // Get health wellness data to check for injuries
        const { data: healthData } = await supabase
          .from('health_wellness')
          .select('*')
          .order('date', { ascending: false });

        // Get daily health check-ins for fitness data
        const { data: checkInData } = await supabase
          .from('daily_health_checkins')
          .select('*')
          .order('check_in_date', { ascending: false });

        // Get medical appointments
        const { data: appointments } = await supabase
          .from('medical_appointments')
          .select('*')
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(10);

        // Calculate stats
        const activeInjuries = healthData?.filter(h => h.injury_status === 'injured').length || 0;
        const clearedPlayers = (players?.length || 0) - activeInjuries;
        
        // Get recent fitness assessments
        const recentFitness = checkInData?.slice(0, 5) || [];
        const avgFitness = checkInData?.length > 0 ? 
          Math.round(checkInData.reduce((sum, c) => sum + (c.training_readiness || 0), 0) / checkInData.length) : 0;

        // Group recent injuries
        const recentInjuries = healthData?.filter(h => h.injury_status === 'injured').slice(0, 5) || [];

        setMedicalData({
          activeInjuries,
          clearedPlayers,
          fitnessTests: appointments?.filter(a => a.appointment_type === 'fitness_test').length || 0,
          avgFitness,
          recentInjuries,
          recentFitness,
          appointments: appointments || []
        });
      } catch (error) {
        console.error('Error fetching medical data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading medical data...</div>;
  }
  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Medical Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {currentUser.name}! Monitor player health.
            </p>
          </div>
        </div>
        {/* Medical Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="border-red-200 cursor-pointer hover:border-red-300 hover:shadow-md transition-all"
          onClick={() => setShowInjuriesModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Injuries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalData.activeInjuries}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention • Click to view details
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className="border-green-200 cursor-pointer hover:border-green-300 hover:shadow-md transition-all"
          onClick={() => setShowCheckInModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Check-ins</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalData.clearedPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Today's reports • Click to view details
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className="border-blue-200 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
          onClick={() => setShowFitnessModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fitness Tests</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalData.fitnessTests}</div>
            <p className="text-xs text-muted-foreground">
              Recent assessments • Click to view details
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className="border-orange-200 cursor-pointer hover:border-orange-300 hover:shadow-md transition-all"
          onClick={() => setShowFitnessModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fitness</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalData.avgFitness}</div>
            <p className="text-xs text-muted-foreground">
              Team average • Click to view details
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Injuries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Recent Injuries
            </CardTitle>
            <CardDescription>
              Players requiring medical attention
            </CardDescription>
          </CardHeader>
          <CardContent>
           <div className="space-y-3">
             {medicalData.recentInjuries?.length > 0 ? medicalData.recentInjuries.map((injury, index) => (
               <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                 <div>
                   <p className="font-medium">Player #{injury.player_id}</p>
                   <p className="text-sm text-gray-600">{injury.injury_description || 'Injury reported'}</p>
                   <p className="text-xs text-gray-500">{new Date(injury.date).toLocaleDateString()}</p>
                 </div>
                 <div className="text-right">
                   <Badge variant="destructive">
                     {injury.injury_status}
                   </Badge>
                   <p className="text-xs text-gray-500 mt-1">Active</p>
                 </div>
               </div>
             )) : (
               <p className="text-center text-muted-foreground py-4">No recent injuries</p>
             )}
           </div>
             <Button 
               className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-600"
               onClick={() => setShowInjuriesModal(true)}
             >
               View All Injuries
             </Button>
          </CardContent>
        </Card>

        {/* Fitness Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-blue-600" />
              Fitness Assessments
            </CardTitle>
            <CardDescription>
              Recent player evaluations
            </CardDescription>
          </CardHeader>
          <CardContent>
           <div className="space-y-3">
             {medicalData.recentFitness?.length > 0 ? medicalData.recentFitness.map((assessment, index) => (
               <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                 <div>
                   <p className="font-medium">Player #{assessment.player_id}</p>
                   <p className="text-sm text-gray-600">Training Readiness: {assessment.training_readiness || 'N/A'}</p>
                 </div>
                 <div className="text-right">
                   <Badge variant="outline">
                     {assessment.energy_level || 'N/A'}/10
                   </Badge>
                   <p className="text-xs text-gray-500 mt-1">{new Date(assessment.check_in_date).toLocaleDateString()}</p>
                 </div>
               </div>
             )) : (
               <p className="text-center text-muted-foreground py-4">No recent fitness assessments</p>
             )}
           </div>
             <Button 
               className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600"
               onClick={() => setShowFitnessModal(true)}
             >
               Schedule Assessment
             </Button>
          </CardContent>
        </Card>
      </div>

      {/* Medical Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Medical Schedule
          </CardTitle>
          <CardDescription>
            Upcoming appointments and evaluations
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-3">
             {medicalData.appointments?.length > 0 ? medicalData.appointments.map((appointment, index) => (
               <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                 <div>
                   <p className="font-medium">{appointment.appointment_type}</p>
                   <p className="text-sm text-gray-600">Player #{appointment.player_id}</p>
                   <p className="text-xs text-gray-500">{appointment.location || 'TBD'}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-medium">{new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                   <Badge variant="outline" className="text-xs">
                     {appointment.status}
                   </Badge>
                 </div>
               </div>
             )) : (
               <p className="text-center text-muted-foreground py-4">No upcoming appointments</p>
             )}
           </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mt-6">
         <Button 
           className="mobile-button"
           onClick={() => setShowCheckInModal(true)}
         >
           <Calendar className="h-4 w-4 mr-2" />
           Schedule Medical Check
         </Button>
         <Button 
           variant="outline" 
           className="mobile-button"
           onClick={() => setShowReportGenerator(true)}
         >
           <FileText className="h-4 w-4 mr-2" />
           Generate Report
         </Button>
        <Button variant="outline" asChild className="mobile-button">
          <a href="/medical-management">
            <Building2 className="h-4 w-4 mr-2" />
            Manage Medical Partners
          </a>
        </Button>
      </div>

      {/* Detail Modals */}
      <InjuryDetailsModal 
        isOpen={showInjuriesModal}
        onClose={() => setShowInjuriesModal(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <FitnessDetailsModal 
        isOpen={showFitnessModal}
        onClose={() => setShowFitnessModal(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <CheckInDetailsModal 
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <MedicalReportGenerator
        isOpen={showReportGenerator}
        onClose={() => setShowReportGenerator(false)}
      />
      </div>
    </Layout>
  );
};

export default MedicalDashboard;
