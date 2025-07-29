
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  UserCheck, 
  Activity, 
  Heart,
  Handshake,
  Settings
} from "lucide-react";
import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
import StaffDashboard from "@/components/dashboards/StaffDashboard";
import CoachDashboard from "@/components/dashboards/CoachDashboard";
import PlayerDashboard from "@/components/dashboards/PlayerDashboard";
import ParentDashboard from "@/components/dashboards/ParentDashboard";
import MedicalDashboard from "@/components/dashboards/MedicalDashboard";
import PartnerDashboard from "@/components/dashboards/PartnerDashboard";

type UserRole = 'super_admin' | 'staff' | 'coach' | 'player' | 'parent' | 'medical' | 'partner';

const Index = () => {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // Fetch user roles
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        setUserProfile(profile);
        setUserRoles(roles?.map(r => r.role) || []);
        
        // Set the primary role for demo switcher - prioritize super_admin
        if (roles && roles.length > 0) {
          const rolesList = roles.map(r => r.role);
          // If user has super_admin role, show that first
          if (rolesList.includes('super_admin')) {
            setCurrentRole('super_admin');
          } else {
            setCurrentRole(roles[0].role as UserRole);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);
  
  const roleConfigs = {
    super_admin: { 
      title: "Super Admin", 
      icon: Shield, 
      color: "bg-red-500",
      description: "Full system access and control"
    },
    staff: { 
      title: "Staff Member", 
      icon: Users, 
      color: "bg-blue-500",
      description: "Administrative and operational management"
    },
    coach: { 
      title: "Coach", 
      icon: UserCheck, 
      color: "bg-green-500",
      description: "Team and player development"
    },
    player: { 
      title: "Player", 
      icon: Activity, 
      color: "bg-orange-500",
      description: "Personal performance and team engagement"
    },
    parent: { 
      title: "Parent", 
      icon: Heart, 
      color: "bg-pink-500",
      description: "Child's progress and team involvement"
    },
    medical: { 
      title: "Medical Team", 
      icon: Heart, 
      color: "bg-emerald-500",
      description: "Player health and injury management"
    },
    partner: { 
      title: "Partner", 
      icon: Handshake, 
      color: "bg-purple-500",
      description: "Sponsorship and partnership management"
    }
  };

  const currentUser = {
    name: userProfile?.full_name || user?.email || "User",
    role: roleConfigs[currentRole].title,
    avatar: userProfile?.full_name ? userProfile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "U"
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (currentRole) {
      case 'super_admin': return <SuperAdminDashboard />;
      case 'staff': return <StaffDashboard />;
      case 'coach': return <CoachDashboard />;
      case 'player': return <PlayerDashboard />;
      case 'parent': return <ParentDashboard />;
      case 'medical': return <MedicalDashboard />;
      case 'partner': return <PartnerDashboard />;
      default: return <SuperAdminDashboard />;
    }
  };

  const CurrentIcon = roleConfigs[currentRole].icon;

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        {/* Role Switcher - Demo purposes */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-600" />
              Demo: Switch User Role
            </CardTitle>
            <CardDescription>
              Experience different dashboard views by switching roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currentRole} onValueChange={(value: UserRole) => setCurrentRole(value)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleConfigs).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 ${config.color} rounded flex items-center justify-center`}>
                          <Icon className="h-2.5 w-2.5 text-white" />
                        </div>
                        {config.title}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Current Role Badge */}
        <div>
          <Badge variant="outline" className="text-lg px-4 py-2 border-orange-300">
            <CurrentIcon className="h-5 w-5 mr-2" />
            {roleConfigs[currentRole].title} Dashboard
          </Badge>
          <p className="text-gray-600 mt-2">{roleConfigs[currentRole].description}</p>
        </div>

        {/* Dashboard Content */}
        {renderDashboard()}
      </div>
    </Layout>
  );
};

export default Index;
