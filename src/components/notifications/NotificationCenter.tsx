import React, { useState } from 'react';
import { Bell, Check, CheckCheck, X, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const getIconForCategory = (category: string, iconName?: string) => {
  // Map icon names to actual icons
  const iconMap: { [key: string]: React.ElementType } = {
    'MessageCircle': Bell,
    'AtSign': Bell,
    'Calendar': Clock,
    'Clock': Clock,
    'AlertTriangle': AlertTriangle,
    'Shield': Check,
    'Heart': Bell,
    'BarChart3': Bell,
    'Trophy': Bell,
    'Megaphone': Bell,
    'Users': Bell,
    'DollarSign': Bell,
    'CheckCircle': Check,
    'XCircle': X,
    'AlertCircle': AlertTriangle,
    'CheckSquare': Check,
    'Settings': Bell,
  };

  return iconMap[iconName || 'Bell'] || Bell;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'text-destructive';
    case 'high':
      return 'text-panther-gold';
    case 'normal':
      return 'text-panther-blue';
    case 'low':
      return 'text-muted-foreground';
    default:
      return 'text-panther-blue';
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const Icon = getIconForCategory(
    notification.notification_types?.category || '',
    notification.notification_types?.icon
  );

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors",
        !notification.is_read && "bg-primary/5 border-l-4 border-l-primary"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          getPriorityColor(notification.priority),
          !notification.is_read ? "bg-primary/10" : "bg-muted"
        )}>
          <Icon size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn(
              "text-sm font-medium truncate",
              !notification.is_read && "font-semibold"
            )}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {notification.priority === 'urgent' && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
              {notification.priority === 'high' && (
                <Badge variant="secondary" className="text-xs bg-panther-gold/20 text-panther-gold border-panther-gold/30">
                  High
                </Badge>
              )}
              {!notification.is_read && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
            
            {notification.notification_types && (
              <Badge variant="outline" className="text-xs">
                {notification.notification_types.category}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:w-96">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell size={20} />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} new</Badge>
              )}
            </SheetTitle>
            
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck size={14} className="mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground">No notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              {unreadNotifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2 px-4">
                    New ({unreadNotifications.length})
                  </h3>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                  {readNotifications.length > 0 && <Separator className="my-4" />}
                </div>
              )}
              
              {readNotifications.length > 0 && (
                <div>
                  {unreadNotifications.length > 0 && (
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-4">
                      Earlier
                    </h3>
                  )}
                  {readNotifications.slice(0, 20).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};