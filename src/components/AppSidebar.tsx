import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Trophy,
  Activity,
  Heart,
  Handshake,
  Shield,
  Brain,
  Newspaper
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalytics } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const { trackUserAction } = useAnalytics();
  const { isSuperAdmin, hasRole, canAccessMedical, canAccessPartners } = useUserRole();

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
      showForAll: true,
    },
    {
      title: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      showForAll: true,
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      showCondition: () => isSuperAdmin || hasRole('staff') || hasRole('coach'),
    },
    {
      title: 'Health & Wellness',
      href: '/health-wellness',
      icon: Heart,
      showCondition: () => canAccessMedical(),
    },
    {
      title: 'Medical',
      href: '/medical',
      icon: Shield,
      showCondition: () => canAccessMedical(),
    },
    {
      title: 'Partners',
      href: '/partners',
      icon: Handshake,
      showCondition: () => canAccessPartners(),
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      showForAll: true,
    },
  ];

  const superAdminItems = [
    {
      title: 'User Management',
      href: '/user-management',
      icon: Users,
    },
    {
      title: 'Evaluations',
      href: '/evaluations',
      icon: Brain,
    },
    {
      title: 'News Manager',
      href: '/news-manager',
      icon: Newspaper,
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  
  const getNavClassName = (active: boolean) => cn(
    "transition-colors duration-200",
    active 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground"
  );

  const shouldShowItem = (item: any) => {
    if (item.showForAll) return true;
    if (item.showCondition) return item.showCondition();
    return false;
  };

  const handleNavClick = (title: string) => {
    trackUserAction('navigation_click', 'sidebar', { item: title });
  };

  const collapsed = state === "collapsed";
  
  return (
    <Sidebar className={cn(
      "border-r border-border bg-background",
      collapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent>
        {/* Logo/Brand Section */}
        <div className={cn(
          "flex items-center gap-3 p-4 border-b border-border",
          collapsed ? "justify-center" : "justify-start"
        )}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary p-1">
            <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-primary">Panthers</h1>
              <p className="text-xs text-muted-foreground">Court Connect</p>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.filter(shouldShowItem).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) => getNavClassName(isActive)}
                      onClick={() => handleNavClick(item.title)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) => getNavClassName(isActive)}
                        onClick={() => handleNavClick(item.title)}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}