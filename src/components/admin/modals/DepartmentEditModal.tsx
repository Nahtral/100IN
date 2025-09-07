import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  manager_id: string;
  budget_allocation: number;
  is_active: boolean;
  staff_count: number;
}

interface DepartmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department;
  onSave: (updatedDepartment: Department) => void;
}

export const DepartmentEditModal: React.FC<DepartmentEditModalProps> = ({
  isOpen,
  onClose,
  department,
  onSave
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: department.name,
    description: department.description || '',
    budget_allocation: department.budget_allocation || 0,
    is_active: department.is_active
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('staff_departments')
        .update({
          name: formData.name,
          description: formData.description,
          budget_allocation: formData.budget_allocation,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', department.id)
        .select()
        .single();

      if (error) throw error;

      const updatedDepartment = {
        ...department,
        ...formData,
        ...data
      };

      onSave(updatedDepartment);
      
      toast({
        title: "Success",
        description: "Department updated successfully"
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating department:', error);
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Edit Department
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Department description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget Allocation ($)</Label>
            <Input
              id="budget"
              type="number"
              min="0"
              step="1000"
              value={formData.budget_allocation}
              onChange={(e) => handleInputChange('budget_allocation', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active Department</Label>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};