import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { TeamGridSettingsButton } from './TeamGridSettingsButton';

interface TeamGridHeaderProps {
  accessLevel: 'super_admin' | 'staff' | 'employee' | 'denied';
  onAddEmployee: () => void;
}

export const TeamGridHeader = ({ accessLevel, onAddEmployee }: TeamGridHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold gradient-text">TeamGrid</h1>
        <p className="text-muted-foreground">
          {accessLevel === 'super_admin' 
            ? 'Employee management system' 
            : accessLevel === 'staff'
            ? 'Staff portal'
            : 'Employee self-service portal'
          }
        </p>
      </div>
      
      {accessLevel === 'super_admin' && (
        <div className="flex gap-2">
          <Button onClick={onAddEmployee} className="btn-panthers">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
          <TeamGridSettingsButton variant="outline" />
        </div>
      )}
    </div>
  );
};