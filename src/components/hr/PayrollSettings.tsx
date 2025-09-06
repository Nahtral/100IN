import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface PayrollSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
}

interface DeductionType {
  id: string;
  name: string;
  description: string;
  is_tax: boolean;
  is_mandatory: boolean;
  calculation_type: 'fixed' | 'percentage';
  default_rate: number;
  is_active: boolean;
}

const PayrollSettings: React.FC = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useOptimizedAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PayrollSetting[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([]);
  const [newDeduction, setNewDeduction] = useState({
    name: '',
    description: '',
    is_tax: false,
    is_mandatory: false,
    calculation_type: 'percentage' as 'fixed' | 'percentage',
    default_rate: 0
  });

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPayrollSettings();
      fetchDeductionTypes();
    }
  }, [isSuperAdmin]);

  const fetchPayrollSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching payroll settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payroll settings.",
        variant: "destructive",
      });
    }
  };

  const fetchDeductionTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_deduction_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setDeductionTypes((data || []).map(item => ({
        ...item,
        calculation_type: item.calculation_type as 'fixed' | 'percentage'
      })));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching deduction types:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deduction types.",
        variant: "destructive",
      });
    }
  };

  const updateSetting = async (settingKey: string, value: any) => {
    try {
      const { error } = await supabase
        .from('payroll_settings')
        .upsert({
          setting_key: settingKey,
          setting_value: JSON.stringify(value),
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Setting updated successfully.",
      });

      fetchPayrollSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting.",
        variant: "destructive",
      });
    }
  };

  const addDeductionType = async () => {
    if (!newDeduction.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a deduction name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('payroll_deduction_types')
        .insert([{
          ...newDeduction,
          default_rate: newDeduction.default_rate / (newDeduction.calculation_type === 'percentage' ? 100 : 1)
        }]);

      if (error) throw error;

      setNewDeduction({
        name: '',
        description: '',
        is_tax: false,
        is_mandatory: false,
        calculation_type: 'percentage',
        default_rate: 0
      });

      toast({
        title: "Success",
        description: "Deduction type added successfully.",
      });

      fetchDeductionTypes();
    } catch (error) {
      console.error('Error adding deduction type:', error);
      toast({
        title: "Error",
        description: "Failed to add deduction type.",
        variant: "destructive",
      });
    }
  };

  const toggleDeductionStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('payroll_deduction_types')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deduction type ${!isActive ? 'activated' : 'deactivated'} successfully.`,
      });

      fetchDeductionTypes();
    } catch (error) {
      console.error('Error updating deduction type:', error);
      toast({
        title: "Error",
        description: "Failed to update deduction type.",
        variant: "destructive",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-red-600">Access denied. Super admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading payroll settings...</p>
      </div>
    );
  }

  const getSetting = (key: string) => {
    const setting = settings.find(s => s.setting_key === key);
    return setting ? JSON.parse(setting.setting_value) : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Payroll Settings</h2>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Payroll Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Default Currency</Label>
              <Select 
                value={getSetting('default_currency') || '¥'}
                onValueChange={(value) => updateSetting('default_currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="¥">¥ (Yen)</SelectItem>
                  <SelectItem value="$">$ (Dollar)</SelectItem>
                  <SelectItem value="€">€ (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pay Frequency</Label>
              <Select 
                value={getSetting('pay_frequency') || 'monthly'}
                onValueChange={(value) => updateSetting('pay_frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Overtime Rate Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={getSetting('overtime_rate_multiplier') || 1.5}
                onChange={(e) => updateSetting('overtime_rate_multiplier', parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label>Standard Work Hours Per Day</Label>
              <Input
                type="number"
                value={getSetting('standard_work_hours_per_day') || 8}
                onChange={(e) => updateSetting('standard_work_hours_per_day', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deduction Types Management */}
      <Card>
        <CardHeader>
          <CardTitle>Deduction Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Deduction Type */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-4">Add New Deduction Type</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deduction-name">Name</Label>
                <Input
                  id="deduction-name"
                  value={newDeduction.name}
                  onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })}
                  placeholder="e.g., Health Insurance"
                />
              </div>

              <div>
                <Label htmlFor="deduction-description">Description</Label>
                <Input
                  id="deduction-description"
                  value={newDeduction.description}
                  onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <Label htmlFor="calculation-type">Calculation Type</Label>
                <Select 
                  value={newDeduction.calculation_type}
                  onValueChange={(value: 'fixed' | 'percentage') => 
                    setNewDeduction({ ...newDeduction, calculation_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="default-rate">
                  Default Rate {newDeduction.calculation_type === 'percentage' ? '(%)' : '(¥)'}
                </Label>
                <Input
                  id="default-rate"
                  type="number"
                  step="0.01"
                  value={newDeduction.default_rate}
                  onChange={(e) => setNewDeduction({ ...newDeduction, default_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newDeduction.is_tax}
                  onCheckedChange={(checked) => setNewDeduction({ ...newDeduction, is_tax: checked })}
                />
                <Label>Tax Deduction</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newDeduction.is_mandatory}
                  onCheckedChange={(checked) => setNewDeduction({ ...newDeduction, is_mandatory: checked })}
                />
                <Label>Mandatory</Label>
              </div>
            </div>

            <Button onClick={addDeductionType} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Deduction Type
            </Button>
          </div>

          <Separator />

          {/* Existing Deduction Types */}
          <div className="space-y-4">
            <h4 className="font-semibold">Existing Deduction Types</h4>
            {deductionTypes.map((deduction) => (
              <div key={deduction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h5 className="font-medium">{deduction.name}</h5>
                  <p className="text-sm text-muted-foreground">{deduction.description}</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {deduction.calculation_type === 'percentage' 
                        ? `${(deduction.default_rate * 100).toFixed(1)}%` 
                        : `¥${deduction.default_rate}`}
                    </span>
                    {deduction.is_tax && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Tax</span>
                    )}
                    {deduction.is_mandatory && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Mandatory</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={deduction.is_active}
                    onCheckedChange={() => toggleDeductionStatus(deduction.id, deduction.is_active)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {deduction.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollSettings;
