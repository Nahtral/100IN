import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, BarChart3, Users, Calendar, Menu } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { cn } from '@/lib/utils';

interface BottomTabNavProps {
  onMoreClick: () => void;
}

export const BottomTabNav: React.FC<BottomTabNavProps> = ({ onMoreClick }) => {
  const location = useLocation();
  const { initialized } = useUserRole();
  const { isTestMode, effectiveRole } = useRoleSwitcher();

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
      showForAll: true
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/dashboard',
      showForAll: true
    },
    {
      id: 'players',
      label: 'Players',
      icon: Users,
      path: '/players',
      showForAll: true
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      path: '/schedule',
      showForAll: true
    }
  ];

  const isActiveTab = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  if (!initialized) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-border safe-area-inset-bottom md:bg-black lg:bg-black">
        <div className="flex justify-around items-center h-16">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center w-16 h-12">
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
              <div className="w-8 h-2 bg-muted rounded mt-1 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black backdrop-blur border-t border-border z-50 safe-area-inset-bottom md:bg-black lg:bg-black">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isActiveTab(tab.path);
          
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 touch-target",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon size={20} className={isActive ? "text-primary" : ""} />
              <span className={cn(
                "text-xs font-medium mt-1",
                isActive ? "text-primary" : ""
              )}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
        
        {/* More button */}
        <button
          onClick={onMoreClick}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 touch-target",
            "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <Menu size={20} />
          <span className="text-xs font-medium mt-1">More</span>
        </button>
      </div>
    </nav>
  );
};