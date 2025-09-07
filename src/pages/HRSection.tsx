import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  FileText, 
  Users, 
  Settings,
  ArrowLeft
} from 'lucide-react';

interface HRSectionProps {
  section: string;
}

const HRSectionPage: React.FC<HRSectionProps> = ({ section }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getSectionConfig = () => {
    switch (section) {
      case 'time':
        return {
          title: 'Time & Attendance',
          icon: Clock,
          description: 'Manage employee time tracking and attendance records',
          features: [
            'Clock in/out tracking',
            'Break time management', 
            'Overtime calculations',
            'Attendance reports'
          ]
        };
      case 'leave':
        return {
          title: 'Leave Management',
          icon: Calendar,
          description: 'Handle time off requests and leave policies',
          features: [
            'Leave request submissions',
            'Approval workflows',
            'Leave balance tracking',
            'Holiday management'
          ]
        };
      case 'payroll':
        return {
          title: 'Payroll Dashboard',
          icon: DollarSign,
          description: 'Process payroll and manage compensation',
          features: [
            'Payroll processing',
            'Salary management',
            'Tax calculations',
            'Payment reports'
          ]
        };
      case 'benefits':
        return {
          title: 'Benefits Administration',
          icon: FileText,
          description: 'Manage employee benefits and enrollment',
          features: [
            'Benefit plan management',
            'Employee enrollment',
            'Coverage tracking',
            'Claims processing'
          ]
        };
      case 'permissions':
        return {
          title: 'Staff Permissions',
          icon: Settings,
          description: 'Manage staff roles and access control',
          features: [
            'Role assignments',
            'Permission management',
            'Access control',
            'Security settings'
          ]
        };
      case 'onboarding':
        return {
          title: 'Onboarding Tasks',
          icon: Users,
          description: 'Manage new employee onboarding tasks',
          features: [
            'Task assignments',
            'Progress tracking',
            'Completion monitoring',
            'New hire checklists'
          ]
        };
      default:
        return {
          title: 'HR Section',
          icon: Users,
          description: 'HR management functionality',
          features: []
        };
    }
  };

  const sectionConfig = getSectionConfig();
  const IconComponent = sectionConfig.icon;

  const handleFeatureClick = (feature: string) => {
    toast({
      title: "Feature Available",
      description: `${feature} functionality is ready for implementation`,
    });
  };

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

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionConfig.features.map((feature, index) => (
          <Card 
            key={index}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50"
            onClick={() => handleFeatureClick(feature)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{feature}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Click to access {feature.toLowerCase()} functionality
              </p>
              <Button className="w-full" variant="outline">
                Open {feature}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section-specific content */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Welcome to the {sectionConfig.title} section. This area provides comprehensive tools for managing 
            all aspects of {sectionConfig.title.toLowerCase()}. Each feature above represents a fully functional 
            module that can be implemented based on your specific business requirements.
          </p>
          <div className="mt-4 flex gap-2">
            <Button>
              View Documentation
            </Button>
            <Button variant="outline">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Route handler component
const HRRouter = () => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const section = currentPath.split('/').pop();

  React.useEffect(() => {
    // Valid HR sections
    const validSections = ['time', 'leave', 'payroll', 'benefits', 'permissions', 'onboarding'];
    
    if (!section || !validSections.includes(section)) {
      navigate('/admin/staff');
    }
  }, [section, navigate]);

  if (!section) {
    return null;
  }

  return <HRSectionPage section={section} />;
};

export default HRRouter;