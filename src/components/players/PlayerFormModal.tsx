import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  height?: string;
  weight?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  profiles?: {
    full_name: string;
    email?: string;
    phone?: string;
  } | null;
}

interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPlayer?: Player;
}

export const PlayerFormModal: React.FC<PlayerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPlayer
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: editingPlayer?.profiles?.full_name || '',
    email: editingPlayer?.profiles?.email || '',
    phone: editingPlayer?.profiles?.phone || '',
    jerseyNumber: editingPlayer?.jersey_number?.toString() || '',
    position: editingPlayer?.position || '',
    height: editingPlayer?.height || '',
    weight: editingPlayer?.weight || '',
    dateOfBirth: editingPlayer?.date_of_birth || '',
    emergencyContactName: editingPlayer?.emergency_contact_name || '',
    emergencyContactPhone: editingPlayer?.emergency_contact_phone || '',
    medicalNotes: editingPlayer?.medical_notes || ''
  });
  
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingPlayer) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            jersey_number: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : null,
            position: formData.position || null,
            height: formData.height || null,
            weight: formData.weight || null,
            date_of_birth: formData.dateOfBirth || null,
            emergency_contact_name: formData.emergencyContactName || null,
            emergency_contact_phone: formData.emergencyContactPhone || null,
            medical_notes: formData.medicalNotes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPlayer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Player updated successfully.",
        });
      } else {
        toast({
          title: "Info",
          description: "Player creation requires user registration first. Please use the User Management section.",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving player:', error);
      toast({
        title: "Error",
        description: "Failed to save player.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mobile-container max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="mobile-subtitle">
            {editingPlayer ? 'Edit Player' : 'Add New Player'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
                disabled={!!editingPlayer}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={!!editingPlayer}
              />
            </div>
          </div>

          {/* Player Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jerseyNumber">Jersey Number</Label>
              <Input
                id="jerseyNumber"
                type="number"
                value={formData.jerseyNumber}
                onChange={(e) => handleInputChange('jerseyNumber', e.target.value)}
                placeholder="e.g., 23"
                min="0"
                max="99"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PG">Point Guard (PG)</SelectItem>
                  <SelectItem value="SG">Shooting Guard (SG)</SelectItem>
                  <SelectItem value="SF">Small Forward (SF)</SelectItem>
                  <SelectItem value="PF">Power Forward (PF)</SelectItem>
                  <SelectItem value="C">Center (C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              />
            </div>
          </div>

          {/* Physical Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="e.g., 6'2&quot;"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="e.g., 180 lbs"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!!editingPlayer}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
            <Input
              id="emergencyContactPhone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
            />
          </div>

          {/* Medical Notes */}
          <div className="space-y-2">
            <Label htmlFor="medicalNotes">Medical Notes</Label>
            <Textarea
              id="medicalNotes"
              value={formData.medicalNotes}
              onChange={(e) => handleInputChange('medicalNotes', e.target.value)}
              placeholder="Any medical conditions, allergies, or notes..."
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};