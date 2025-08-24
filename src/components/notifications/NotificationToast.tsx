import React, { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export const NotificationToastProvider: React.FC = () => {
  const { notifications } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for new urgent notifications to show as toasts
    const recentNotifications = notifications.filter(n => {
      const isRecent = new Date(n.created_at) > new Date(Date.now() - 5000); // Last 5 seconds
      const isUrgent = ['high', 'urgent'].includes(n.priority);
      return isRecent && isUrgent && !n.is_read;
    });

    recentNotifications.forEach(notification => {
      toast({
        title: notification.title,
        description: notification.message,
        action: notification.action_url ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              window.location.href = notification.action_url!;
            }}
          >
            View
          </Button>
        ) : undefined,
        duration: notification.priority === 'urgent' ? 10000 : 5000,
      });
    });
  }, [notifications, toast]);

  return null; // This is a provider component, no UI
};