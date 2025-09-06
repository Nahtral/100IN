import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Shield, Phone, MapPin, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { format } from 'date-fns';

interface MedicalInsurance {
  id: string;
  player_id: string;
  insurance_provider: string;
  policy_number: string;
  group_number?: string;
  policy_holder_name: string;
  policy_holder_relationship: string;
  effective_date: string;
  expiration_date?: string;
  copay_amount?: number;
  deductible_amount?: number;
  out_of_pocket_max?: number;
  coverage_details?: string;
  provider_phone?: string;
  provider_address?: string;
  emergency_coverage: boolean;
  dental_coverage: boolean;
  vision_coverage: boolean;
  prescription_coverage: boolean;
  pre_authorization_required: boolean;
  notes?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface MedicalInsuranceTabProps {
  playerId: string;
}

const MedicalInsuranceTab: React.FC<MedicalInsuranceTabProps> = ({ playerId }) => {
  const [insurances, setInsurances] = useState<MedicalInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<MedicalInsurance | null>(null);
  const [formData, setFormData] = useState<Partial<MedicalInsurance>>({});
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();

  const canManage = isSuperAdmin || hasRole('medical') || hasRole('staff');

  useEffect(() => {
    fetchInsurances();
  }, [playerId]);

  const fetchInsurances = async () => {
    try {
      const { data, error } = await supabase
        .from('player_medical_insurance')
        .select('*')
        .eq('player_id', playerId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInsurances(data || []);
    } catch (error) {
      console.error('Error fetching insurance data:', error);
      toast({
        title: "Error",
        description: "Failed to load insurance information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      insurance_provider: '',
      policy_number: '',
      group_number: '',
      policy_holder_name: '',
      policy_holder_relationship: 'self',
      effective_date: '',
      expiration_date: '',
      copay_amount: undefined,
      deductible_amount: undefined,
      out_of_pocket_max: undefined,
      coverage_details: '',
      provider_phone: '',
      provider_address: '',
      emergency_coverage: true,
      dental_coverage: false,
      vision_coverage: false,
      prescription_coverage: false,
      pre_authorization_required: false,
      notes: '',
      is_primary: insurances.length === 0,
    });
  };

  const handleAddInsurance = () => {
    resetForm();
    setEditingInsurance(null);
    setShowAddForm(true);
  };

  const handleEditInsurance = (insurance: MedicalInsurance) => {
    setFormData(insurance);
    setEditingInsurance(insurance);
    setShowAddForm(true);
  };

  const handleSaveInsurance = async () => {
    if (!formData.insurance_provider || !formData.policy_number || !formData.policy_holder_name || !formData.effective_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // If setting this as primary, update others to secondary
      if (formData.is_primary) {
        await supabase
          .from('player_medical_insurance')
          .update({ is_primary: false })
          .eq('player_id', playerId)
          .neq('id', editingInsurance?.id || '');
      }

      if (editingInsurance) {
        // Update existing
        const { error } = await supabase
          .from('player_medical_insurance')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingInsurance.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('player_medical_insurance')
          .insert({
            insurance_provider: formData.insurance_provider!,
            policy_number: formData.policy_number!,
            group_number: formData.group_number,
            policy_holder_name: formData.policy_holder_name!,
            policy_holder_relationship: formData.policy_holder_relationship!,
            effective_date: formData.effective_date!,
            expiration_date: formData.expiration_date,
            copay_amount: formData.copay_amount,
            deductible_amount: formData.deductible_amount,
            out_of_pocket_max: formData.out_of_pocket_max,
            coverage_details: formData.coverage_details,
            provider_phone: formData.provider_phone,
            provider_address: formData.provider_address,
            emergency_coverage: formData.emergency_coverage || true,
            dental_coverage: formData.dental_coverage || false,
            vision_coverage: formData.vision_coverage || false,
            prescription_coverage: formData.prescription_coverage || false,
            pre_authorization_required: formData.pre_authorization_required || false,
            notes: formData.notes,
            is_primary: formData.is_primary || false,
            player_id: playerId,
            created_by: (await supabase.auth.getUser()).data.user?.id || ''
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingInsurance ? "Insurance updated successfully" : "Insurance added successfully",
      });

      setShowAddForm(false);
      await fetchInsurances();
    } catch (error) {
      console.error('Error saving insurance:', error);
      toast({
        title: "Error",
        description: "Failed to save insurance information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInsurance = async (insuranceId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('player_medical_insurance')
        .delete()
        .eq('id', insuranceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Insurance deleted successfully",
      });

      await fetchInsurances();
    } catch (error) {
      console.error('Error deleting insurance:', error);
      toast({
        title: "Error",
        description: "Failed to delete insurance information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading insurance information...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Medical Insurance</h3>
        {canManage && (
          <Button onClick={handleAddInsurance} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Insurance
          </Button>
        )}
      </div>

      {insurances.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No insurance information on file</p>
            {canManage && (
              <Button onClick={handleAddInsurance} className="mt-4">
                Add Insurance Information
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insurances.map((insurance) => (
            <Card key={insurance.id} className={insurance.is_primary ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {insurance.insurance_provider}
                    {insurance.is_primary && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                  </CardTitle>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditInsurance(insurance)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Insurance</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this insurance information? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInsurance(insurance.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Policy Number</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{insurance.policy_number}</span>
                    </div>
                  </div>
                  {insurance.group_number && (
                    <div>
                      <Label className="text-sm font-medium">Group Number</Label>
                      <p className="text-sm mt-1">{insurance.group_number}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Policy Holder</Label>
                    <p className="text-sm mt-1">{insurance.policy_holder_name} ({insurance.policy_holder_relationship})</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Effective Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(insurance.effective_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  {insurance.expiration_date && (
                    <div>
                      <Label className="text-sm font-medium">Expiration Date</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{format(new Date(insurance.expiration_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  )}
                  {insurance.provider_phone && (
                    <div>
                      <Label className="text-sm font-medium">Provider Phone</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{insurance.provider_phone}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coverage Details */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Coverage Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {insurance.emergency_coverage && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Emergency</span>}
                    {insurance.dental_coverage && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Dental</span>}
                    {insurance.vision_coverage && <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Vision</span>}
                    {insurance.prescription_coverage && <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">Prescription</span>}
                  </div>
                </div>

                {/* Financial Details */}
                {(insurance.copay_amount || insurance.deductible_amount || insurance.out_of_pocket_max) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insurance.copay_amount && (
                      <div>
                        <Label className="text-sm font-medium">Copay</Label>
                        <p className="text-sm mt-1">${insurance.copay_amount}</p>
                      </div>
                    )}
                    {insurance.deductible_amount && (
                      <div>
                        <Label className="text-sm font-medium">Deductible</Label>
                        <p className="text-sm mt-1">${insurance.deductible_amount}</p>
                      </div>
                    )}
                    {insurance.out_of_pocket_max && (
                      <div>
                        <Label className="text-sm font-medium">Out of Pocket Max</Label>
                        <p className="text-sm mt-1">${insurance.out_of_pocket_max}</p>
                      </div>
                    )}
                  </div>
                )}

                {insurance.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm mt-1 text-muted-foreground">{insurance.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Insurance Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInsurance ? 'Edit Insurance' : 'Add Insurance'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Insurance Provider *</Label>
                  <Input
                    value={formData.insurance_provider || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))}
                    placeholder="e.g., Aetna, Blue Cross Blue Shield"
                  />
                </div>
                <div>
                  <Label>Policy Number *</Label>
                  <Input
                    value={formData.policy_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, policy_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Group Number</Label>
                  <Input
                    value={formData.group_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, group_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Policy Holder Name *</Label>
                  <Input
                    value={formData.policy_holder_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, policy_holder_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Relationship to Player *</Label>
                  <Select
                    value={formData.policy_holder_relationship || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, policy_holder_relationship: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_primary || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: checked }))}
                  />
                  <Label>Primary Insurance</Label>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h4 className="font-medium">Coverage Dates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Effective Date *</Label>
                  <Input
                    type="date"
                    value={formData.effective_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={formData.expiration_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Financial Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Copay Amount</Label>
                  <Input
                    type="number"
                    value={formData.copay_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, copay_amount: parseFloat(e.target.value) || undefined }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Deductible Amount</Label>
                  <Input
                    type="number"
                    value={formData.deductible_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, deductible_amount: parseFloat(e.target.value) || undefined }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Out of Pocket Max</Label>
                  <Input
                    type="number"
                    value={formData.out_of_pocket_max || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, out_of_pocket_max: parseFloat(e.target.value) || undefined }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Coverage Types */}
            <div className="space-y-4">
              <h4 className="font-medium">Coverage Types</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.emergency_coverage || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emergency_coverage: checked }))}
                  />
                  <Label>Emergency Coverage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.dental_coverage || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dental_coverage: checked }))}
                  />
                  <Label>Dental Coverage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.vision_coverage || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vision_coverage: checked }))}
                  />
                  <Label>Vision Coverage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.prescription_coverage || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, prescription_coverage: checked }))}
                  />
                  <Label>Prescription Coverage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.pre_authorization_required || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pre_authorization_required: checked }))}
                  />
                  <Label>Pre-authorization Required</Label>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Provider Contact</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Provider Phone</Label>
                  <Input
                    value={formData.provider_phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider_phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>Provider Address</Label>
                  <Textarea
                    value={formData.provider_address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider_address: e.target.value }))}
                    placeholder="Provider address..."
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Additional Information</h4>
              <div>
                <Label>Coverage Details</Label>
                <Textarea
                  value={formData.coverage_details || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverage_details: e.target.value }))}
                  placeholder="Describe coverage details, limitations, etc..."
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveInsurance} disabled={loading}>
                {editingInsurance ? 'Update' : 'Add'} Insurance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalInsuranceTab;