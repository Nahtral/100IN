import React, { useState } from 'react';
import { 
  Users, Trophy, User, Calendar, Activity, Heart, Briefcase, 
  BarChart3, MessageCircle, Settings, Target, Home, Bell,
  ChevronRight, Menu, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole } from '@/hooks/useUserRole';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import CoachDashboard from '@/components/dashboards/CoachDashboard';
import PlayerDashboard from '@/components/dashboards/PlayerDashboard';
import StaffDashboard from '@/components/dashboards/StaffDashboard';
import ParentDashboard from '@/components/dashboards/ParentDashboard';
import MedicalDashboard from '@/components/dashboards/MedicalDashboard';
import PartnerDashboard from '@/components/dashboards/PartnerDashboard';
import HealthDashboard from '@/components/health/HealthDashboard';
import PayrollDashboard from '@/components/hr/PayrollDashboard';

const quickActionItems = [
  { icon: Home, label: 'Dashboard', id: 'dashboard', color: 'text-panthers-red' },
  { icon: Users, label: 'Players', id: 'players', color: 'text-panthers-red' },
  { icon: Calendar, label: 'Schedule', id: 'schedule', color: 'text-panthers-red' },
  { icon: Target, label: 'ShotIQ', id: 'shotiq', color: 'text-panthers-red' },
  { icon: Heart, label: 'Health', id: 'health', color: 'text-panthers-red' },
  { icon: Briefcase, label: 'HR Management', id: 'hr', color: 'text-panthers-red' },
  { icon: BarChart3, label: 'Analytics', id: 'analytics', color: 'text-panthers-red' },
  { icon: MessageCircle, label: 'Chat', id: 'chat', color: 'text-panthers-red' },
];

export function CourtVision() {
  const { currentUser } = useCurrentUser();
  const { userRole } = useUserRole();
  const [activeSection, setActiveSection] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleQuickAction = (actionId: string) => {
    setActiveSection(actionId);
    setMenuOpen(false);
  };

  const renderDashboardContent = () => {
    switch (activeSection) {
      case 'dashboard':
        if (userRole === 'super_admin') return <SuperAdminDashboard />;
        if (userRole === 'coach') return <CoachDashboard />;
        if (userRole === 'player') return <PlayerDashboard />;
        if (userRole === 'staff') return <StaffDashboard />;
        if (userRole === 'parent') return <ParentDashboard />;
        if (userRole === 'medical') return <MedicalDashboard />;
        if (userRole === 'partner') return <PartnerDashboard />;
        return <SuperAdminDashboard />;
      case 'health':
        return <HealthDashboard userRole={userRole} isSuperAdmin={userRole === 'super_admin'} />;
      case 'hr':
        return <PayrollDashboard onStatsUpdate={() => {}} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Status Bar */}
      <div className="h-6 bg-black flex items-center justify-between px-4 text-white text-xs">
        <span>{getCurrentTime()}</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <span>📶</span>
          <span className="text-green-400">🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-panthers-red h-16 flex items-center justify-between px-4 sticky top-0 z-50 shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white hover:bg-white/20"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
            <div className="text-panthers-red font-bold text-lg">🐾</div>
          </div>
          <div className="text-white">
            <div className="font-semibold text-sm">100IN</div>
            <div className="text-xs opacity-90">Panthers Basketball</div>
          </div>
        </div>

        <div className="relative">
          <Bell className="w-6 h-6 text-white" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-black">3</span>
          </div>
        </div>
      </div>

      {/* Collapsible Menu */}
      {menuOpen && (
        <div className="bg-white shadow-lg border-b border-gray-200 px-4 py-3 space-y-2">
          {quickActionItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start gap-3 h-12 ${
                activeSection === item.id ? 'bg-accent text-panthers-red' : 'hover:bg-accent/50'
              }`}
              onClick={() => handleQuickAction(item.id)}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-6">
        {activeSection === 'overview' ? (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Welcome to 100IN
              </h1>
              <p className="text-muted-foreground text-lg">
                Your Central Hub for Panthers Basketball
              </p>
              {currentUser && (
                <Badge variant="secondary" className="mt-2">
                  {currentUser.name} • {userRole}
                </Badge>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="card-enhanced">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-panthers-red mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">24</div>
                  <div className="text-sm text-muted-foreground">Active Players</div>
                </CardContent>
              </Card>

              <Card className="card-enhanced">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-6 h-6 text-panthers-red mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">3</div>
                  <div className="text-sm text-muted-foreground">Teams</div>
                </CardContent>
              </Card>

              <Card className="card-enhanced">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 text-panthers-red mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">8</div>
                  <div className="text-sm text-muted-foreground">Upcoming Events</div>
                </CardContent>
              </Card>

              <Card className="card-enhanced">
                <CardContent className="p-4 text-center">
                  <Activity className="w-6 h-6 text-panthers-red mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">92%</div>
                  <div className="text-sm text-muted-foreground">Attendance</div>
                </CardContent>
              </Card>
            </div>

            {/* Next Event */}
            <Card className="gradient-gold border-0">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Next Event</h3>
                  <Badge variant="destructive">Live</Badge>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-foreground">Away Game vs Hawks</h4>
                  <p className="text-foreground/80">Tuesday, August 5 at 7:30 PM</p>
                  <p className="text-sm text-foreground/70">Hawks Arena</p>
                </div>
                <Button className="w-full mt-4 bg-panthers-red hover:bg-panthers-red/90 text-white">
                  View Live Stats
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-panthers-red" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Training session completed</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New player added to roster</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Schedule updated for next week</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActionItems.slice(0, 6).map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-accent"
                    onClick={() => handleQuickAction(item.id)}
                  >
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection('overview')}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to Overview
              </Button>
            </div>
            {renderDashboardContent()}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="flex justify-around items-center">
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 ${
              activeSection === 'overview' ? 'text-panthers-red' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveSection('overview')}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 ${
              activeSection === 'dashboard' ? 'text-panthers-red' : 'text-muted-foreground'
            }`}
            onClick={() => handleQuickAction('dashboard')}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs">Dashboard</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 ${
              activeSection === 'chat' ? 'text-panthers-red' : 'text-muted-foreground'
            }`}
            onClick={() => handleQuickAction('chat')}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">Chat</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 text-muted-foreground"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>
      
      {/* Safe area for mobile devices */}
      <div className="h-20"></div>
    </div>
  );
}