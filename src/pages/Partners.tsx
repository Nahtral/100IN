
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Handshake, Plus, Edit, Trash2, DollarSign, Users, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import * as z from 'zod';

// Since we don't have a partners table, we'll simulate partner data
interface Partner {
  id: string;
  name: string;
  type: 'sponsor' | 'vendor' | 'community' | 'media';
  status: 'active' | 'inactive' | 'pending';
  contract_value?: number;
  contact_person: string;
  contact_email: string;
  contact_phone?: string;
  start_date: string;
  end_date?: string;
  description?: string;
  created_at: string;
}

const partnerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['sponsor', 'vendor', 'community', 'media']),
  status: z.enum(['active', 'inactive', 'pending']),
  contract_value: z.string().optional(),
  contact_person: z.string().min(2, 'Contact person is required'),
  contact_email: z.string().email('Valid email is required'),
  contact_phone: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

type PartnerFormData = z.infer<typeof partnerFormSchema>;

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || "Partner Manager",
    role: "Partner Manager",
    avatar: user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') || "PM"
  };

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      name: '',
      type: 'sponsor',
      status: 'active',
      contact_person: '',
      contact_email: '',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  // Simulate partner data since we don't have a real table
  useEffect(() => {
    setLoading(true);
    // Simulate loading with sample data
    setTimeout(() => {
      const samplePartners: Partner[] = [
        {
          id: '1',
          name: 'SportsTech Solutions',
          type: 'sponsor',
          status: 'active',
          contract_value: 25000,
          contact_person: 'John Smith',
          contact_email: 'john@sportstech.com',
          contact_phone: '(555) 123-4567',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          description: 'Main equipment sponsor for the season',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Local Sports Store',
          type: 'vendor',
          status: 'active',
          contract_value: 5000,
          contact_person: 'Sarah Johnson',
          contact_email: 'sarah@localsports.com',
          start_date: '2024-03-01',
          description: 'Uniform and accessories provider',
          created_at: '2024-03-01T00:00:00Z'
        },
        {
          id: '3',
          name: 'Community Center',
          type: 'community',
          status: 'active',
          contact_person: 'Mike Wilson',
          contact_email: 'mike@community.org',
          start_date: '2024-01-15',
          description: 'Practice facility partnership',
          created_at: '2024-01-15T00:00:00Z'
        }
      ];
      setPartners(samplePartners);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSubmit = async (formData: PartnerFormData) => {
    setIsSubmitting(true);
    try {
      const partnerData: Partner = {
        id: editingPartner?.id || Date.now().toString(),
        name: formData.name,
        type: formData.type,
        status: formData.status,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : undefined,
        contact_person: formData.contact_person,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
        created_at: editingPartner?.created_at || new Date().toISOString(),
      };

      if (editingPartner) {
        setPartners(prev => prev.map(p => p.id === editingPartner.id ? partnerData : p));
        toast({
          title: "Success",
          description: "Partner updated successfully.",
        });
      } else {
        setPartners(prev => [partnerData, ...prev]);
        toast({
          title: "Success",
          description: "Partner added successfully.",
        });
      }

      setIsFormOpen(false);
      setEditingPartner(null);
      form.reset();
    } catch (error) {
      console.error('Error saving partner:', error);
      toast({
        title: "Error",
        description: "Failed to save partner.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (partnerId: string) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;

    try {
      setPartners(prev => prev.filter(p => p.id !== partnerId));
      toast({
        title: "Success",
        description: "Partner deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting partner:', error);
      toast({
        title: "Error",
        description: "Failed to delete partner.",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (partner: Partner) => {
    setEditingPartner(partner);
    form.reset({
      name: partner.name,
      type: partner.type,
      status: partner.status,
      contract_value: partner.contract_value?.toString(),
      contact_person: partner.contact_person,
      contact_email: partner.contact_email,
      contact_phone: partner.contact_phone,
      start_date: partner.start_date,
      end_date: partner.end_date,
      description: partner.description,
    });
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setEditingPartner(null);
    form.reset({
      name: '',
      type: 'sponsor',
      status: 'active',
      contact_person: '',
      contact_email: '',
      start_date: new Date().toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'sponsor': return <Badge className="bg-blue-100 text-blue-800">Sponsor</Badge>;
      case 'vendor': return <Badge className="bg-purple-100 text-purple-800">Vendor</Badge>;
      case 'community': return <Badge className="bg-orange-100 text-orange-800">Community</Badge>;
      case 'media': return <Badge className="bg-pink-100 text-pink-800">Media</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalContractValue = partners
    .filter(p => p.contract_value && p.status === 'active')
    .reduce((sum, p) => sum + (p.contract_value || 0), 0);

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partners</h1>
            <p className="text-gray-600">Sponsorship and partnership management</p>
          </div>
          {isSuperAdmin && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddForm} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Partner
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partner Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter partner name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sponsor">Sponsor</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="community">Community</SelectItem>
                              <SelectItem value="media">Media</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contract_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Value ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact person" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter partnership description" 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save Partner"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Partners</p>
                  <p className="text-2xl font-bold">{partners.length}</p>
                </div>
                <Handshake className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Partners</p>
                  <p className="text-2xl font-bold text-green-600">
                    {partners.filter(p => p.status === 'active').length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contract Value</p>
                  <p className="text-2xl font-bold">${totalContractValue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {partners.filter(p => p.status === 'pending').length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Active Partnerships ({partners.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading partners...</p>
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No partners found. Add your first partner to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Contract Value</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{partner.name}</p>
                            {partner.description && (
                              <p className="text-sm text-gray-600">{partner.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(partner.type)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(partner.status)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{partner.contact_person}</p>
                            <p className="text-sm text-gray-600">{partner.contact_email}</p>
                            {partner.contact_phone && (
                              <p className="text-sm text-gray-600">{partner.contact_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {partner.contract_value ? (
                            <span className="font-semibold text-green-600">
                              ${partner.contract_value.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{partner.start_date}</p>
                            {partner.end_date && (
                              <p className="text-gray-600">to {partner.end_date}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditForm(partner)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(partner.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Partners;
