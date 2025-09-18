import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useMembershipTypes, useAssignMembership, MembershipType } from '@/hooks/useMembership';
import { useToast } from '@/hooks/use-toast';

interface MembershipAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  onSuccess?: () => void;
}

export const MembershipAssignmentModal: React.FC<MembershipAssignmentModalProps> = ({
  open,
  onClose,
  playerId,
  onSuccess
}) => {
  const { types, loading: typesLoading } = useMembershipTypes();
  const { assignMembership, loading: assigning } = useAssignMembership();
  const { toast } = useToast();
  
  const [selectedType, setSelectedType] = useState<MembershipType | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [overrideClassCount, setOverrideClassCount] = useState<number | null>(null);
  const [autoDeactivate, setAutoDeactivate] = useState(true);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!selectedType) {
      toast({
        title: "Validation Error",
        description: "Please select a membership type",
        variant: "destructive",
      });
      return;
    }

    const membershipData = {
      player_id: playerId,
      membership_type_id: selectedType.id,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      override_class_count: overrideClassCount,
      auto_deactivate_when_used_up: autoDeactivate,
      notes: notes || undefined,
    };

    const success = await assignMembership(membershipData);
    if (success) {
      onSuccess?.();
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setStartDate(new Date());
    setEndDate(undefined);
    setOverrideClassCount(null);
    setAutoDeactivate(true);
    setNotes('');
  };

  const requiresEndDate = selectedType?.allocation_type === 'DATE_RANGE';
  const allowsClassOverride = selectedType?.allocation_type === 'CLASS_COUNT';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Membership</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Membership Type Selection */}
          <div className="space-y-2">
            <Label>Membership Type</Label>
            <Select 
              value={selectedType?.id || ''} 
              onValueChange={(value) => {
                const type = types.find(t => t.id === value);
                setSelectedType(type || null);
              }}
              disabled={typesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select membership type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} - {type.allocation_type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Select end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Class Override (for CLASS_COUNT types) */}
          {allowsClassOverride && (
            <div className="space-y-2">
              <Label>Override Class Count (optional)</Label>
              <Input
                type="number"
                placeholder={`Default: ${selectedType?.allocated_classes || 0}`}
                value={overrideClassCount || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setOverrideClassCount(value ? parseInt(value) : null);
                }}
              />
            </div>
          )}

          {/* Auto-deactivate Setting */}
          <div className="flex items-center justify-between">
            <Label>Auto-deactivate when used up</Label>
            <Switch
              checked={autoDeactivate}
              onCheckedChange={setAutoDeactivate}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes about this membership..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedType || assigning}
              className="flex-1"
            >
              {assigning ? 'Assigning...' : 'Assign Membership'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};