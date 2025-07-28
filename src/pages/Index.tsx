
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Trophy, 
  Activity, 
  Shield, 
  UserCheck, 
  Heart,
  Handshake,
  BarChart3,
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
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [currentUser] = useState({
    name: "Alex Johnson",
    avatar: "AJ"
  });

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Court Vision
                </h1>
                <p className="text-sm text-gray-600">Panthers Basketball Club</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 ${roleConfigs[currentRole].color} rounded-full flex items-center justify-center`}>
                  <CurrentIcon className="h-4 w-4 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-gray-500">{roleConfigs[currentRole].title}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Switcher - Demo purposes */}
        <Card className="mb-6 border-orange-200">
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
        <div className="mb-6">
          <Badge variant="outline" className="text-lg px-4 py-2 border-orange-300">
            <CurrentIcon className="h-5 w-5 mr-2" />
            {roleConfigs[currentRole].title} Dashboard
          </Badge>
          <p className="text-gray-600 mt-2">{roleConfigs[currentRole].description}</p>
        </div>

        {/* Dashboard Content */}
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Index;
