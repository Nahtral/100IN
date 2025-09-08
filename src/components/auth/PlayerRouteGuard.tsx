import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useToast } from '@/hooks/use-toast';

interface PlayerRouteGuardProps {
  children: React.ReactNode;
}

// Routes that players are NOT allowed to access
const PLAYER_RESTRICTED_ROUTES = [
  '/analytics',
  '/medical',
  '/partners',
  '/user-management',
  '/evaluations',
  '/news-manager',
  '/security',
  '/membership-types',
  '/admin',
  '/staff-management',
  '/tryout-rubric',
  '/teamgrid',
  '/shotiq',
  '/settings',
  '/health-wellness',
  '/chat',
  '/news',
  '/teams'
];

// Routes that players ARE allowed to access
const PLAYER_ALLOWED_ROUTES = [
  '/',
  '/dashboard',
  '/players',
  '/schedule',
  '/auth'
];

export const PlayerRouteGuard: React.FC<PlayerRouteGuardProps> = ({ children }) => {
  const { primaryRole, isSuperAdmin, loading, initialized } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const isPlayerRole = primaryRole === 'player' && !isSuperAdmin();

  useEffect(() => {
    if (!initialized || loading) return;

    // Only apply restrictions to players
    if (!isPlayerRole) return;

    const currentPath = location.pathname;
    
    // Check if the current route is explicitly restricted for players
    const isRestrictedRoute = PLAYER_RESTRICTED_ROUTES.some(route => 
      currentPath.startsWith(route)
    );

    // Check if the current route is in the allowed list
    const isAllowedRoute = PLAYER_ALLOWED_ROUTES.some(route => 
      currentPath === route || (route === '/' && currentPath === '/')
    );

    // If it's a restricted route or not in allowed routes, redirect
    if (isRestrictedRoute || (!isAllowedRoute && currentPath !== '/auth')) {
      console.warn(`Player attempted to access restricted route: ${currentPath}`);
      
      toast({
        title: "Access Denied",
        description: "You are not authorized to access this page.",
        variant: "destructive",
      });

      navigate('/dashboard', { replace: true });
    }
  }, [isPlayerRole, location.pathname, navigate, toast, initialized, loading]);

  // If we're still loading, show the children (loading state will be handled elsewhere)
  if (loading || !initialized) {
    return <>{children}</>;
  }

  // For players, only render children if on allowed routes
  if (isPlayerRole) {
    const currentPath = location.pathname;
    const isAllowedRoute = PLAYER_ALLOWED_ROUTES.some(route => 
      currentPath === route || currentPath.startsWith('/dashboard') || currentPath.startsWith('/players') || currentPath.startsWith('/schedule')
    );

    if (!isAllowedRoute) {
      return null; // Don't render anything for restricted routes
    }
  }

  return <>{children}</>;
};