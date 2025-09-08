import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X, 
  Clock, 
  AlertTriangle, 
  MoreVertical, 
  Settings,
  Archive,
  ExternalLink,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { notificationSound, showDesktopNotification } from '@/utils/notificationSound';

const getIconForCategory = (category: string, iconName?: string) => {
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
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead, 
  onMarkAsUnread, 
  onDelete 
}) => {
  const Icon = getIconForCategory(
    notification.type_category || '',
    notification.type_icon
  );

  const handleMainClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-b border-border hover:bg-accent/50 transition-colors",
        !notification.is_read && "bg-primary/5 border-l-4 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          getPriorityColor(notification.priority),
          !notification.is_read ? "bg-primary/10" : "bg-muted"
        )}>
          <Icon size={16} />
        </div>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleMainClick}>
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
            
            {notification.type_category && (
              <Badge variant="outline" className="text-xs">
                {notification.type_category}
              </Badge>
            )}
          </div>
        </div>

        {/* Kebab menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!notification.is_read ? (
              <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                <Check size={14} className="mr-2" />
                Mark as read
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onMarkAsUnread(notification.id)}>
                <RotateCcw size={14} className="mr-2" />
                Mark as unread
              </DropdownMenuItem>
            )}
            
            {notification.action_url && (
              <DropdownMenuItem onClick={() => window.open(notification.action_url!, '_blank')}>
                <ExternalLink size={14} className="mr-2" />
                Open related page
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem 
              onClick={() => onDelete(notification.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export const EnhancedNotificationCenter: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    hasMore,
    markAsRead, 
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    loadMore
  } = useNotifications();
  const { preferences } = useNotificationPreferences();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  // Handle notification sound and desktop notifications
  React.useEffect(() => {
    const handleNewNotification = (newNotification: Notification) => {
      if (!preferences) return;

      const shouldPlaySound = preferences.sound_enabled && 
                            preferences.severity_filters.includes(newNotification.priority) &&
                            !preferences.mute_until || new Date(preferences.mute_until) <= new Date();

      if (shouldPlaySound) {
        notificationSound.playIfActive();
      }

      const shouldShowDesktop = preferences.desktop_push_enabled &&
                              preferences.severity_filters.includes(newNotification.priority) &&
                              Notification.permission === 'granted';

      if (shouldShowDesktop) {
        showDesktopNotification(
          newNotification.title,
          newNotification.message,
          newNotification.action_url || undefined
        );
      }
    };

    // This would be called from the realtime subscription in useNotifications
    // For now, it's just a placeholder for the logic
  }, [preferences]);

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
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings/notifications')}
                className="hidden" // Hide settings for players in notifications
              >
                <Settings size={14} />
              </Button>
              
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
                      onMarkAsUnread={markAsUnread}
                      onDelete={deleteNotification}
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
                  {readNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onMarkAsUnread={markAsUnread}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="p-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};