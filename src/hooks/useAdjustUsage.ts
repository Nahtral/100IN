import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdjustUsage = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const adjustUsage = async (membershipId: string, delta: number, reason: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('membership_adjustments')
        .insert({
          player_membership_id: membershipId,
          delta: delta,
          reason: reason,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Class usage ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}`,
      });

      return true;
    } catch (error) {
      console.error('Error adjusting usage:', error);
      toast({
        title: "Error",
        description: "Failed to adjust class usage",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { adjustUsage, loading };
};