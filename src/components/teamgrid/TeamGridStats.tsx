import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, Calendar, FileText } from 'lucide-react';
import { TeamGridStats as StatsType } from '@/hooks/useTeamGridData';

interface TeamGridStatsProps {
  stats: StatsType;
  loading: boolean;
  onStatClick: (section: string) => void;
  accessLevel: 'super_admin' | 'staff' | 'employee' | 'denied';
}

const StatCard = ({ title, value, icon: Icon, color, onClick, disabled }: {
  title: string;
  value: number;
  icon: any;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Card 
    className={`card-enhanced transition-all duration-200 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
    }`} 
    onClick={disabled ? undefined : onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </CardContent>
  </Card>
);

export const TeamGridStats = ({ stats, loading, onStatClick, accessLevel }: TeamGridStatsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isClickable = accessLevel === 'super_admin';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Employees"
        value={stats.totalEmployees}
        icon={Users}
        color="text-primary"
        onClick={() => onStatClick('employees-detail')}
        disabled={!isClickable}
      />
      <StatCard
        title="Active Time Off"
        value={stats.activeTimeOff}
        icon={Calendar}
        color="text-secondary"
        onClick={() => onStatClick('timeoff')}
        disabled={!isClickable}
      />
      <StatCard
        title="Pending Payslips"
        value={stats.pendingPayslips}
        icon={FileText}
        color="text-orange-500"
        onClick={() => onStatClick('payroll')}
        disabled={!isClickable}
      />
      <StatCard
        title="Today's Hours"
        value={stats.todaysHours}
        icon={Clock}
        color="text-green-500"
        onClick={() => onStatClick('timetracking')}
      />
    </div>
  );
};