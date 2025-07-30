import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export const useCurrentUser = () => {
  const { user } = useAuth();
  const { userRole, isSuperAdmin, loading } = useUserRole();

  // Priority order for role display: super_admin > actual user role > fallback
  const displayRole = isSuperAdmin ? 'Super Admin' : (userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User');
  
  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || 'User',
    role: displayRole,
    avatar: user?.user_metadata?.full_name 
      ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
      : 'U'
  };

  return { currentUser, loading };
};