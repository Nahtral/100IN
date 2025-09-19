import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, MapPin, User, Hash, CalendarDays } from 'lucide-react';
import { useMembershipTypesV2, useAssignMembershipV2 } from '@/hooks/useMembershipV2';

interface MembershipAssignmentModalV2Props {
  open: boolean;
  onClose: () => void;
  userId: string; // Changed from playerId to userId - this is the key fix!
  onSuccess?: () => void;
}

export const MembershipAssignmentModalV2: React.FC<MembershipAssignmentModalV2Props> = ({
  open,
  onClose,
  userId, // Now using user_id consistently with attendance system
  onSuccess
}) => {
  const [selectedMembershipType, setSelectedMembershipType] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [classCountOverride, setClassCountOverride] = useState('');
  const [autoDeactivate, setAutoDeactivate] = useState(true);
  const [notes, setNotes] = useState('');

  const { membershipTypes, loading: typesLoading } = useMembershipTypesV2();
  const { assignMembership, loading: assigning } = useAssignMembershipV2();

  const handleSubmit = async () => {
    if (!selectedMembershipType || !startDate) {
      return;
    }

    const result = await assignMembership({
      userId, // Using user_id - this eliminates foreign key errors!
      membershipTypeId: selectedMembershipType,
      startDate,
      endDate: endDate || undefined,
      overrideClassCount: classCountOverride ? parseInt(classCountOverride) : undefined,
      autoDeactivate,
      notes: notes || undefined
    });

    if (result.success) {
      onSuccess?.();
      onClose();
      // Reset form
      setSelectedMembershipType('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setClassCountOverride('');
      setAutoDeactivate(true);
      setNotes('');
    }
  };

  const selectedType = membershipTypes.find(type => type.id === selectedMembershipType);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Assign Membership
          </DialogTitle>
          <DialogDescription>
            Assign a membership package to this user. All data will be properly linked with the attendance system.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="membershipType">Membership Type</Label>
            <Select 
              value={selectedMembershipType} 
              onValueChange={setSelectedMembershipType}
              disabled={typesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select membership type" />
              </SelectTrigger>
              <SelectContent>
                {membershipTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {type.allocation_type === 'CLASS_COUNT' 
                          ? `${type.allocated_classes} classes`
                          : 'Unlimited'
                        } - ¥{type.price}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                End Date (Optional)
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {selectedType?.allocation_type === 'CLASS_COUNT' && (
            <div className="grid gap-2">
              <Label htmlFor="classCountOverride" className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                Class Count Override
              </Label>
              <Input
                id="classCountOverride"
                type="number"
                placeholder={`Default: ${selectedType.allocated_classes || 0} classes`}
                value={classCountOverride}
                onChange={(e) => setClassCountOverride(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use default ({selectedType.allocated_classes || 0} classes)
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="autoDeactivate"
              checked={autoDeactivate}
              onCheckedChange={setAutoDeactivate}
            />
            <Label htmlFor="autoDeactivate" className="text-sm">
              Auto-deactivate when classes are used up
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this membership assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={assigning}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedMembershipType || !startDate || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign Membership'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};