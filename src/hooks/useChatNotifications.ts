import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useChatNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create notification sound
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio();
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L2vWwhBTWM2fTMeSsFJHjH79mPOQ0XZLfx6p9MEQ1Nr+XzxXktBTGE0/LFeyYGLIHOo2EcBj6S2fPTeSUFLIHO8diJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L2vWwhBTWM2fTMeSsFJHjH79mPOQ0XZLfx6p9MEQ1Nr+XzxXktBTGE0/LFeyYGLIHO';
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages for chats the user is part of
    const messageSubscription = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Don't notify for messages sent by the current user
          if (newMessage.sender_id === user.id) return;

          // Check if user is part of this chat
          const { data: chatParticipant } = await supabase
            .from('chat_participants')
            .select('chat_id, chats!inner(name, chat_type)')
            .eq('user_id', user.id)
            .eq('chat_id', newMessage.chat_id)
            .single();

          if (!chatParticipant) return;

          // Get sender info
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newMessage.sender_id)
            .single();

          const senderName = senderProfile?.full_name || senderProfile?.email || 'Someone';
          const chatName = (chatParticipant.chats as any)?.name || 'Chat';
          
          // Play notification sound
          if (audioRef.current) {
            try {
              audioRef.current.currentTime = 0;
              await audioRef.current.play();
            } catch (error) {
              console.log('Could not play notification sound:', error);
            }
          }

          // Show toast notification
          toast({
            title: `New message from ${senderName}`,
            description: `${chatName}: ${newMessage.content.substring(0, 100)}${newMessage.content.length > 100 ? '...' : ''}`,
            duration: 5000,
          });

          // Browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${senderName} in ${chatName}`, {
              body: newMessage.content,
              icon: '/favicon.ico',
              tag: `chat-${newMessage.chat_id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [user, toast]);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  return {
    requestNotificationPermission,
  };
};