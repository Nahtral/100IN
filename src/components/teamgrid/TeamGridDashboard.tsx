import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { TeamGridStats } from '@/hooks/useTeamGridData';

interface TeamGridDashboardProps {
  stats: TeamGridStats;
  employees: any[];
  onEmployeeDetailClick: () => void;
}

export const TeamGridDashboard = ({ stats, employees, onEmployeeDetailClick }: TeamGridDashboardProps) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>No attendance data available</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">¥</span>
              Payroll Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>No payroll data available</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-enhanced cursor-pointer hover:shadow-lg" onClick={onEmployeeDetailClick}>
          <CardHeader>
            <CardTitle>Recent Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employees.length > 0 ? (
                employees.slice(0, 3).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    </div>
                    <Badge variant="secondary">{employee.employment_status}</Badge>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>No recent employees</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle>Recent Time Off Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>No recent requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};