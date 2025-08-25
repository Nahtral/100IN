import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EditInjuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  injury: any;
}

const EditInjuryModal: React.FC<EditInjuryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  injury
}) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [injuryDescription, setInjuryDescription] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [injuryStatus, setInjuryStatus] = useState('injured');
  const { toast } = useToast();

  useEffect(() => {
    if (injury && isOpen) {
      setDate(new Date(injury.date));
      setInjuryDescription(injury.injury_description || '');
      setMedicalNotes(injury.medical_notes || '');
      setInjuryStatus(injury.injury_status || 'injured');
    }
  }, [injury, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!injuryDescription) {
      toast({
        title: "Error",
        description: "Please fill in the injury description",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('health_wellness')
        .update({
          date: format(date, 'yyyy-MM-dd'),
          injury_status: injuryStatus,
          injury_description: injuryDescription,
          medical_notes: medicalNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', injury.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Injury record updated successfully"
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating injury:', error);
      toast({
        title: "Error",
        description: "Failed to update injury record",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!injury) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Edit Injury Record
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Player</Label>
            <Input 
              value={injury.players?.profiles?.full_name || 'Unknown Player'} 
              disabled 
            />
          </div>

          <div className="space-y-2">
            <Label>Injury Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Injury Description *</Label>
            <Textarea
              id="description"
              value={injuryDescription}
              onChange={(e) => setInjuryDescription(e.target.value)}
              placeholder="Describe the injury, how it occurred, and affected area..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Injury Status</Label>
            <Select value={injuryStatus} onValueChange={setInjuryStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="injured">Injured</SelectItem>
                <SelectItem value="recovering">Recovering</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Medical Notes</Label>
            <Textarea
              id="notes"
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Additional medical notes, treatment recommendations, or observations..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInjuryModal;