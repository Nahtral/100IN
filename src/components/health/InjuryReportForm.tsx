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

interface InjuryReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  playerId?: string;
}

const InjuryReportForm: React.FC<InjuryReportFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  playerId
}) => {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState(playerId || '');
  const [date, setDate] = useState<Date>(new Date());
  const [injuryDescription, setInjuryDescription] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [injuryStatus, setInjuryStatus] = useState('injured');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          profiles!inner(full_name, email),
          teams(name)
        `)
        .eq('is_active', true)
        .order('profiles.full_name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !injuryDescription) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('health_wellness')
        .insert({
          player_id: selectedPlayer,
          date: format(date, 'yyyy-MM-dd'),
          injury_status: injuryStatus,
          injury_description: injuryDescription,
          medical_notes: medicalNotes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Injury report submitted successfully"
      });
      
      // Reset form
      setSelectedPlayer(playerId || '');
      setDate(new Date());
      setInjuryDescription('');
      setMedicalNotes('');
      setInjuryStatus('injured');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting injury report:', error);
      toast({
        title: "Error",
        description: "Failed to submit injury report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Report New Injury
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="player">Player *</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.profiles.full_name} ({player.teams?.name || 'No team'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Injury Date *</Label>
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
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InjuryReportForm;