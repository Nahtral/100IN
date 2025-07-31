import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube, X } from 'lucide-react';
import { useRoleSwitcher, TestRole } from '@/hooks/useRoleSwitcher';

const RoleSwitcher = () => {
  const {
    canSwitchRoles,
    isTestMode,
    testRole,
    switchToRole,
    exitTestMode
  } = useRoleSwitcher();

  if (!canSwitchRoles) {
    return null;
  }

  const testRoles: { value: TestRole; label: string }[] = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'staff', label: 'Staff' },
    { value: 'coach', label: 'Coach' },
    { value: 'player', label: 'Player' },
    { value: 'parent', label: 'Parent' },
    { value: 'medical', label: 'Medical' },
    { value: 'partner', label: 'Partner' }
  ];

  return (
    <Card className="border-dashed border-yellow-400 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-yellow-800">
          <TestTube className="h-4 w-4" />
          Role Testing Mode
          {isTestMode && (
            <Badge variant="outline" className="text-yellow-700 border-yellow-400">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isTestMode ? (
          <div className="flex items-center justify-between">
            <div className="text-sm">
              Testing as: <Badge variant="secondary">{testRole}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exitTestMode}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Exit Test Mode
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-yellow-800">
              Test as role:
            </label>
            <Select onValueChange={(value) => switchToRole(value as TestRole)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select role to test" />
              </SelectTrigger>
              <SelectContent>
                {testRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-yellow-700">
              Switch roles to test different user permissions and views.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoleSwitcher;