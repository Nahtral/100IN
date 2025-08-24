import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBellProps {
  onClick?: () => void;
  size?: 'sm' | 'default' | 'lg';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  onClick, 
  size = 'default' 
}) => {
  const { unreadCount } = useNotifications();
  
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  
  return (
    <Button 
      variant="ghost" 
      size={size}
      className="relative"
      onClick={onClick}
    >
      <Bell size={iconSize} />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};