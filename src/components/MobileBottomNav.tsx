import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Activity, Users, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';

export function MobileBottomNav() {
  const location = useLocation();
  const { isSuperAdmin, hasRole, canAccessMedical, canAccessPartners, loading, initialized } = useUserRole();
  const { isTestMode, effectiveIsSuperAdmin, testHasRole, testCanAccessMedical, testCanAccessPartners } = useRoleSwitcher();

  // Use effective permissions based on test mode
  const actualIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const actualHasRole = (role: string) => isTestMode ? testHasRole(role) : hasRole(role);

  if (!initialized || loading) return null;

  const navItems = [
    {
      title: 'Home',
      href: '/',
      icon: Home,
      showForAll: true,
    },
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: Activity,
      showForAll: true,
    },
    {
      title: 'Players',
      href: '/players',
      icon: Users,
      showCondition: () => actualIsSuperAdmin || actualHasRole('staff') || actualHasRole('coach') || actualHasRole('player'),
    },
    {
      title: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      showCondition: () => actualIsSuperAdmin || actualHasRole('staff') || actualHasRole('coach') || actualHasRole('player'),
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      showForAll: true,
    },
  ];

  const shouldShowItem = (item: any) => {
    if (item.showForAll) return true;
    if (item.showCondition) return item.showCondition();
    return false;
  };

  const visibleItems = navItems.filter(shouldShowItem).slice(0, 5); // Max 5 items for mobile

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 flex-1 max-w-[80px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
              <span className={cn(
                "text-xs font-medium leading-tight",
                isActive && "text-primary"
              )}>
                {item.title}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}