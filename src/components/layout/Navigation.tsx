
import React, { useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Link, useLocation } from 'react-router-dom';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAnalytics } from '@/hooks/useAnalytics';

const Navigation = () => {
  const location = useLocation();
  const { trackUserAction } = useAnalytics();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSuperAdmin, hasRole, loading, initialized } = useOptimizedAuth();

  const navItems = [
    {
      title: 'Home',
      href: '/',
      icon: Home,
      showForAll: true
    },
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      showForAll: true
    },
    {
      title: 'Players',
      href: '/players',
      icon: Users,
      showForAll: false,
      showCondition: () => isSuperAdmin || hasRole('staff') || hasRole('coach') || hasRole('player')
    },
    {
      title: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      showForAll: false,
      showCondition: () => isSuperAdmin || hasRole('staff') || hasRole('coach') || hasRole('player')
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      showForAll: false,
      showCondition: () => isSuperAdmin
    },
    {
      title: 'Medical',
      href: '/medical',
      icon: Heart,
      showForAll: false,
      showCondition: () => canAccessMedical()
    },
    {
      title: 'Health & Wellness',
      href: '/health-wellness',
      icon: Activity,
      showForAll: false,
      showCondition: () => isSuperAdmin || hasRole('medical') || hasRole('staff') || hasRole('coach') || hasRole('player')
    },
    {
      title: 'Partners',
      href: '/partners',
      icon: Handshake,
      showForAll: false,
      showCondition: () => canAccessPartners()
    },
    {
      title: 'Chat',
      href: '/chat',
      icon: MessageCircle,
      showForAll: false,
      showCondition: () => isSuperAdmin || hasRole('staff') || hasRole('coach') || hasRole('player')
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      showForAll: true
    }
  ];

  // Add super admin only items
  const superAdminItems = [
    {
      title: 'User Management',
      href: '/user-management',
      icon: Shield
    },
    {
      title: 'Evaluations',
      href: '/evaluations',
      icon: Brain
    },
    {
      title: 'News Manager',
      href: '/news-manager',
      icon: Newspaper
    }
  ];

  return (
    <nav className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">
              100IN
            </h1>
            <p className="text-xs text-gray-600">Panthers Basketball</p>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            // Check if item should be shown - wait for initialization
            const shouldShow = item.showForAll || (item.showCondition && initialized && !loading && item.showCondition());
            
            if (!shouldShow) return null;
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-orange-100 text-orange-700 border-r-2 border-orange-500" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </li>
            );
          })}
          
          {/* Super Admin only items */}
          {initialized && !loading && isSuperAdmin && (
            <>
              <li className="pt-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
                  Administration
                </div>
              </li>
              {superAdminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-orange-100 text-orange-700 border-r-2 border-orange-500" 
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
