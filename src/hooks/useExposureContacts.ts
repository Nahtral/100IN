import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  institution_id: string;
  institution_name: string;
  institution_level: 'HS' | 'University';
  institution_country: 'USA' | 'CAN';
  state_province: string;
  city: string;
  conference: string;
  department_id: string;
  department_name: string;
  department_category: 'Admissions' | 'Athletics' | 'Academics' | 'FinancialAid' | 'InternationalOffice' | 'Other';
  sport: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_title: string;
  contact_email: string;
  contact_phone: string;
  verification_status: 'verified' | 'stale' | 'bounced' | 'pending';
  last_verified_at: string;
  data_source: string;
}

interface Filters {
  search_term: string;
  country: string;
  level: string;
  state_province: string;
  sport: string;
  department_category: string;
  verification_status: string;
  sort_by: string;
}

export const useExposureContacts = (filters: Filters) => {
  const [data, setData] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clean filters - remove empty values and convert "all" to empty
      const cleanFilters: any = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '' && value !== 'all') {
          cleanFilters[key] = value;
        }
      });

      const { data: contacts, error: rpcError } = await supabase
        .rpc('rpc_search_contacts', {
          p_filters: cleanFilters,
          p_limit: 100,
          p_offset: 0
        });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setData(contacts || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce the search
    const timeoutId = setTimeout(() => {
      fetchContacts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const refetch = () => {
    fetchContacts();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
};