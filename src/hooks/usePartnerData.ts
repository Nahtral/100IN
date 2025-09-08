import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Partner {
  id: string;
  name: string;
  partnership_type: string;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  partnership_value: number;
  contract_start_date: string;
  contract_end_date: string;
  created_at: string;
  updated_at: string;
  total_sponsorship_value: number;
  total_sponsorships: number;
  active_sponsorships: number;
  earliest_partnership: string;
  latest_partnership: string;
  total_count: number;
}

export interface Sponsorship {
  id: string;
  partner_organization_id: string;
  team_id: string;
  sponsorship_type: string;
  sponsorship_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  partner_name?: string;
  team_name?: string;
}

export interface PartnerAnalytics {
  total_partners: number;
  active_partners: number;
  total_sponsorships: number;
  active_sponsorships: number;
  total_sponsorship_value: number;
  total_partnership_value: number;
  expiring_in_30_days: number;
  by_type: Array<{
    type: string;
    count: number;
    total_value: number;
  }>;
  expiring_timeline: Array<{
    month: string;
    count: number;
    total_value: number;
  }>;
}

export interface PartnerNote {
  id: string;
  partner_organization_id?: string;
  sponsorship_id?: string;
  author_id: string;
  note_body: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export const usePartnerData = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
  const [notes, setNotes] = useState<PartnerNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPartners = async (
    query = '',
    statusFilter = '',
    limit = 25,
    offset = 0
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('rpc_list_partners', {
        q: query,
        status_filter: statusFilter,
        limit_n: limit,
        offset_n: offset,
      });

      if (error) throw error;
      
      setPartners(data || []);
      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch partners';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchSponsorships = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('partner_team_sponsorships')
        .select(`
          *,
          partner_organizations!inner(name),
          teams(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        ...item,
        partner_name: item.partner_organizations?.name,
        team_name: item.teams?.name,
      })) || [];

      setSponsorships(formattedData);
      return formattedData;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch sponsorships';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('rpc_partner_analytics');

      if (error) throw error;
      
      setAnalytics(data as unknown as PartnerAnalytics);
      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch analytics';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (partnerId?: string, sponsorshipId?: string) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('partner_notes')
        .select(`
          *,
          profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false });

      if (partnerId) {
        query = query.eq('partner_organization_id', partnerId);
      }
      if (sponsorshipId) {
        query = query.eq('sponsorship_id', sponsorshipId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        ...item,
        author_name: item.profiles?.full_name,
      })) || [];

      setNotes(formattedData);
      return formattedData;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch notes';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const savePartner = async (partnerData: Partial<Partner>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('rpc_upsert_partner', {
        partner_id: partnerData.id || null,
        partner_name: partnerData.name || '',
        partnership_type: partnerData.partnership_type || 'sponsor',
        partnership_status: partnerData.status || 'active',
        contact_person: partnerData.contact_name || '',
        contact_email: partnerData.contact_email || '',
        contact_phone: partnerData.contact_phone || '',
        description: partnerData.description || '',
        partnership_value: partnerData.partnership_value || 0,
        contract_start_date: partnerData.contract_start_date || null,
        contract_end_date: partnerData.contract_end_date || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Partner ${partnerData.id ? 'updated' : 'created'} successfully`,
      });

      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save partner';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveSponsorship = async (sponsorshipData: Partial<Sponsorship>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('rpc_upsert_sponsorship', {
        sponsorship_id: sponsorshipData.id || null,
        partner_org_id: sponsorshipData.partner_organization_id,
        team_id: sponsorshipData.team_id,
        sponsorship_type: sponsorshipData.sponsorship_type || 'financial',
        sponsorship_amount: sponsorshipData.sponsorship_amount || 0,
        start_date: sponsorshipData.start_date || null,
        end_date: sponsorshipData.end_date || null,
        sponsorship_status: sponsorshipData.status || 'active',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Sponsorship ${sponsorshipData.id ? 'updated' : 'created'} successfully`,
      });

      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save sponsorship';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePartner = async (partnerId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('partner_organizations')
        .delete()
        .eq('id', partnerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Partner deleted successfully',
      });

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete partner';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteSponsorship = async (sponsorshipId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('partner_team_sponsorships')
        .delete()
        .eq('id', sponsorshipId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Sponsorship deleted successfully',
      });

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete sponsorship';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const archivePartner = async (partnerId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('partner_organizations')
        .update({ partnership_status: 'archived' })
        .eq('id', partnerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Partner archived successfully',
      });

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to archive partner';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (partnerId?: string, sponsorshipId?: string, noteBody?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('rpc_add_partner_note', {
        partner_id: partnerId || null,
        sponsorship_id: sponsorshipId || null,
        note_body: noteBody || '',
        is_internal: true,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Note added successfully',
      });

      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add note';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    partners,
    sponsorships,
    analytics,
    notes,
    loading,
    error,
    fetchPartners,
    fetchSponsorships,
    fetchAnalytics,
    fetchNotes,
    savePartner,
    saveSponsorship,
    deletePartner,
    deleteSponsorship,
    archivePartner,
    addNote,
  };
};