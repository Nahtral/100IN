import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  BriefcaseMedical, 
  Shield, 
  UserPlus,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface HRFunctionsDashboardProps {
  staffMembers: any[];
  onNavigate: (path: string) => void;
  onError: (error: { code?: string; message: string }) => void;
}

interface HRMetrics {
  activeEmployees: number;
  pendingTimeOff: number;
  upcomingPayroll: number;
  pendingOnboarding: number;
  benefitEnrollments: number;
  permissionUpdates: number;
}

interface HRFunction {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'active' | 'setup_required' | 'maintenance';
  count?: number;
  route: string;
  priority: 'high' | 'medium' | 'low';
}

export const HRFunctionsDashboard: React.FC<HRFunctionsDashboardProps> = ({
  staffMembers,
  onNavigate,
  onError
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [metrics, setMetrics] = useState<HRMetrics>({
    activeEmployees: 0,
    pendingTimeOff: 3,
    upcomingPayroll: 1,
    pendingOnboarding: 2,
    benefitEnrollments: 5,
    permissionUpdates: 1
  });
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const hrFunctions: HRFunction[] = [
    {
      id: 'time-attendance',
      title: 'Time & Attendance',
      description: 'Manage employee time tracking and attendance',
      icon: Clock,
      status: 'active',
      count: metrics.activeEmployees,
      route: '/admin/staff/hr/time',
      priority: 'high'
    },
    {
      id: 'leave-management',
      title: 'Leave Management',
      description: 'Handle time off requests and leave policies',
      icon: Calendar,
      status: 'active',
      count: metrics.pendingTimeOff,
      route: '/admin/staff/hr/leave',
      priority: 'high'
    },
    {
      id: 'payroll',
      title: 'Payroll',
      description: 'Process payroll and manage compensation',
      icon: DollarSign,
      status: 'active',
      count: metrics.upcomingPayroll,
      route: '/admin/staff/hr/payroll',
      priority: 'high'
    },
    {
      id: 'benefits',
      title: 'Benefits',
      description: 'Manage employee benefits and enrollment',
      icon: BriefcaseMedical,
      status: 'active',
      count: metrics.benefitEnrollments,
      route: '/admin/staff/hr/benefits',
      priority: 'medium'
    },
    {
      id: 'permissions',
      title: 'Permissions',
      description: 'Manage staff roles and access control',
      icon: Shield,
      status: 'active',
      count: metrics.permissionUpdates,
      route: '/admin/staff/hr/permissions',
      priority: 'medium'
    },
    {
      id: 'onboarding',
      title: 'Onboarding',
      description: 'New employee onboarding tasks',
      icon: UserPlus,
      status: 'active',
      count: metrics.pendingOnboarding,
      route: '/admin/staff/hr/onboarding',
      priority: 'low'
    }
  ];

  useEffect(() => {
    // Calculate metrics from staff data
    const activeEmployees = staffMembers.filter(s => s.employment_status === 'active').length;
    setMetrics(prev => ({
      ...prev,
      activeEmployees
    }));
  }, [staffMembers]);

  const handleFunctionClick = useCallback((hrFunction: HRFunction) => {
    try {
      // Optimistic update - show navigation feedback immediately
      toast({
        title: `Opening ${hrFunction.title}`,
        description: `Navigating to ${hrFunction.title} dashboard...`,
      });
      
      onNavigate(hrFunction.route);
    } catch (error: any) {
      onError({
        code: error.code || 'NAVIGATION_ERROR',
        message: `Failed to navigate to ${hrFunction.title}: ${error.message}`
      });
    }
  }, [onNavigate, onError, toast]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent, hrFunction: HRFunction) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFunctionClick(hrFunction);
    }
  }, [handleFunctionClick]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'setup_required':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'maintenance':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'medium':
        return <TrendingUp className="h-3 w-3 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  const filteredFunctions = hrFunctions.filter(func =>
    func.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    func.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <BriefcaseMedical className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading HR Functions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BriefcaseMedical className="h-5 w-5" />
            HR Functions Dashboard
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search HR functions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {metrics.activeEmployees} Active Employees
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* HR Functions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFunctions.map((hrFunction) => (
          <Card
            key={hrFunction.id}
            role="button"
            tabIndex={0}
            className="cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => handleFunctionClick(hrFunction)}
            onKeyDown={(e) => handleKeyPress(e, hrFunction)}
            aria-label={`Open ${hrFunction.title} - ${hrFunction.description}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <hrFunction.icon className="h-4 w-4" />
                {hrFunction.title}
                <div className="ml-auto flex items-center gap-1">
                  {getPriorityIcon(hrFunction.priority)}
                  {hrFunction.count !== undefined && hrFunction.count > 0 && (
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {hrFunction.count}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {hrFunction.description}
              </p>
              <div className="flex items-center justify-between">
                <Badge className={`text-xs border ${getStatusColor(hrFunction.status)}`}>
                  {hrFunction.status === 'active' ? 'Active' : 
                   hrFunction.status === 'setup_required' ? 'Setup Required' : 
                   'Maintenance'}
                </Badge>
                <Button 
                  size="sm" 
                  className="hover:scale-105 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFunctionClick(hrFunction);
                  }}
                >
                  Access
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFunctions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No HR functions found</p>
          <p className="text-sm">Try adjusting your search terms</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-muted-foreground">Active Staff</p>
            <p className="text-xl font-bold">{metrics.activeEmployees}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-muted-foreground">Pending Leave</p>
            <p className="text-xl font-bold">{metrics.pendingTimeOff}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-muted-foreground">Payroll Ready</p>
            <p className="text-xl font-bold">{metrics.upcomingPayroll}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <BriefcaseMedical className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-sm text-muted-foreground">Benefits</p>
            <p className="text-xl font-bold">{metrics.benefitEnrollments}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <Shield className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-muted-foreground">Permissions</p>
            <p className="text-xl font-bold">{metrics.permissionUpdates}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <UserPlus className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-sm text-muted-foreground">Onboarding</p>
            <p className="text-xl font-bold">{metrics.pendingOnboarding}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};