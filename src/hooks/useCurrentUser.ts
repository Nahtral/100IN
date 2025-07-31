import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';

export const useCurrentUser = () => {
  const { user } = useAuth();
  const { userRole, isSuperAdmin, loading } = useUserRole();
  const { isTestMode, effectiveRole, effectiveIsSuperAdmin } = useRoleSwitcher();

  // Use effective role/admin status if in test mode, otherwise use actual role
  const actualIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const actualRole = isTestMode ? effectiveRole : userRole;

  // For super admin, always show "Super Admin" regardless of other roles
  // This ensures consistent role display across all pages
  const displayRole = actualIsSuperAdmin ? 'Super Admin' : (actualRole ? actualRole.charAt(0).toUpperCase() + actualRole.slice(1) : 'User');
  
  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || 'User',
    role: displayRole,
    avatar: user?.user_metadata?.full_name 
      ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
      : 'U'
  };

  return { currentUser, loading };
};