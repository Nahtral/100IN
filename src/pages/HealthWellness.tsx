import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  BarChart3,
  Calendar,
  CheckCircle,
  FileText,
  Plus,
  TrendingUp,
  Shield
} from 'lucide-react';
import HealthDashboard from '@/components/health/HealthDashboard';
import DailyCheckIn from '@/components/health/DailyCheckIn';
import InjuryReporting from '@/components/health/InjuryReporting';
import MedicalLog from '@/components/health/MedicalLog';
import HealthCommunication from '@/components/health/HealthCommunication';
import HealthAnalytics from '@/components/health/HealthAnalytics';
import QuickCheckIn from '@/components/health/QuickCheckIn';

const HealthWellness = () => {
  const { user } = useAuth();
  const { primaryRole, isSuperAdmin, loading: roleLoading } = useOptimizedAuth();
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [playerProfile, setPlayerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!roleLoading && user) {
      fetchUserData();
    }
  }, [user, primaryRole, roleLoading]);

  const fetchUserData = async () => {
    try {
      if (primaryRole === 'player') {
        // Fetch player profile for players
        const { data: playerData, error } = await supabase
          .from('players')
          .select('*')
          .eq('user_id', user?.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setPlayerProfile(playerData);
      } else if (primaryRole === 'parent') {
        // For parents, we might need to fetch their child's data based on relationships
        // This ensures parents only see their children's health data
        const { data: childrenData, error } = await supabase
          .from('parent_child_relationships')
          .select(`
            child_id,
            players(*)
          `)
          .eq('parent_id', user?.id);

        if (error) {
          console.error('Error fetching children data:', error);
        }
        
        // For now, we'll use the first child if multiple exist
        if (childrenData && childrenData.length > 0) {
          setPlayerProfile(childrenData[0].players);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl mb-4 animate-pulse p-2">
              <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Health & Wellness</h2>
            <p className="text-gray-600">Loading your health dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Check if user has access to health and wellness
  const hasAccess = ['player', 'parent', 'coach', 'staff', 'medical'].includes(primaryRole) || isSuperAdmin();

  if (!hasAccess) {
    return (
      <Layout currentUser={currentUser}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-96 text-center animate-fade-in">
            <CardContent className="p-8">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-gray-600">
                You don't have permission to access the Health & Wellness module.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Show message for players without profile
  if (primaryRole === 'player' && !playerProfile) {
    return (
      <Layout currentUser={currentUser}>
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Health & Wellness</h1>
              <p className="text-gray-600">Comprehensive health tracking and communication hub</p>
            </div>
            <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              EMERGENCY
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button className="py-2 px-1 border-b-2 border-orange-500 font-medium text-sm text-orange-600">
                <Heart className="h-4 w-4 inline mr-2" />
                Daily Check-in
              </button>
            </nav>
          </div>

          {/* No Profile Message */}
          <Card className="text-center py-12 animate-fade-in">
            <CardContent>
              <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No player profile found</h3>
              <p className="text-gray-600">Please contact your administrator.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Health & Wellness</h1>
            <p className="text-gray-600">Comprehensive health tracking and communication hub</p>
          </div>
          <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg">
            <AlertTriangle className="h-4 w-4 mr-2" />
            EMERGENCY
          </Button>
        </div>

        {/* Navigation Tabs and Quick Check-in */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-gray-200">
                <TabsList className="h-auto p-0 bg-transparent border-0">
                  <div className="flex flex-wrap gap-1 sm:gap-0 sm:space-x-8">
                <TabsTrigger 
                  value="dashboard" 
                  className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none font-medium text-sm transition-all hover:text-orange-600"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Dashboard
                </TabsTrigger>
                
                {(primaryRole === 'player' || primaryRole === 'parent') && (
                  <TabsTrigger 
                    value="daily-checkin" 
                    className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none font-medium text-sm transition-all hover:text-orange-600"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Daily Check-in
                  </TabsTrigger>
                )}
                
                <TabsTrigger 
                  value="injuries" 
                  className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none font-medium text-sm transition-all hover:text-orange-600"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Injuries
                </TabsTrigger>
                
                <TabsTrigger 
                  value="medical-log" 
                  className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none font-medium text-sm transition-all hover:text-orange-600"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Medical Log
                </TabsTrigger>
                
                {(['coach', 'staff', 'medical'].includes(primaryRole) || isSuperAdmin()) && (
                  <TabsTrigger 
                    value="communication" 
                    className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none font-medium text-sm transition-all hover:text-orange-600"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Communication
                  </TabsTrigger>
                )}
                
                {(['staff', 'medical'].includes(primaryRole) || isSuperAdmin()) && (
                  <TabsTrigger 
                    value="analytics" 
                    className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none font-medium text-sm transition-all hover:text-orange-600"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                )}
              </div>
            </TabsList>
          </div>

          <div className="mt-6">
            <TabsContent value="dashboard" className="mt-0">
              <HealthDashboard 
                userRole={primaryRole} 
                isSuperAdmin={isSuperAdmin()}
                playerProfile={playerProfile}
              />
            </TabsContent>

            {(primaryRole === 'player' || primaryRole === 'parent') && (
              <TabsContent value="daily-checkin" className="mt-0">
                <DailyCheckIn 
                  playerProfile={playerProfile}
                  userRole={primaryRole}
                />
              </TabsContent>
            )}

            <TabsContent value="injuries" className="mt-0">
              <InjuryReporting 
                userRole={primaryRole}
                isSuperAdmin={isSuperAdmin()}
                playerProfile={playerProfile}
              />
            </TabsContent>

            <TabsContent value="medical-log" className="mt-0">
              <MedicalLog 
                userRole={primaryRole}
                isSuperAdmin={isSuperAdmin()}
                playerProfile={playerProfile}
              />
            </TabsContent>

            {(['coach', 'staff', 'medical'].includes(primaryRole) || isSuperAdmin()) && (
              <TabsContent value="communication" className="mt-0">
                 <HealthCommunication 
                   userRole={primaryRole}
                    isSuperAdmin={isSuperAdmin()}
                   playerProfile={playerProfile}
                 />
              </TabsContent>
            )}

            {(['staff', 'medical'].includes(primaryRole) || isSuperAdmin()) && (
              <TabsContent value="analytics" className="mt-0">
                <HealthAnalytics 
                  userRole={primaryRole}
                  isSuperAdmin={isSuperAdmin()}
                />
              </TabsContent>
             )}
             </div>
           </Tabs>
         </div>
         
         {/* Quick Check-in Sidebar */}
         <div className="lg:col-span-1">
           <QuickCheckIn 
             playerProfile={playerProfile}
             userRole={primaryRole}
           />
         </div>
       </div>
     </div>
   </Layout>
 );
};

export default HealthWellness;