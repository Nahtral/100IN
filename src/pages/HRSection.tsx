import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  BriefcaseMedical, 
  Users, 
  Shield,
  ArrowLeft
} from 'lucide-react';

// Import the actual functional components
import TimeTracking from '@/components/hr/TimeTracking';
import TimeOffManagement from '@/components/hr/TimeOffManagement';
import PayrollDashboard from '@/components/hr/PayrollDashboard';
import BenefitsManagement from '@/components/hr/BenefitsManagement';
import OnboardingTasks from '@/components/hr/OnboardingTasks';
import { PermissionsManagement } from '@/components/admin/PermissionsManagement';

// Route handler component
const HRSection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [stats, setStats] = useState({});

  const currentPath = location.pathname;
  const section = currentPath.split('/').pop();

  const updateStats = () => {
    // Callback for components to trigger stats updates
    setStats({});
  };

  const getSectionConfig = () => {
    switch (section) {
      case 'time':
        return {
          title: 'Time & Attendance',
          icon: Clock,
          description: 'Manage employee time tracking and attendance records',
          component: <TimeTracking onStatsUpdate={updateStats} />
        };
      case 'leave':
        return {
          title: 'Leave Management',
          icon: Calendar,
          description: 'Handle time off requests and leave policies',
          component: <TimeOffManagement onStatsUpdate={updateStats} />
        };
      case 'payroll':
        return {
          title: 'Payroll Dashboard',
          icon: DollarSign,
          description: 'Process payroll and manage compensation',
          component: <PayrollDashboard onStatsUpdate={updateStats} />
        };
      case 'benefits':
        return {
          title: 'Benefits Administration',
          icon: BriefcaseMedical,
          description: 'Manage employee benefits and enrollment',
          component: <BenefitsManagement onStatsUpdate={updateStats} />
        };
      case 'permissions':
        return {
          title: 'Staff Permissions',
          icon: Shield,
          description: 'Manage staff roles and access control',
          component: <PermissionsManagement />
        };
      case 'onboarding':
        return {
          title: 'Onboarding Tasks',
          icon: Users,
          description: 'Manage new employee onboarding tasks',
          component: <OnboardingTasks onStatsUpdate={updateStats} />
        };
      default:
        return {
          title: 'HR Section',
          icon: Users,
          description: 'HR management functionality',
          component: <HROverview />
        };
    }
  };

  const sectionConfig = getSectionConfig();
  const IconComponent = sectionConfig.icon;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/admin/staff')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Staff Management
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{sectionConfig.title}</h1>
            <p className="text-muted-foreground">{sectionConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Render the actual functional component */}
      {sectionConfig.component}
    </div>
  );
};

// HR Overview component for the default route
const HROverview = () => {
  const navigate = useNavigate();

  const hrFunctions = [
    {
      title: 'Time & Attendance',
      description: 'Manage employee time tracking and attendance',
      icon: Clock,
      route: '/admin/staff/hr/time',
      status: 'active'
    },
    {
      title: 'Leave Management',
      description: 'Handle time off requests and leave policies',
      icon: Calendar,
      route: '/admin/staff/hr/leave',
      status: 'active'
    },
    {
      title: 'Payroll',
      description: 'Process payroll and manage compensation',
      icon: DollarSign,
      route: '/admin/staff/hr/payroll',
      status: 'active'
    },
    {
      title: 'Benefits',
      description: 'Manage employee benefits and enrollment',
      icon: BriefcaseMedical,
      route: '/admin/staff/hr/benefits',
      status: 'active'
    },
    {
      title: 'Permissions',
      description: 'Manage staff roles and access control',
      icon: Shield,
      route: '/admin/staff/hr/permissions',
      status: 'active'
    },
    {
      title: 'Onboarding',
      description: 'New employee onboarding tasks',
      icon: Users,
      route: '/admin/staff/hr/onboarding',
      status: 'active'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HR Functions Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Welcome to the HR management system. Select a function below to access its full functionality.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hrFunctions.map((func) => (
              <Card
                key={func.route}
                className="cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                onClick={() => navigate(func.route)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <func.icon className="h-4 w-4" />
                    {func.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {func.description}
                  </p>
                  <Button className="w-full" size="sm">
                    Access {func.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRSection;