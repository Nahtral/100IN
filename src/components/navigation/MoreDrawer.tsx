import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { NavLink } from 'react-router-dom';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { 
  Activity, 
  BarChart3, 
  Heart, 
  Handshake, 
  MessageSquare, 
  Settings, 
  Briefcase,
  Target,
  Users2,
  ClipboardList,
  Newspaper,
  UserCog,
  ToggleLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import RoleSwitcher from '@/components/RoleSwitcher';
import { cn } from '@/lib/utils';

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoreDrawer: React.FC<MoreDrawerProps> = ({ isOpen, onClose }) => {
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const { 
    isTestMode, 
    effectiveIsSuperAdmin, 
    testCanAccessMedical, 
    testCanAccessPartners,
    canSwitchRoles 
  } = useRoleSwitcher();

  // Determine actual permissions based on test mode
  const actualIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const actualCanAccessMedical = isTestMode ? testCanAccessMedical() : (isSuperAdmin() || hasRole('medical'));
  const actualCanAccessPartners = isTestMode ? testCanAccessPartners() : (isSuperAdmin() || hasRole('partner'));
  const actualCanAccessHR = isTestMode ? 
    (effectiveIsSuperAdmin || hasRole('staff') || hasRole('coach')) : 
    (isSuperAdmin || hasRole('staff') || hasRole('coach'));

  const moreItems = [
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      description: 'Team performance metrics',
      showCondition: () => actualIsSuperAdmin
    },
    {
      title: 'Health & Wellness',
      href: '/health-wellness',
      icon: Activity,
      description: 'Player health tracking',
      showForAll: true
    },
    {
      title: 'Medical',
      href: '/medical',
      icon: Heart,
      description: 'Medical management',
      showCondition: () => actualCanAccessMedical
    },
    {
      title: 'Partners',
      href: '/partners',
      icon: Handshake,
      description: 'Partnership management',
      showCondition: () => actualCanAccessPartners
    },
    {
      title: 'Chat',
      href: '/chat',
      icon: MessageSquare,
      description: 'Team communication',
      showForAll: true
    },
    {
      title: 'TeamGrid',
      href: '/teamgrid',
      icon: Briefcase,
      description: 'Team management',
      showCondition: () => actualCanAccessHR
    },
    {
      title: 'ShotIQ',
      href: '/shotiq',
      icon: Target,
      description: 'Shot analysis tool',
      showForAll: true
    },
    {
      title: 'User Management',
      href: '/user-management',
      icon: Users2,
      description: 'Manage users',
      showCondition: () => actualIsSuperAdmin
    },
    {
      title: 'Evaluations',
      href: '/evaluations',
      icon: ClipboardList,
      description: 'Player evaluations',
      showCondition: () => actualIsSuperAdmin
    },
    {
      title: 'News Manager',
      href: '/news-manager',
      icon: Newspaper,
      description: 'Manage news posts',
      showCondition: () => actualIsSuperAdmin
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'App preferences',
      showForAll: true
    }
  ];

  const shouldShowItem = (item: any) => {
    if (item.showForAll) return true;
    if (item.showCondition) return item.showCondition();
    return false;
  };

  const visibleItems = moreItems.filter(shouldShowItem);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="text-center border-b border-border">
          <DrawerTitle className="text-xl font-bold">More Options</DrawerTitle>
          <DrawerDescription>
            Additional features and settings
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="p-4 overflow-y-auto">
          <div className="grid gap-3 max-w-md mx-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) => cn(
                    "flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all duration-200 touch-target",
                    isActive && "bg-primary/10 border-primary/20"
                  )}
                >
                  <div className="flex-shrink-0">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </NavLink>
              );
            })}
            
            {/* Role Switcher for Super Admin */}
            {canSwitchRoles && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-3 mb-3">
                  <ToggleLeft size={20} className="text-primary" />
                  <h3 className="font-semibold text-foreground">Role Testing</h3>
                </div>
                <RoleSwitcher />
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};