
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useUserRole } from "@/hooks/useUserRole";
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
  const { currentUser, loading: userLoading } = useCurrentUser();
  const { userRole, userRoles, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  
  const loading = userLoading || roleLoading;

  useEffect(() => {
    // Set the initial role for demo switcher based on actual user role
    if (isSuperAdmin) {
      setCurrentRole('super_admin');
    } else if (userRole) {
      setCurrentRole(userRole as UserRole);
    }
  }, [userRole, isSuperAdmin]);
  
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

  // Use the centralized currentUser from useCurrentUser hook
  // This ensures super admin is properly detected and displayed

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
