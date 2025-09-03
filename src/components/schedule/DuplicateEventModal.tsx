import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Copy, Clock } from 'lucide-react';

interface DuplicateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (options: DuplicateOptions) => void;
  eventTitle: string;
}

interface DuplicateOptions {
  shiftDays: number;
  copyTeams: boolean;
  newTitle?: string;
}

const DuplicateEventModal: React.FC<DuplicateEventModalProps> = ({
  isOpen,
  onClose,
  onDuplicate,
  eventTitle
}) => {
  const [shiftDays, setShiftDays] = useState(0);
  const [shiftType, setShiftType] = useState('same');
  const [copyTeams, setCopyTeams] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  const handleDuplicate = () => {
    let finalShiftDays = 0;
    
    if (shiftType === 'next-day') {
      finalShiftDays = 1;
    } else if (shiftType === 'next-week') {
      finalShiftDays = 7;
    } else if (shiftType === 'custom') {
      finalShiftDays = shiftDays;
    }

    onDuplicate({
      shiftDays: finalShiftDays,
      copyTeams,
      newTitle: newTitle.trim() || undefined
    });

    // Reset form
    setShiftDays(0);
    setShiftType('same');
    setCopyTeams(true);
    setNewTitle('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="new-title">New Event Title (optional)</Label>
            <Input
              id="new-title"
              placeholder={`${eventTitle} (Copy)`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Date & Time Shift</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same">Same date & time</SelectItem>
                <SelectItem value="next-day">Next day (+1 day)</SelectItem>
                <SelectItem value="next-week">Next week (+7 days)</SelectItem>
                <SelectItem value="custom">Custom days shift</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shiftType === 'custom' && (
            <div>
              <Label htmlFor="shift-days">Days to shift</Label>
              <Input
                id="shift-days"
                type="number"
                min="-365"
                max="365"
                value={shiftDays}
                onChange={(e) => setShiftDays(parseInt(e.target.value) || 0)}
                placeholder="Enter number of days"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Positive numbers shift forward, negative backward
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="copy-teams"
              checked={copyTeams}
              onCheckedChange={(checked) => setCopyTeams(checked === true)}
            />
            <Label htmlFor="copy-teams" className="text-sm">
              Copy assigned teams
            </Label>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-1">Preview</h4>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {shiftType === 'same' && 'Same date & time'}
                  {shiftType === 'next-day' && 'Tomorrow (+1 day)'}
                  {shiftType === 'next-week' && 'Next week (+7 days)'}
                  {shiftType === 'custom' && `${shiftDays > 0 ? '+' : ''}${shiftDays} days`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Teams: {copyTeams ? 'Included' : 'Not included'}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} className="bg-primary">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateEventModal;