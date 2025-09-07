import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Clock,
  Edit,
  Users,
  UserPlus
} from 'lucide-react';

interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employment_status: string;
  hire_date: string;
  payment_type: string;
  hourly_rate?: number;
  salary?: number;
}

interface StaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember;
  onEdit: () => void;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  isOpen,
  onClose,
  staff,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogDescription className="sr-only">
          Staff member details and information for {staff.first_name} {staff.last_name}
        </DialogDescription>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{staff.first_name} {staff.last_name}</h2>
                <p className="text-sm text-muted-foreground">{staff.position} • {staff.department}</p>
              </div>
            </DialogTitle>
            <Button onClick={onEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{staff.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{staff.department}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Employee ID</span>
                    <Badge variant="outline">{staff.employee_id}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hire Date</span>
                    <span className="text-sm">{formatDate(staff.hire_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={staff.employment_status === 'active' ? 'default' : 'secondary'}>
                      {staff.employment_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Type</span>
                    <Badge variant="outline">{staff.payment_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Compensation Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Payment Type</label>
                    <p className="text-lg font-semibold capitalize">{staff.payment_type}</p>
                  </div>
                  
                  {staff.payment_type === 'hourly' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Hourly Rate</label>
                      <p className="text-lg font-semibold">{formatCurrency(staff.hourly_rate)}/hour</p>
                    </div>
                  )}
                  
                  {staff.payment_type === 'salary' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Annual Salary</label>
                      <p className="text-lg font-semibold">{formatCurrency(staff.salary)}/year</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Schedule Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-4 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Schedule management for {staff.first_name} {staff.last_name}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        // Navigate to schedule management for this staff member
                        window.open(`/schedule?staff=${staff.id}`, '_blank');
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      View Full Schedule
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        // Open schedule assignment modal (placeholder for now)
                        alert(`Opening schedule assignment for ${staff.first_name} ${staff.last_name}`);
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Assign Shift
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-4 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Emergency contact management for {staff.first_name} {staff.last_name}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // Open emergency contact form
                        alert(`Opening emergency contact form for ${staff.first_name} ${staff.last_name}`);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Emergency Contact
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        // View existing emergency contacts
                        alert(`Viewing emergency contacts for ${staff.first_name} ${staff.last_name}`);
                      }}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      View Contacts
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};