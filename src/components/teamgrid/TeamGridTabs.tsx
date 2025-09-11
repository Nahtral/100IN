import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamGridStats } from './TeamGridStats';
import { TeamGridDashboard } from './TeamGridDashboard';
import { 
  LazySecureEmployeeList,
  LazyTimeTracking,
  LazyTimeOffManagement,
  LazyPayrollDashboard,
  LazyBenefitsManagement,
  LazyOnboardingTasks,
  LazyEmployeeScheduling
} from './LazyHRComponents';
import { TeamGridStats as StatsType } from '@/hooks/useTeamGridData';

interface TeamGridTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  accessLevel: 'super_admin' | 'staff' | 'employee' | 'denied';
  stats: StatsType;
  employees: any[];
  loading: boolean;
  onStatClick: (section: string) => void;
  onStatsUpdate: () => void;
  onEmployeeDetailClick: () => void;
}

export const TeamGridTabs = ({
  activeTab,
  onTabChange,
  accessLevel,
  stats,
  employees,
  loading,
  onStatClick,
  onStatsUpdate,
  onEmployeeDetailClick
}: TeamGridTabsProps) => {
  // Set appropriate default tab for access level
  React.useEffect(() => {
    if (accessLevel === 'super_admin' && activeTab === 'timetracking') {
      onTabChange('dashboard');
    }
  }, [accessLevel, activeTab, onTabChange]);
  const getTabsConfig = () => {
    const baseTabs = [
      { value: 'timetracking', label: 'Time Tracking' },
      { value: 'timeoff', label: 'Time Off' },
      { value: 'onboarding', label: 'Onboarding' },
      { value: 'scheduling', label: 'Scheduling' }
    ];

    if (accessLevel === 'super_admin') {
      return [
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'employees', label: 'Employees' },
        ...baseTabs,
        { value: 'payroll', label: 'Payroll' },
        { value: 'benefits', label: 'Benefits' }
      ];
    }

    return baseTabs;
  };

  const tabsConfig = getTabsConfig();
  const gridCols = accessLevel === 'super_admin' ? 'grid-cols-8' : 'grid-cols-4';

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
      <TabsList className={`grid w-full ${gridCols}`}>
        {tabsConfig.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {accessLevel === 'super_admin' && (
        <TabsContent value="dashboard" className="space-y-6">
          <TeamGridStats
            stats={stats}
            loading={loading}
            onStatClick={onStatClick}
            accessLevel={accessLevel}
          />
          <TeamGridDashboard 
            stats={stats}
            employees={employees}
            onEmployeeDetailClick={onEmployeeDetailClick}
          />
        </TabsContent>
      )}

      {accessLevel === 'super_admin' && (
        <TabsContent value="employees">
          <LazySecureEmployeeList onStatsUpdate={onStatsUpdate} />
        </TabsContent>
      )}

      <TabsContent value="timetracking">
        <LazyTimeTracking onStatsUpdate={onStatsUpdate} />
      </TabsContent>

      <TabsContent value="timeoff">
        <LazyTimeOffManagement onStatsUpdate={onStatsUpdate} />
      </TabsContent>

      {accessLevel === 'super_admin' && (
        <TabsContent value="payroll">
          <LazyPayrollDashboard onStatsUpdate={onStatsUpdate} />
        </TabsContent>
      )}

      {accessLevel === 'super_admin' && (
        <TabsContent value="benefits">
          <LazyBenefitsManagement onStatsUpdate={onStatsUpdate} />
        </TabsContent>
      )}

      <TabsContent value="onboarding">
        <LazyOnboardingTasks onStatsUpdate={onStatsUpdate} />
      </TabsContent>

      <TabsContent value="scheduling">
        <LazyEmployeeScheduling onStatsUpdate={onStatsUpdate} />
      </TabsContent>
    </Tabs>
  );
};