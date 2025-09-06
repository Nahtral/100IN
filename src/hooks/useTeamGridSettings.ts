import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from './useOptimizedAuth';

export interface TeamGridSettings {
  id: string;
  default_view: string;
  visible_columns: string[];
  sort_by: string;
  sort_direction: string;
  page_size: number;
  allow_manual_players: boolean;
  allow_bulk_import: boolean;
  enable_archived_filter: boolean;
  accent_color: string;
}

const DEFAULT_SETTINGS: Omit<TeamGridSettings, 'id'> = {
  default_view: 'grid',
  visible_columns: ['name', 'team', 'role', 'status', 'age', 'contact', 'attendance'],
  sort_by: 'name',
  sort_direction: 'asc',
  page_size: 25,
  allow_manual_players: true,
  allow_bulk_import: true,
  enable_archived_filter: false,
  accent_color: '#0066cc'
};

export const useTeamGridSettings = () => {
  const [settings, setSettings] = useState<TeamGridSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSuperAdmin } = useUserRole();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isSuperAdmin) {
        // Non-super admins get default settings
        setSettings({
          id: 'default',
          ...DEFAULT_SETTINGS
        });
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('teamgrid_settings')
        .select('*')
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No rows found, use defaults
          setSettings({
            id: 'default',
            ...DEFAULT_SETTINGS
          });
        } else {
          throw fetchError;
        }
      } else {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching teamgrid settings:', error);
      setError(error.message || 'Failed to load settings');
      // Fallback to default settings on error
      setSettings({
        id: 'default',
        ...DEFAULT_SETTINGS
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [isSuperAdmin]);

  const updateSettings = async (updates: Partial<TeamGridSettings>) => {
    if (!settings || !isSuperAdmin) return false;

    try {
      const { error: updateError } = await supabase
        .from('teamgrid_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (updateError) throw updateError;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error: any) {
      console.error('Error updating teamgrid settings:', error);
      setError(error.message || 'Failed to update settings');
      return false;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings
  };
};