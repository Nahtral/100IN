
import React from 'react';
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
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

const Navigation = () => {
  const location = useLocation();
  const { isSuperAdmin, loading } = useUserRole();

  const navItems = [
    {
      title: 'Home',
      href: '/',
      icon: Home
    },
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3
    },
    {
      title: 'Players',
      href: '/players',
      icon: Users
    },
    {
      title: 'Schedule',
      href: '/schedule',
      icon: Calendar
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3
    },
    {
      title: 'Medical',
      href: '/medical',
      icon: Heart
    },
    {
      title: 'Partners',
      href: '/partners',
      icon: Handshake
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings
    }
  ];

  // Add Evaluations for super admins only
  const superAdminItems = [
    {
      title: 'Evaluations',
      href: '/evaluations',
      icon: Brain
    }
  ];

  return (
    <nav className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Court Vision
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
          {!loading && isSuperAdmin && (
            <>
              <li className="pt-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
                  Super Admin
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
