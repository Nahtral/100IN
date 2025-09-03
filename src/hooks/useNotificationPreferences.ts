import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  sound_enabled: boolean;
  desktop_push_enabled: boolean;
  mute_until: string | null;
  severity_filters: string[];
  created_at: string;
  updated_at: string;
}

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences if none exist
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            sound_enabled: true,
            desktop_push_enabled: true,
            mute_until: null,
            severity_filters: ['low', 'normal', 'high', 'urgent']
          })
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(newPrefs);
      }
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user || !preferences) return;

    // Optimistic update
    const optimisticUpdate = { ...preferences, ...updates };
    setPreferences(optimisticUpdate);

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setPreferences(data);
      
      toast({
        title: "Success",
        description: "Notification preferences updated",
      });
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      
      // Revert optimistic update
      setPreferences(preferences);
      
      toast({
        title: "Error",
        description: error.message || "Failed to update notification preferences",
        variant: "destructive",
      });
    }
  }, [user, preferences, toast]);

  // Request desktop notification permission
  const requestDesktopPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "This browser doesn't support desktop notifications",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await updatePreferences({ desktop_push_enabled: true });
      return true;
    } else {
      await updatePreferences({ desktop_push_enabled: false });
      toast({
        title: "Permission Denied",
        description: "Desktop notifications permission was denied",
        variant: "destructive",
      });
      return false;
    }
  }, [updatePreferences, toast]);

  // Check if user is currently muted
  const isMuted = useCallback(() => {
    if (!preferences?.mute_until) return false;
    return new Date(preferences.mute_until) > new Date();
  }, [preferences]);

  // Set mute until a specific time
  const muteUntil = useCallback(async (until: Date | null) => {
    await updatePreferences({ 
      mute_until: until ? until.toISOString() : null 
    });
  }, [updatePreferences]);

  // Quick mute presets
  const muteFor = useCallback(async (hours: number) => {
    const until = new Date();
    until.setHours(until.getHours() + hours);
    await muteUntil(until);
  }, [muteUntil]);

  // Check if severity should trigger sound/notification
  const shouldNotify = useCallback((severity: string) => {
    if (!preferences) return false;
    if (isMuted()) return false;
    return preferences.severity_filters.includes(severity);
  }, [preferences, isMuted]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user, fetchPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    requestDesktopPermission,
    isMuted,
    muteUntil,
    muteFor,
    shouldNotify,
    refreshPreferences: fetchPreferences,
  };
};