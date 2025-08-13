import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Calendar, Building2, FileText, Users, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';

interface MedicalOrganization {
  id: string;
  name: string;
  organization_type: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: any;
  license_number: string | null;
  license_expiry_date: string | null;
  specialties: string[] | null;
  partnership_type: string;
  partnership_status: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  partnership_value: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface MedicalAgreement {
  id: string;
  medical_organization_id: string;
  agreement_type: string;
  agreement_name: string;
  start_date: string;
  end_date: string | null;
  monthly_fee: number | null;
  per_visit_fee: number | null;
  emergency_fee: number | null;
  terms: string | null;
  status: string;
  auto_renewal: boolean;
  created_at: string;
  updated_at: string;
  medical_organizations?: { name: string };
}

const MedicalManagement = () => {
  const [medicalOrgs, setMedicalOrgs] = useState<MedicalOrganization[]>([]);
  const [agreements, setAgreements] = useState<MedicalAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<MedicalOrganization | null>(null);
  const [editingAgreement, setEditingAgreement] = useState<MedicalAgreement | null>(null);
  const { toast } = useToast();
  const currentUser = useCurrentUser();

  const [orgForm, setOrgForm] = useState({
    name: '',
    organization_type: 'clinic',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: { street: '', city: '', state: '', zip: '', country: '' },
    license_number: '',
    license_expiry_date: '',
    specialties: [] as string[],
    partnership_type: 'preferred_provider',
    partnership_status: 'active',
    contract_start_date: '',
    contract_end_date: '',
    partnership_value: '',
    description: ''
  });

  const [agreementForm, setAgreementForm] = useState({
    medical_organization_id: '',
    agreement_type: 'service_contract',
    agreement_name: '',
    start_date: '',
    end_date: '',
    monthly_fee: '',
    per_visit_fee: '',
    emergency_fee: '',
    terms: '',
    status: 'active',
    auto_renewal: false
  });

  useEffect(() => {
    fetchMedicalOrganizations();
    fetchMedicalAgreements();
  }, []);

  const fetchMedicalOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedicalOrgs(data || []);
    } catch (error) {
      console.error('Error fetching medical organizations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medical organizations",
        variant: "destructive"
      });
    }
  };

  const fetchMedicalAgreements = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_agreements')
        .select(`
          *,
          medical_organizations (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      console.error('Error fetching medical agreements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medical agreements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_organizations')
        .insert([{
          ...orgForm,
          partnership_value: orgForm.partnership_value ? parseFloat(orgForm.partnership_value) : null,
          contract_start_date: orgForm.contract_start_date || null,
          contract_end_date: orgForm.contract_end_date || null,
          license_expiry_date: orgForm.license_expiry_date || null
        }])
        .select();

      if (error) throw error;

      setMedicalOrgs([...medicalOrgs, data[0]]);
      resetOrgForm();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Medical organization created successfully"
      });
    } catch (error) {
      console.error('Error creating medical organization:', error);
      toast({
        title: "Error",
        description: "Failed to create medical organization",
        variant: "destructive"
      });
    }
  };

  const handleUpdateOrganization = async () => {
    if (!editingOrg) return;

    try {
      const { data, error } = await supabase
        .from('medical_organizations')
        .update({
          ...orgForm,
          partnership_value: orgForm.partnership_value ? parseFloat(orgForm.partnership_value) : null,
          contract_start_date: orgForm.contract_start_date || null,
          contract_end_date: orgForm.contract_end_date || null,
          license_expiry_date: orgForm.license_expiry_date || null
        })
        .eq('id', editingOrg.id)
        .select();

      if (error) throw error;

      setMedicalOrgs(medicalOrgs.map(org => 
        org.id === editingOrg.id ? data[0] : org
      ));
      resetOrgForm();
      setEditingOrg(null);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Medical organization updated successfully"
      });
    } catch (error) {
      console.error('Error updating medical organization:', error);
      toast({
        title: "Error",
        description: "Failed to update medical organization",
        variant: "destructive"
      });
    }
  };

  const handleCreateAgreement = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_agreements')
        .insert([{
          ...agreementForm,
          monthly_fee: agreementForm.monthly_fee ? parseFloat(agreementForm.monthly_fee) : null,
          per_visit_fee: agreementForm.per_visit_fee ? parseFloat(agreementForm.per_visit_fee) : null,
          emergency_fee: agreementForm.emergency_fee ? parseFloat(agreementForm.emergency_fee) : null,
          end_date: agreementForm.end_date || null
        }])
        .select(`
          *,
          medical_organizations (
            name
          )
        `);

      if (error) throw error;

      setAgreements([...agreements, data[0]]);
      resetAgreementForm();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Medical agreement created successfully"
      });
    } catch (error) {
      console.error('Error creating medical agreement:', error);
      toast({
        title: "Error",
        description: "Failed to create medical agreement",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAgreement = async () => {
    if (!editingAgreement) return;

    try {
      const { data, error } = await supabase
        .from('medical_agreements')
        .update({
          ...agreementForm,
          monthly_fee: agreementForm.monthly_fee ? parseFloat(agreementForm.monthly_fee) : null,
          per_visit_fee: agreementForm.per_visit_fee ? parseFloat(agreementForm.per_visit_fee) : null,
          emergency_fee: agreementForm.emergency_fee ? parseFloat(agreementForm.emergency_fee) : null,
          end_date: agreementForm.end_date || null
        })
        .eq('id', editingAgreement.id)
        .select(`
          *,
          medical_organizations (
            name
          )
        `);

      if (error) throw error;

      setAgreements(agreements.map(agreement => 
        agreement.id === editingAgreement.id ? data[0] : agreement
      ));
      resetAgreementForm();
      setEditingAgreement(null);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Medical agreement updated successfully"
      });
    } catch (error) {
      console.error('Error updating medical agreement:', error);
      toast({
        title: "Error",
        description: "Failed to update medical agreement",
        variant: "destructive"
      });
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medical_organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMedicalOrgs(medicalOrgs.filter(org => org.id !== id));
      toast({
        title: "Success",
        description: "Medical organization deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting medical organization:', error);
      toast({
        title: "Error",
        description: "Failed to delete medical organization",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAgreement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medical_agreements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAgreements(agreements.filter(agreement => agreement.id !== id));
      toast({
        title: "Success",
        description: "Medical agreement deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting medical agreement:', error);
      toast({
        title: "Error",
        description: "Failed to delete medical agreement",
        variant: "destructive"
      });
    }
  };

  const resetOrgForm = () => {
    setOrgForm({
      name: '',
      organization_type: 'clinic',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      address: { street: '', city: '', state: '', zip: '', country: '' },
      license_number: '',
      license_expiry_date: '',
      specialties: [],
      partnership_type: 'preferred_provider',
      partnership_status: 'active',
      contract_start_date: '',
      contract_end_date: '',
      partnership_value: '',
      description: ''
    });
  };

  const resetAgreementForm = () => {
    setAgreementForm({
      medical_organization_id: '',
      agreement_type: 'service_contract',
      agreement_name: '',
      start_date: '',
      end_date: '',
      monthly_fee: '',
      per_visit_fee: '',
      emergency_fee: '',
      terms: '',
      status: 'active',
      auto_renewal: false
    });
  };

  const openEditOrgDialog = (org: MedicalOrganization) => {
    setEditingOrg(org);
    setOrgForm({
      name: org.name,
      organization_type: org.organization_type,
      contact_person: org.contact_person || '',
      contact_email: org.contact_email || '',
      contact_phone: org.contact_phone || '',
      address: org.address || { street: '', city: '', state: '', zip: '', country: '' },
      license_number: org.license_number || '',
      license_expiry_date: org.license_expiry_date || '',
      specialties: org.specialties || [],
      partnership_type: org.partnership_type,
      partnership_status: org.partnership_status,
      contract_start_date: org.contract_start_date || '',
      contract_end_date: org.contract_end_date || '',
      partnership_value: org.partnership_value?.toString() || '',
      description: org.description || ''
    });
    setIsDialogOpen(true);
  };

  const openEditAgreementDialog = (agreement: MedicalAgreement) => {
    setEditingAgreement(agreement);
    setAgreementForm({
      medical_organization_id: agreement.medical_organization_id,
      agreement_type: agreement.agreement_type,
      agreement_name: agreement.agreement_name,
      start_date: agreement.start_date,
      end_date: agreement.end_date || '',
      monthly_fee: agreement.monthly_fee?.toString() || '',
      per_visit_fee: agreement.per_visit_fee?.toString() || '',
      emergency_fee: agreement.emergency_fee?.toString() || '',
      terms: agreement.terms || '',
      status: agreement.status,
      auto_renewal: agreement.auto_renewal
    });
    setIsDialogOpen(true);
  };

  const filteredMedicalOrgs = medicalOrgs.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.organization_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.contact_person && org.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAgreements = agreements.filter(agreement =>
    agreement.agreement_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agreement.agreement_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agreement.medical_organizations?.name && agreement.medical_organizations.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading || currentUser.loading) {
    return (
      <Layout currentUser={currentUser.loading ? undefined : currentUser.currentUser}>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading medical management...</div>
        </div>
      </Layout>
    );
  }

  return (
    <RoleProtectedRoute allowedRoles={['super_admin', 'medical']}>
      <Layout currentUser={currentUser.currentUser}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Medical Management</h1>
              <p className="text-muted-foreground">
                Manage medical organizations, partnerships, and service agreements
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search medical organizations or agreements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs defaultValue="organizations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="organizations" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Medical Organizations
              </TabsTrigger>
              <TabsTrigger value="agreements" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Service Agreements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organizations" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Medical Organizations</h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        resetOrgForm();
                        setEditingOrg(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingOrg ? 'Edit Medical Organization' : 'Add Medical Organization'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Organization Name *</Label>
                        <Input
                          id="name"
                          value={orgForm.name}
                          onChange={(e) => setOrgForm({...orgForm, name: e.target.value})}
                          placeholder="Medical Center Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organization_type">Type</Label>
                        <Select value={orgForm.organization_type} onValueChange={(value) => setOrgForm({...orgForm, organization_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clinic">Clinic</SelectItem>
                            <SelectItem value="hospital">Hospital</SelectItem>
                            <SelectItem value="urgent_care">Urgent Care</SelectItem>
                            <SelectItem value="specialty_practice">Specialty Practice</SelectItem>
                            <SelectItem value="physical_therapy">Physical Therapy</SelectItem>
                            <SelectItem value="sports_medicine">Sports Medicine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_person">Contact Person</Label>
                        <Input
                          id="contact_person"
                          value={orgForm.contact_person}
                          onChange={(e) => setOrgForm({...orgForm, contact_person: e.target.value})}
                          placeholder="Dr. John Smith"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_email">Contact Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          value={orgForm.contact_email}
                          onChange={(e) => setOrgForm({...orgForm, contact_email: e.target.value})}
                          placeholder="contact@medical.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">Contact Phone</Label>
                        <Input
                          id="contact_phone"
                          value={orgForm.contact_phone}
                          onChange={(e) => setOrgForm({...orgForm, contact_phone: e.target.value})}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="license_number">License Number</Label>
                        <Input
                          id="license_number"
                          value={orgForm.license_number}
                          onChange={(e) => setOrgForm({...orgForm, license_number: e.target.value})}
                          placeholder="Medical License #"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="license_expiry_date">License Expiry</Label>
                        <Input
                          id="license_expiry_date"
                          type="date"
                          value={orgForm.license_expiry_date}
                          onChange={(e) => setOrgForm({...orgForm, license_expiry_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="partnership_type">Partnership Type</Label>
                        <Select value={orgForm.partnership_type} onValueChange={(value) => setOrgForm({...orgForm, partnership_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preferred_provider">Preferred Provider</SelectItem>
                            <SelectItem value="exclusive_partner">Exclusive Partner</SelectItem>
                            <SelectItem value="contracted_service">Contracted Service</SelectItem>
                            <SelectItem value="emergency_only">Emergency Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="partnership_status">Status</Label>
                        <Select value={orgForm.partnership_status} onValueChange={(value) => setOrgForm({...orgForm, partnership_status: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contract_start_date">Contract Start</Label>
                        <Input
                          id="contract_start_date"
                          type="date"
                          value={orgForm.contract_start_date}
                          onChange={(e) => setOrgForm({...orgForm, contract_start_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contract_end_date">Contract End</Label>
                        <Input
                          id="contract_end_date"
                          type="date"
                          value={orgForm.contract_end_date}
                          onChange={(e) => setOrgForm({...orgForm, contract_end_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="partnership_value">Partnership Value ($)</Label>
                        <Input
                          id="partnership_value"
                          type="number"
                          value={orgForm.partnership_value}
                          onChange={(e) => setOrgForm({...orgForm, partnership_value: e.target.value})}
                          placeholder="50000"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={orgForm.description}
                          onChange={(e) => setOrgForm({...orgForm, description: e.target.value})}
                          placeholder="Organization description and services..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={editingOrg ? handleUpdateOrganization : handleCreateOrganization}>
                        {editingOrg ? 'Update' : 'Create'} Organization
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {filteredMedicalOrgs.map((org) => (
                  <Card key={org.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5" />
                            {org.name}
                          </CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{org.organization_type}</Badge>
                            <Badge variant={org.partnership_status === 'active' ? 'default' : 'secondary'}>
                              {org.partnership_status}
                            </Badge>
                            <Badge variant="outline">{org.partnership_type}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditOrgDialog(org)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrganization(org.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium">Contact Information</p>
                          <p className="text-sm text-muted-foreground">{org.contact_person}</p>
                          <p className="text-sm text-muted-foreground">{org.contact_email}</p>
                          <p className="text-sm text-muted-foreground">{org.contact_phone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">License Details</p>
                          <p className="text-sm text-muted-foreground">
                            {org.license_number ? `License: ${org.license_number}` : 'No license on file'}
                          </p>
                          {org.license_expiry_date && (
                            <p className="text-sm text-muted-foreground">
                              Expires: {new Date(org.license_expiry_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Partnership Details</p>
                          {org.partnership_value && (
                            <p className="text-sm text-muted-foreground">
                              Value: ${org.partnership_value.toLocaleString()}
                            </p>
                          )}
                          {org.contract_start_date && (
                            <p className="text-sm text-muted-foreground">
                              Contract: {new Date(org.contract_start_date).toLocaleDateString()} - 
                              {org.contract_end_date ? new Date(org.contract_end_date).toLocaleDateString() : 'Ongoing'}
                            </p>
                          )}
                        </div>
                      </div>
                      {org.description && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">{org.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="agreements" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Service Agreements</h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        resetAgreementForm();
                        setEditingAgreement(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Agreement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAgreement ? 'Edit Medical Agreement' : 'Add Medical Agreement'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="medical_organization_id">Medical Organization *</Label>
                        <Select value={agreementForm.medical_organization_id} onValueChange={(value) => setAgreementForm({...agreementForm, medical_organization_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicalOrgs.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agreement_type">Agreement Type</Label>
                        <Select value={agreementForm.agreement_type} onValueChange={(value) => setAgreementForm({...agreementForm, agreement_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="service_contract">Service Contract</SelectItem>
                            <SelectItem value="retainer_agreement">Retainer Agreement</SelectItem>
                            <SelectItem value="per_visit_agreement">Per Visit Agreement</SelectItem>
                            <SelectItem value="emergency_services">Emergency Services</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="agreement_name">Agreement Name *</Label>
                        <Input
                          id="agreement_name"
                          value={agreementForm.agreement_name}
                          onChange={(e) => setAgreementForm({...agreementForm, agreement_name: e.target.value})}
                          placeholder="Annual Medical Services Agreement"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={agreementForm.start_date}
                          onChange={(e) => setAgreementForm({...agreementForm, start_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={agreementForm.end_date}
                          onChange={(e) => setAgreementForm({...agreementForm, end_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthly_fee">Monthly Fee ($)</Label>
                        <Input
                          id="monthly_fee"
                          type="number"
                          value={agreementForm.monthly_fee}
                          onChange={(e) => setAgreementForm({...agreementForm, monthly_fee: e.target.value})}
                          placeholder="2500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="per_visit_fee">Per Visit Fee ($)</Label>
                        <Input
                          id="per_visit_fee"
                          type="number"
                          value={agreementForm.per_visit_fee}
                          onChange={(e) => setAgreementForm({...agreementForm, per_visit_fee: e.target.value})}
                          placeholder="150"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_fee">Emergency Fee ($)</Label>
                        <Input
                          id="emergency_fee"
                          type="number"
                          value={agreementForm.emergency_fee}
                          onChange={(e) => setAgreementForm({...agreementForm, emergency_fee: e.target.value})}
                          placeholder="500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={agreementForm.status} onValueChange={(value) => setAgreementForm({...agreementForm, status: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="terms">Terms & Conditions</Label>
                        <Textarea
                          id="terms"
                          value={agreementForm.terms}
                          onChange={(e) => setAgreementForm({...agreementForm, terms: e.target.value})}
                          placeholder="Agreement terms and conditions..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={editingAgreement ? handleUpdateAgreement : handleCreateAgreement}>
                        {editingAgreement ? 'Update' : 'Create'} Agreement
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {filteredAgreements.map((agreement) => (
                  <Card key={agreement.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {agreement.agreement_name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {agreement.medical_organizations?.name}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{agreement.agreement_type}</Badge>
                            <Badge variant={agreement.status === 'active' ? 'default' : 'secondary'}>
                              {agreement.status}
                            </Badge>
                            {agreement.auto_renewal && (
                              <Badge variant="outline">Auto-Renewal</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditAgreementDialog(agreement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAgreement(agreement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium">Agreement Period</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(agreement.start_date).toLocaleDateString()} - 
                            {agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'Ongoing'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Fee Structure</p>
                          {agreement.monthly_fee && (
                            <p className="text-sm text-muted-foreground">
                              Monthly: ${agreement.monthly_fee.toLocaleString()}
                            </p>
                          )}
                          {agreement.per_visit_fee && (
                            <p className="text-sm text-muted-foreground">
                              Per Visit: ${agreement.per_visit_fee.toLocaleString()}
                            </p>
                          )}
                          {agreement.emergency_fee && (
                            <p className="text-sm text-muted-foreground">
                              Emergency: ${agreement.emergency_fee.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Agreement Details</p>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(agreement.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Updated: {new Date(agreement.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {agreement.terms && (
                        <div className="mt-4">
                          <p className="text-sm font-medium">Terms</p>
                          <p className="text-sm text-muted-foreground">{agreement.terms}</p>
                        </div>
                      )}
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

export default MedicalManagement;