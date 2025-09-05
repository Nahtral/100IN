import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2,
  Calendar,
  Hash,
  Infinity,
  Eye
} from 'lucide-react';

interface MembershipType {
  id: string;
  name: string;
  allocation_type: 'CLASS_COUNT' | 'UNLIMITED' | 'DATE_RANGE';
  allocated_classes: number | null;
  start_date_required: boolean;
  end_date_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MembershipFormData {
  name: string;
  allocation_type: 'CLASS_COUNT' | 'UNLIMITED' | 'DATE_RANGE';
  allocated_classes: number | null;
  start_date_required: boolean;
  end_date_required: boolean;
  is_active: boolean;
}

export const MembershipTypesManagement = () => {
  const { toast } = useToast();
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MembershipType | null>(null);
  const [formData, setFormData] = useState<MembershipFormData>({
    name: '',
    allocation_type: 'CLASS_COUNT',
    allocated_classes: null,
    start_date_required: false,
    end_date_required: false,
    is_active: true
  });

  useEffect(() => {
    fetchMembershipTypes();
  }, []);

  const fetchMembershipTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMembershipTypes((data || []) as MembershipType[]);
    } catch (error) {
      console.error('Error fetching membership types:', error);
      toast({
        title: "Error",
        description: "Failed to load membership types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingType) {
        const { error } = await supabase
          .from('membership_types')
          .update(formData)
          .eq('id', editingType.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Membership type updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('membership_types')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Membership type created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingType(null);
      resetForm();
      fetchMembershipTypes();
    } catch (error) {
      console.error('Error saving membership type:', error);
      toast({
        title: "Error",
        description: "Failed to save membership type",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (type: MembershipType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      allocation_type: type.allocation_type,
      allocated_classes: type.allocated_classes,
      start_date_required: type.start_date_required,
      end_date_required: type.end_date_required,
      is_active: type.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership type?')) return;

    try {
      const { error } = await supabase
        .from('membership_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Membership type deleted successfully",
      });

      fetchMembershipTypes();
    } catch (error) {
      console.error('Error deleting membership type:', error);
      toast({
        title: "Error",
        description: "Failed to delete membership type",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('membership_types')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Membership type ${!isActive ? 'activated' : 'deactivated'}`,
      });

      fetchMembershipTypes();
    } catch (error) {
      console.error('Error updating membership type:', error);
      toast({
        title: "Error",
        description: "Failed to update membership type",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      allocation_type: 'CLASS_COUNT',
      allocated_classes: null,
      start_date_required: false,
      end_date_required: false,
      is_active: true
    });
  };

  const getAllocationIcon = (type: string) => {
    switch (type) {
      case 'CLASS_COUNT':
        return Hash;
      case 'UNLIMITED':
        return Infinity;
      case 'DATE_RANGE':
        return Calendar;
      default:
        return Hash;
    }
  };

  const getAllocationDescription = (type: MembershipType) => {
    switch (type.allocation_type) {
      case 'CLASS_COUNT':
        return `${type.allocated_classes} classes`;
      case 'UNLIMITED':
        return 'Unlimited classes';
      case 'DATE_RANGE':
        return 'Date-based membership';
      default:
        return 'Unknown type';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <CreditCard className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading membership types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mobile-subtitle">Membership Types</h2>
          <p className="text-muted-foreground mobile-text-sm">
            Manage membership types and pricing structures
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {membershipTypes.length} Types
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {membershipTypes.filter(t => t.is_active).length} Active
          </Badge>
        </div>
      </div>

      {/* Membership Types Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Membership Types
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingType(null);
                  resetForm();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Membership Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? 'Edit Membership Type' : 'Add New Membership Type'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Monthly Pass, 10-Class Pack"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="allocation_type">Allocation Type</Label>
                    <Select 
                      value={formData.allocation_type} 
                      onValueChange={(value: 'CLASS_COUNT' | 'UNLIMITED' | 'DATE_RANGE') => 
                        setFormData(prev => ({ ...prev, allocation_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLASS_COUNT">Class Count</SelectItem>
                        <SelectItem value="UNLIMITED">Unlimited</SelectItem>
                        <SelectItem value="DATE_RANGE">Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.allocation_type === 'CLASS_COUNT' && (
                    <div>
                      <Label htmlFor="allocated_classes">Number of Classes</Label>
                      <Input
                        id="allocated_classes"
                        type="number"
                        value={formData.allocated_classes || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          allocated_classes: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        placeholder="Enter number of classes"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="start_date_required">Require Start Date</Label>
                      <Switch
                        id="start_date_required"
                        checked={formData.start_date_required}
                        onCheckedChange={(checked) => setFormData(prev => ({ 
                          ...prev, 
                          start_date_required: checked 
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="end_date_required">Require End Date</Label>
                      <Switch
                        id="end_date_required"
                        checked={formData.end_date_required}
                        onCheckedChange={(checked) => setFormData(prev => ({ 
                          ...prev, 
                          end_date_required: checked 
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">Active</Label>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ 
                          ...prev, 
                          is_active: checked 
                        }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingType ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {membershipTypes.map((type) => {
              const IconComponent = getAllocationIcon(type.allocation_type);
              return (
                <div key={type.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      type.is_active ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`h-5 w-5 ${
                        type.is_active ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getAllocationDescription(type)}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={type.is_active ? "default" : "secondary"} className="text-xs">
                          {type.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {type.start_date_required && (
                          <Badge variant="outline" className="text-xs">
                            Start Date Required
                          </Badge>
                        )}
                        {type.end_date_required && (
                          <Badge variant="outline" className="text-xs">
                            End Date Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(type.id, type.is_active)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {type.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(type)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(type.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}

            {membershipTypes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                <p>No membership types found</p>
                <p className="text-sm">Create your first membership type to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};