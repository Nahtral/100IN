import { useState, useEffect } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';

export type TestRole = 'super_admin' | 'staff' | 'coach' | 'player' | 'parent' | 'medical' | 'partner';

export const useRoleSwitcher = () => {
  const { isSuperAdmin, primaryRole } = useOptimizedAuth();
  const [testRole, setTestRole] = useState<TestRole | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  // Only super admins can use role switching
  const canSwitchRoles = isSuperAdmin();

  // Reset test mode when user is not super admin
  useEffect(() => {
    if (!isSuperAdmin()) {
      setTestRole(null);
      setIsTestMode(false);
    }
  }, [isSuperAdmin]);

  const switchToRole = (role: TestRole) => {
    if (!canSwitchRoles) return;
    setTestRole(role);
    setIsTestMode(true);
  };

  const exitTestMode = () => {
    setTestRole(null);
    setIsTestMode(false);
  };

  // Return effective role for testing (but preserve super admin status in display)
  const effectiveRole = isTestMode && testRole ? testRole : primaryRole;
  const effectiveIsSuperAdmin = isTestMode ? testRole === 'super_admin' : isSuperAdmin();

  // Mock role checking functions for test mode
  const testHasRole = (role: string) => {
    if (!isTestMode) return false;
    return testRole === role;
  };

  const testCanAccessMedical = () => {
    if (!isTestMode) return false;
    return testRole === 'super_admin' || testRole === 'medical';
  };

  const testCanAccessPartners = () => {
    if (!isTestMode) return false;
    return testRole === 'super_admin' || testRole === 'partner';
  };

  return {
    canSwitchRoles,
    isTestMode,
    testRole,
    effectiveRole,
    effectiveIsSuperAdmin,
    switchToRole,
    exitTestMode,
    testHasRole,
    testCanAccessMedical,
    testCanAccessPartners
  };
};