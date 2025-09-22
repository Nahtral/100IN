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
  MessageCircle,
  Target,
  CreditCard,
  School
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
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { useAnalytics } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';
import RoleSwitcher from '@/components/RoleSwitcher';

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const { trackUserAction } = useAnalytics();
  const { isSuperAdmin, hasRole, loading, initialized } = useOptimizedAuth();
  const { isTestMode, effectiveIsSuperAdmin, testHasRole, testCanAccessMedical, testCanAccessPartners } = useRoleSwitcher();

  // Use effective permissions based on test mode for non-restricted items only
  const actualHasRole = (role: string) => isTestMode ? testHasRole(role) : hasRole(role);
  const actualCanAccessMedical = () => isTestMode ? testCanAccessMedical() : (isSuperAdmin() || hasRole('medical'));
  const actualCanAccessPartners = () => isTestMode ? testCanAccessPartners() : (isSuperAdmin() || hasRole('partner'));

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
      title: 'Teams',
      href: '/teams',
      icon: Trophy,
      showCondition: () => isSuperAdmin() || actualHasRole('staff') || actualHasRole('coach'),
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
      showCondition: () => isSuperAdmin(),
    },
    {
      title: 'Medical',
      href: '/medical',
      icon: Shield,
      showCondition: () => actualCanAccessMedical(),
    },
    {
      title: 'Health & Wellness',
      href: '/health-wellness',
      icon: Heart,
      showForAll: true,
    },
    {
      title: 'Partners',
      href: '/partners',
      icon: Handshake,
      showCondition: () => actualCanAccessPartners(),
    },
    {
      title: 'Chat',
      href: '/chat',
      icon: MessageCircle,
      showForAll: true,
    },
    {
      title: 'Security',
      href: '/security',
      icon: Shield,
      showCondition: () => isSuperAdmin(),
    },
    {
      title: 'News',
      href: '/news',
      icon: Newspaper,
      showForAll: true,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      showForAll: true,
    },
  ];

  const internalToolsItems = [
    {
      title: 'TeamGrid',
      href: '/teamgrid',
      icon: Users,
      showCondition: () => isSuperAdmin() || actualHasRole('staff') || actualHasRole('coach'),
    },
  ];

  const superAdminItems = [
    {
      title: 'ShotIQ',
      href: '/shotiq',
      icon: Target,
    },
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
      title: 'Tryout Rubric',
      href: '/admin/tryouts',
      icon: Trophy,
    },
    {
      title: 'News Manager',
      href: '/news-manager',
      icon: Newspaper,
    },
    {
      title: 'Exposure Portal',
      href: '/exposure-portal',
      icon: School,
    },
    {
      title: 'Membership Types',
      href: '/membership-types',
      icon: CreditCard,
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

  // Show loading state until roles are initialized
  if (!initialized || loading) {
    return (
      <Sidebar className={cn(
        "border-r border-border bg-background",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent>
          <div className={cn(
            "flex items-center gap-3 p-4 border-b border-border",
            collapsed ? "justify-center" : "justify-start"
          )}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1">
              <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-black" style={{ textShadow: '1px 1px 0px #B38F54, -1px -1px 0px #B38F54, 1px -1px 0px #B38F54, -1px 1px 0px #B38F54' }}>Panthers</h1>
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            )}
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }
  
  return (
    <Sidebar 
      side="left"
      variant="sidebar"
      collapsible="icon"
      className={cn(
        "border-r border-border bg-background transition-all duration-300 z-50",
        // Mobile-first: full width drawer on mobile, sidebar on desktop
        "data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full",
        "md:data-[state=closed]:translate-x-0",
        collapsed ? "md:w-16" : "md:w-64"
      )}
      style={{ 
        paddingTop: 'var(--safe-area-inset-top)',
        paddingBottom: 'var(--safe-area-inset-bottom)' 
      }}
    >
      <SidebarContent>
        {/* Mobile-optimized Logo/Brand Section */}
        <div className={cn(
          "flex items-center gap-3 p-4 border-b border-border safe-area-inset-top",
          collapsed ? "md:justify-center" : "justify-start"
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1 flex-shrink-0">
            <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-black leading-tight" style={{ textShadow: '1px 1px 0px #B38F54, -1px -1px 0px #B38F54, 1px -1px 0px #B38F54, -1px 1px 0px #B38F54' }}>Panthers</h1>
              <p className="text-sm text-muted-foreground truncate">100IN</p>
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
                           className={({ isActive }) => cn(
                             "mobile-nav-item touch-target transition-colors duration-200 rounded-lg",
                             "flex items-center gap-3 px-3 py-3 min-h-[48px]",
                             isActive 
                               ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                               : "text-black hover:bg-accent hover:text-accent-foreground"
                           )}
                       onClick={() => handleNavClick(item.title)}
                     >
                       <item.icon className="h-5 w-5 flex-shrink-0" />
                       {(!collapsed || isMobile) && (
                         <span className="truncate font-medium text-base">{item.title}</span>
                       )}
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Internal Tools Section */}
        {(isSuperAdmin() || actualHasRole('staff') || actualHasRole('coach')) && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Internal Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {internalToolsItems.filter(shouldShowItem).map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                        <NavLink
                          to={item.href}
                           className={({ isActive }) => cn(
                             "mobile-nav-item touch-target transition-colors duration-200 rounded-lg",
                             "flex items-center gap-3 px-3 py-3 min-h-[48px]",
                             isActive 
                               ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                               : "text-black hover:bg-accent hover:text-accent-foreground"
                           )}
                         onClick={() => handleNavClick(item.title)}
                       >
                         <item.icon className="h-5 w-5 flex-shrink-0" />
                         {(!collapsed || isMobile) && (
                           <span className="truncate font-medium text-base">{item.title}</span>
                         )}
                       </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Super Admin Section */}
        {isSuperAdmin() && (
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
                           className={({ isActive }) => cn(
                             "mobile-nav-item touch-target transition-colors duration-200 rounded-lg",
                             "flex items-center gap-3 px-3 py-3 min-h-[48px]",
                             isActive 
                               ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                               : "text-black hover:bg-accent hover:text-accent-foreground"
                           )}
                         onClick={() => handleNavClick(item.title)}
                       >
                         <item.icon className="h-5 w-5 flex-shrink-0" />
                         {(!collapsed || isMobile) && (
                           <span className="truncate font-medium text-base">{item.title}</span>
                         )}
                       </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Role Switcher for Super Admin */}
        {isSuperAdmin && (!collapsed || isMobile) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-3 py-2">
                <RoleSwitcher />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}