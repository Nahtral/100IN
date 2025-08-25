import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FitnessAssessmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  playerId?: string;
}

const FitnessAssessmentForm: React.FC<FitnessAssessmentFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  playerId
}) => {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState(playerId || '');
  const [date, setDate] = useState<Date>(new Date());
  const [fitnessScore, setFitnessScore] = useState([75]);
  const [weight, setWeight] = useState('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
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
    if (!selectedPlayer) {
      toast({
        title: "Error",
        description: "Please select a player",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const assessmentData: any = {
        player_id: selectedPlayer,
        date: format(date, 'yyyy-MM-dd'),
        fitness_score: fitnessScore[0],
        medical_notes: medicalNotes,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (weight) assessmentData.weight = parseFloat(weight);
      if (bodyFatPercentage) assessmentData.body_fat_percentage = parseFloat(bodyFatPercentage);

      const { error } = await supabase
        .from('health_wellness')
        .insert(assessmentData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fitness assessment submitted successfully"
      });
      
      // Reset form
      setSelectedPlayer(playerId || '');
      setDate(new Date());
      setFitnessScore([75]);
      setWeight('');
      setBodyFatPercentage('');
      setMedicalNotes('');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting fitness assessment:', error);
      toast({
        title: "Error",
        description: "Failed to submit fitness assessment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFitnessCategory = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  const currentCategory = getFitnessCategory(fitnessScore[0]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Add Fitness Assessment
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
              <Label>Assessment Date *</Label>
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

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Fitness Score: {fitnessScore[0]}</Label>
              <div className="px-3">
                <Slider
                  value={fitnessScore}
                  onValueChange={setFitnessScore}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span className={currentCategory.color}>
                    {currentCategory.label}
                  </span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 180"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyFat">Body Fat Percentage (%)</Label>
              <Input
                id="bodyFat"
                type="number"
                value={bodyFatPercentage}
                onChange={(e) => setBodyFatPercentage(e.target.value)}
                placeholder="e.g., 12.5"
                step="0.1"
                max="50"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Assessment Notes</Label>
            <Textarea
              id="notes"
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Notes about the assessment, improvements, concerns, or recommendations..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Assessment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FitnessAssessmentForm;