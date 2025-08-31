import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatPresence, TypingIndicator } from '@/types/chat';

interface UseChatPresenceReturn {
  onlineUsers: ChatPresence[];
  typingUsers: TypingIndicator[];
  setTyping: (chatId: string, typing: boolean) => void;
  updatePresence: (status: 'online' | 'offline') => void;
}

export const useChatPresence = (chatId?: string): UseChatPresenceReturn => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<ChatPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  // Update user presence
  const updatePresence = useCallback(async (status: 'online' | 'offline') => {
    if (!user) return;

    try {
      const presenceData = {
        user_id: user.id,
        online: status === 'online',
        last_seen: new Date().toISOString()
      };

      // Here you would typically use Supabase Realtime Presence
      // For now, we'll simulate with local state
      setOnlineUsers(prev => {
        const filtered = prev.filter(p => p.user_id !== user.id);
        if (status === 'online') {
          return [...filtered, presenceData];
        }
        return filtered;
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user]);

  // Set typing indicator
  const setTyping = useCallback((chatId: string, typing: boolean) => {
    if (!user) return;

    const typingData: TypingIndicator = {
      user_id: user.id,
      chat_id: chatId,
      typing,
      timestamp: Date.now()
    };

    setTypingUsers(prev => {
      const filtered = prev.filter(t => t.user_id !== user.id || t.chat_id !== chatId);
      if (typing) {
        return [...filtered, typingData];
      }
      return filtered;
    });

    // Auto-clear typing indicator after 3 seconds
    if (typing) {
      setTimeout(() => {
        setTypingUsers(prev => 
          prev.filter(t => !(t.user_id === user.id && t.chat_id === chatId))
        );
      }, 3000);
    }
  }, [user]);

  // Set up presence subscription
  useEffect(() => {
    if (!user || !chatId) return;

    const channel = supabase.channel(`presence-${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.keys(state).map(userId => ({
          user_id: userId,
          online: true,
          last_seen: new Date().toISOString()
        }));
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const filtered = prev.filter(p => p.user_id !== key);
          return [...filtered, {
            user_id: key,
            online: true,
            last_seen: new Date().toISOString()
          }];
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => prev.filter(p => p.user_id !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatId]);

  // Update presence on mount/unmount
  useEffect(() => {
    updatePresence('online');
    
    return () => {
      updatePresence('offline');
    };
  }, [updatePresence]);

  return {
    onlineUsers,
    typingUsers: chatId ? typingUsers.filter(t => t.chat_id === chatId) : [],
    setTyping,
    updatePresence
  };
};