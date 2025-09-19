import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InjuryBreakdownItem {
  type: string;
  count: number;
  percentage: number;
  location: string;
}

export interface InjuryBreakdownData {
  breakdown: InjuryBreakdownItem[];
  total_injuries: number;
  active_injuries: number;
  timeframe_days: number;
}

export interface InjuryPlayer {
  player_id: string;
  player_name: string;
  injury_type: string;
  severity: string;
  date_occurred: string;
  status: string;
  team_name: string;
}

export const useInjuryBreakdown = (timeframeDays: number = 30) => {
  const [data, setData] = useState<InjuryBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInjuryBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: injuryData, error: injuryError } = await supabase.rpc(
        'rpc_get_injury_breakdown' as any,
        { days_back: timeframeDays }
      );

      if (injuryError) {
        throw injuryError;
      }

      const parsedData = injuryData as InjuryBreakdownData;
      setData(parsedData || {
        breakdown: [],
        total_injuries: 0,
        active_injuries: 0,
        timeframe_days: timeframeDays
      });
    } catch (error: any) {
      console.error('Error fetching injury breakdown:', error);
      setError(error.message || 'Failed to fetch injury data');
      
      // Show user-friendly error message
      if (error.message?.includes('Access denied')) {
        toast({
          title: "Access Denied",
          description: "Only medical staff can view injury analytics",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load injury analytics data",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInjuryBreakdown();
  }, [timeframeDays]);

  return {
    data,
    loading,
    error,
    refetch: fetchInjuryBreakdown
  };
};

export const useInjuryPlayers = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPlayersWithInjury = async (
    injuryLocation: string, 
    timeframeDays: number = 30
  ): Promise<InjuryPlayer[]> => {
    try {
      setLoading(true);

      const { data: playersData, error } = await supabase.rpc(
        'rpc_get_players_with_injury' as any,
        { 
          injury_location_param: injuryLocation, 
          days_back: timeframeDays 
        }
      );

      if (error) {
        throw error;
      }

      return (playersData as InjuryPlayer[]) || [];
    } catch (error: any) {
      console.error('Error fetching players with injury:', error);
      
      if (error.message?.includes('Access denied')) {
        toast({
          title: "Access Denied",
          description: "Only medical staff can view player injury details",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load player injury details",
          variant: "destructive"
        });
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchPlayersWithInjury,
    loading
  };
};