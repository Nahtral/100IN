import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  type_id: string | null;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  expires_at: string | null;
  type_name?: string;
  type_description?: string;
  type_category?: string;
  type_icon?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const lastNotificationSoundRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3'); // We'll add this sound file
    audioRef.current.volume = 0.5;
  }, []);

  // Fetch notifications with pagination
  const fetchNotifications = useCallback(async (offset: number = 0, limit: number = 25) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_notifications_paginated', {
          page_offset: offset,
          page_limit: limit
        });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        type_id: item.type_id,
        title: item.title,
        message: item.message,
        data: item.data,
        read_at: item.read_at,
        is_read: item.is_read,
        priority: item.priority,
        action_url: item.action_url,
        related_entity_type: item.related_entity_type,
        related_entity_id: item.related_entity_id,
        created_at: item.created_at,
        expires_at: item.expires_at,
        type_name: item.type_name,
        type_description: item.type_description,
        type_category: item.type_category,
        type_icon: item.type_icon,
      }));

      if (offset === 0) {
        setNotifications(formattedData);
      } else {
        setNotifications(prev => [...prev, ...formattedData]);
      }

      setHasMore(formattedData.length === limit);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_unread_notification_count');

      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    // Optimistic update
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId 
        ? { ...notif, is_read: true, read_at: new Date().toISOString() }
        : notif
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const { data, error } = await supabase
        .rpc('mark_notification_read', { notification_id: notificationId });

      if (error) throw error;

      if (!data) {
        throw new Error('Failed to mark notification as read');
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      
      // Revert optimistic update
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: false, read_at: null }
          : notif
      ));
      setUnreadCount(prev => prev + 1);

      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Mark notification as unread
  const markAsUnread = useCallback(async (notificationId: string) => {
    if (!user) return;

    // Optimistic update
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId 
        ? { ...notif, is_read: false, read_at: null }
        : notif
    ));
    setUnreadCount(prev => prev + 1);

    try {
      const { data, error } = await supabase
        .rpc('mark_notification_unread', { notification_id: notificationId });

      if (error) throw error;

      if (!data) {
        throw new Error('Failed to mark notification as unread');
      }
    } catch (error: any) {
      console.error('Error marking notification as unread:', error);
      
      // Revert optimistic update
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true, read_at: new Date().toISOString() }
          : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as unread",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    const notification = notifications.find(n => n.id === notificationId);
    
    // Optimistic update
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      const { data, error } = await supabase
        .rpc('delete_notification', { notification_id: notificationId });

      if (error) throw error;

      if (!data) {
        throw new Error('Failed to delete notification');
      }

      toast({
        title: "Success",
        description: "Notification deleted",
      });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      
      // Revert optimistic update
      if (notification) {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.is_read) {
          setUnreadCount(prev => prev + 1);
        }
      }

      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    }
  }, [user, notifications, toast]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    // Optimistic update
    const unreadNotifications = notifications.filter(n => !n.is_read);
    setNotifications(prev => prev.map(notif => ({
      ...notif,
      is_read: true,
      read_at: new Date().toISOString()
    })));
    setUnreadCount(0);

    try {
      const { error } = await supabase
        .rpc('mark_all_notifications_read');

      if (error) throw error;

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      
      // Revert optimistic update
      setNotifications(prev => prev.map(notif => {
        const wasUnread = unreadNotifications.find(un => un.id === notif.id);
        return wasUnread ? { ...notif, is_read: false, read_at: null } : notif;
      }));
      setUnreadCount(unreadNotifications.length);

      toast({
        title: "Error",
        description: error.message || "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  }, [user, notifications, toast]);

  // Load more notifications
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    fetchNotifications(notifications.length, 25);
  }, [notifications.length, hasMore, loading, fetchNotifications]);

  // Play notification sound with debouncing
  const playNotificationSound = useCallback(() => {
    const now = Date.now();
    if (now - lastNotificationSoundRef.current > 1000) { // 1 second debounce
      audioRef.current?.play().catch(e => console.log('Failed to play sound:', e));
      lastNotificationSoundRef.current = now;
    }
  }, []);

  // Create notification (for system use)
  const createNotification = useCallback(async (
    targetUserId: string,
    type: string,
    title: string,
    message: string,
    notificationData: any = {},
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    actionUrl?: string,
    entityType?: string,
    entityId?: string,
    expiryHours?: number
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('create_notification', {
          target_user_id: targetUserId,
          notification_type: type,
          notification_title: title,
          notification_message: message,
          notification_data: notificationData,
          notification_priority: priority,
          notification_action_url: actionUrl,
          entity_type: entityType,
          entity_id: entityId,
          expiry_hours: expiryHours
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          
          // Update unread count
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }

          // Show toast and play sound for high/urgent priority notifications
          if (['high', 'urgent'].includes(newNotification.priority)) {
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
            playNotificationSound();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          setNotifications(prev => prev.map(notif =>
            notif.id === updatedNotification.id ? updatedNotification : notif
          ));

          // Update unread count based on read status change
          const oldNotification = payload.old as Notification;
          if (oldNotification.is_read !== updatedNotification.is_read) {
            if (updatedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const deletedNotification = payload.old as Notification;
          
          setNotifications(prev => prev.filter(notif => notif.id !== deletedNotification.id));
          
          if (!deletedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, playNotificationSound]);

  // Initial data load
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    createNotification,
    loadMore,
    refreshNotifications: () => fetchNotifications(0, 25),
  };
};