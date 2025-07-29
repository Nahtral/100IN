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
  Newspaper,
  MessageCircle
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
      title: 'Chat',
      href: '/chat',
      icon: MessageCircle,
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
      "border-r border-border bg-background transition-all duration-300",
      collapsed ? "w-14" : "w-64",
      isMobile && "fixed inset-y-0 left-0 z-50"
    )}>
      <SidebarContent>
        {/* Mobile-optimized Logo/Brand Section */}
        <div className={cn(
          "flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-border min-h-[60px]",
          collapsed ? "justify-center" : "justify-start"
        )}>
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-white p-1">
            <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base sm:text-lg font-bold text-primary">Panthers</h1>
              <p className="text-xs text-muted-foreground">Court Connect</p>
            </div>
          )}
        </div>

        {/* Mobile-optimized Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-xs sm:text-sm px-3 sm:px-4"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.filter(shouldShowItem).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild className="min-h-[44px] sm:min-h-[48px]">
                    <NavLink
                      to={item.href}
                      className={({ isActive }) => cn(
                        "mobile-nav-item w-full",
                        getNavClassName(isActive)
                      )}
                      onClick={() => handleNavClick(item.title)}
                    >
                      <item.icon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                      {!collapsed && <span className="text-sm sm:text-base font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Mobile-optimized Super Admin Section */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : "text-xs sm:text-sm px-3 sm:px-4"}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className="min-h-[44px] sm:min-h-[48px]">
                      <NavLink
                        to={item.href}
                        className={({ isActive }) => cn(
                          "mobile-nav-item w-full",
                          getNavClassName(isActive)
                        )}
                        onClick={() => handleNavClick(item.title)}
                      >
                        <item.icon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                        {!collapsed && <span className="text-sm sm:text-base font-medium">{item.title}</span>}
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