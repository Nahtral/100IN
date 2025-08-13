import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Handshake, 
  Plus, 
  Edit, 
  Trash2, 
  Building2, 
  DollarSign, 
  Calendar,
  Users,
  FileText,
  Search
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PartnerOrganization {
  id: string;
  name: string;
  partnership_type: string;
  partnership_status: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  partnership_value: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamSponsorship {
  id: string;
  partner_organization_id: string;
  team_id: string;
  sponsorship_type: string;
  sponsorship_amount: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  partner_organizations: { name: string; partnership_type: string };
  teams: { name: string; age_group: string };
}

interface Team {
  id: string;
  name: string;
  age_group: string;
  season: string;
}

const PartnershipManagement = () => {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  
  const [partners, setPartners] = useState<PartnerOrganization[]>([]);
  const [sponsorships, setSponsorships] = useState<TeamSponsorship[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('partners');
  
  const [editingPartner, setEditingPartner] = useState<PartnerOrganization | null>(null);
  const [editingSponsorship, setEditingSponsorship] = useState<TeamSponsorship | null>(null);
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [showSponsorshipDialog, setShowSponsorshipDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch partner organizations
      const { data: partnersData, error: partnersError } = await supabase
        .from('partner_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      // Fetch sponsorships with partner and team details
      const { data: sponsorshipsData, error: sponsorshipsError } = await supabase
        .from('partner_team_sponsorships')
        .select(`
          *,
          partner_organizations!inner(name, partnership_type),
          teams!inner(name, age_group)
        `)
        .order('created_at', { ascending: false });

      if (sponsorshipsError) throw sponsorshipsError;

      // Fetch teams for dropdown
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, age_group, season')
        .order('name');

      if (teamsError) throw teamsError;

      setPartners(partnersData || []);
      setSponsorships(sponsorshipsData || []);
      setTeams(teamsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load partnership data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePartner = async (formData: FormData) => {
    try {
      const partnerData: any = {
        name: formData.get('name') as string,
        partnership_type: formData.get('partnership_type') as string,
        partnership_status: formData.get('partnership_status') as string,
        contact_person: (formData.get('contact_person') as string) || null,
        contact_email: (formData.get('contact_email') as string) || null,
        contact_phone: (formData.get('contact_phone') as string) || null,
        partnership_value: formData.get('partnership_value') ? Number(formData.get('partnership_value')) : null,
        contract_start_date: (formData.get('contract_start_date') as string) || null,
        contract_end_date: (formData.get('contract_end_date') as string) || null,
        description: (formData.get('description') as string) || null,
      };

      if (editingPartner) {
        const { error } = await supabase
          .from('partner_organizations')
          .update(partnerData)
          .eq('id', editingPartner.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('partner_organizations')
          .insert(partnerData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Partnership ${editingPartner ? 'updated' : 'created'} successfully.`,
      });

      setShowPartnerDialog(false);
      setEditingPartner(null);
      fetchData();
    } catch (error) {
      console.error('Error saving partner:', error);
      toast({
        title: "Error",
        description: "Failed to save partnership details.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSponsorship = async (formData: FormData) => {
    try {
      const sponsorshipData = {
        partner_organization_id: formData.get('partner_organization_id') as string,
        team_id: formData.get('team_id') as string,
        sponsorship_type: formData.get('sponsorship_type') as string,
        sponsorship_amount: formData.get('sponsorship_amount') ? Number(formData.get('sponsorship_amount')) : null,
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string || null,
        status: formData.get('status') as string,
      };

      if (editingSponsorship) {
        const { error } = await supabase
          .from('partner_team_sponsorships')
          .update(sponsorshipData)
          .eq('id', editingSponsorship.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('partner_team_sponsorships')
          .insert([sponsorshipData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Sponsorship ${editingSponsorship ? 'updated' : 'created'} successfully.`,
      });

      setShowSponsorshipDialog(false);
      setEditingSponsorship(null);
      fetchData();
    } catch (error) {
      console.error('Error saving sponsorship:', error);
      toast({
        title: "Error",
        description: "Failed to save sponsorship details.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm('Are you sure you want to delete this partnership? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('partner_organizations')
        .delete()
        .eq('id', partnerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Partnership deleted successfully.",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting partner:', error);
      toast({
        title: "Error",
        description: "Failed to delete partnership.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSponsorship = async (sponsorshipId: string) => {
    if (!confirm('Are you sure you want to delete this sponsorship? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('partner_team_sponsorships')
        .delete()
        .eq('id', sponsorshipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sponsorship deleted successfully.",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting sponsorship:', error);
      toast({
        title: "Error",
        description: "Failed to delete sponsorship.",
        variant: "destructive",
      });
    }
  };

  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.partnership_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSponsorships = sponsorships.filter(sponsorship =>
    sponsorship.partner_organizations.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sponsorship.teams.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl mb-4 animate-pulse">
              <Handshake className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Partnership Management</h2>
            <p className="text-gray-600">Loading partnership data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <RoleProtectedRoute allowedRoles={['super_admin']}>
      <Layout currentUser={currentUser}>
        <div className="mobile-section">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="mobile-title text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
                Partnership Management
              </h1>
              <p className="text-muted-foreground mt-2 mobile-text">
                Manage partner organizations and sponsorship agreements
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search partnerships or sponsorships..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="partners" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Partner Organizations ({partners.length})
              </TabsTrigger>
              <TabsTrigger value="sponsorships" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Sponsorship Agreements ({sponsorships.length})
              </TabsTrigger>
            </TabsList>

            {/* Partner Organizations Tab */}
            <TabsContent value="partners" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Partner Organizations</h2>
                <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setEditingPartner(null);
                        setShowPartnerDialog(true);
                      }}
                      className="mobile-btn bg-gradient-to-r from-blue-500 to-blue-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Partner
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPartner ? 'Edit Partner Organization' : 'Add New Partner Organization'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleSavePartner(new FormData(e.currentTarget));
                    }} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Organization Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            defaultValue={editingPartner?.name || ''}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="partnership_type">Partnership Type *</Label>
                          <Select name="partnership_type" defaultValue={editingPartner?.partnership_type || ''} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sponsor">Sponsor</SelectItem>
                              <SelectItem value="media_partner">Media Partner</SelectItem>
                              <SelectItem value="equipment_partner">Equipment Partner</SelectItem>
                              <SelectItem value="venue_partner">Venue Partner</SelectItem>
                              <SelectItem value="community_partner">Community Partner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="partnership_status">Status *</Label>
                          <Select name="partnership_status" defaultValue={editingPartner?.partnership_status || 'active'} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="partnership_value">Partnership Value (¥)</Label>
                          <Input
                            id="partnership_value"
                            name="partnership_value"
                            type="number"
                            defaultValue={editingPartner?.partnership_value || ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact_person">Contact Person</Label>
                          <Input
                            id="contact_person"
                            name="contact_person"
                            defaultValue={editingPartner?.contact_person || ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact_email">Contact Email</Label>
                          <Input
                            id="contact_email"
                            name="contact_email"
                            type="email"
                            defaultValue={editingPartner?.contact_email || ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact_phone">Contact Phone</Label>
                          <Input
                            id="contact_phone"
                            name="contact_phone"
                            defaultValue={editingPartner?.contact_phone || ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="contract_start_date">Contract Start Date</Label>
                          <Input
                            id="contract_start_date"
                            name="contract_start_date"
                            type="date"
                            defaultValue={editingPartner?.contract_start_date || ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="contract_end_date">Contract End Date</Label>
                          <Input
                            id="contract_end_date"
                            name="contract_end_date"
                            type="date"
                            defaultValue={editingPartner?.contract_end_date || ''}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          rows={3}
                          defaultValue={editingPartner?.description || ''}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowPartnerDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingPartner ? 'Update' : 'Create'} Partner
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {filteredPartners.map((partner) => (
                  <Card key={partner.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            {partner.name}
                          </CardTitle>
                          <CardDescription>
                            {partner.partnership_type} • {partner.contact_person}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={partner.partnership_status === 'active' ? 'default' : 'secondary'}>
                            {partner.partnership_status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPartner(partner);
                              setShowPartnerDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePartner(partner.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Contact</p>
                          <p>{partner.contact_email}</p>
                          <p>{partner.contact_phone}</p>
                        </div>
                        <div>
                          <p className="font-medium">Value</p>
                          <p>{partner.partnership_value ? `¥${partner.partnership_value.toLocaleString()}` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium">Contract Period</p>
                          <p>{partner.contract_start_date} - {partner.contract_end_date || 'Ongoing'}</p>
                        </div>
                      </div>
                      {partner.description && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">{partner.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Sponsorship Agreements Tab */}
            <TabsContent value="sponsorships" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Sponsorship Agreements</h2>
                <Dialog open={showSponsorshipDialog} onOpenChange={setShowSponsorshipDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setEditingSponsorship(null);
                        setShowSponsorshipDialog(true);
                      }}
                      className="mobile-btn bg-gradient-to-r from-green-500 to-green-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sponsorship
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingSponsorship ? 'Edit Sponsorship Agreement' : 'Add New Sponsorship Agreement'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSponsorship(new FormData(e.currentTarget));
                    }} className="space-y-4">
                      <div>
                        <Label htmlFor="partner_organization_id">Partner Organization *</Label>
                        <Select name="partner_organization_id" defaultValue={editingSponsorship?.partner_organization_id || ''} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select partner" />
                          </SelectTrigger>
                          <SelectContent>
                            {partners.map((partner) => (
                              <SelectItem key={partner.id} value={partner.id}>
                                {partner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="team_id">Team *</Label>
                        <Select name="team_id" defaultValue={editingSponsorship?.team_id || ''} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name} {team.age_group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="sponsorship_type">Type *</Label>
                          <Select name="sponsorship_type" defaultValue={editingSponsorship?.sponsorship_type || ''} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="financial">Financial</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="venue">Venue</SelectItem>
                              <SelectItem value="services">Services</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="status">Status *</Label>
                          <Select name="status" defaultValue={editingSponsorship?.status || 'active'} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="sponsorship_amount">Sponsorship Amount (¥)</Label>
                        <Input
                          id="sponsorship_amount"
                          name="sponsorship_amount"
                          type="number"
                          defaultValue={editingSponsorship?.sponsorship_amount || ''}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_date">Start Date *</Label>
                          <Input
                            id="start_date"
                            name="start_date"
                            type="date"
                            defaultValue={editingSponsorship?.start_date || ''}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="end_date">End Date</Label>
                          <Input
                            id="end_date"
                            name="end_date"
                            type="date"
                            defaultValue={editingSponsorship?.end_date || ''}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowSponsorshipDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingSponsorship ? 'Update' : 'Create'} Sponsorship
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {filteredSponsorships.map((sponsorship) => (
                  <Card key={sponsorship.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            {sponsorship.partner_organizations.name} → {sponsorship.teams.name} {sponsorship.teams.age_group}
                          </CardTitle>
                          <CardDescription>
                            {sponsorship.sponsorship_type} sponsorship
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={sponsorship.status === 'active' ? 'default' : 'secondary'}>
                            {sponsorship.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSponsorship(sponsorship);
                              setShowSponsorshipDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSponsorship(sponsorship.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Amount</p>
                          <p>{sponsorship.sponsorship_amount ? `¥${sponsorship.sponsorship_amount.toLocaleString()}` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium">Period</p>
                          <p>{sponsorship.start_date} - {sponsorship.end_date || 'Ongoing'}</p>
                        </div>
                        <div>
                          <p className="font-medium">Type</p>
                          <p className="capitalize">{sponsorship.sponsorship_type}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </RoleProtectedRoute>
  );
};

export default PartnershipManagement;