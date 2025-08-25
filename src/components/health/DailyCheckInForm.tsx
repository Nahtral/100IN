import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Heart, Zap, Moon, Droplets, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DailyCheckInFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  playerId?: string;
}

const symptomsList = [
  'Headache',
  'Nausea',
  'Dizziness',
  'Fatigue',
  'Muscle soreness',
  'Joint pain',
  'Shortness of breath',
  'Chest pain',
  'Other'
];

const DailyCheckInForm: React.FC<DailyCheckInFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  playerId
}) => {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState(playerId || '');
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  
  // Health metrics
  const [energyLevel, setEnergyLevel] = useState([7]);
  const [sleepHours, setSleepHours] = useState([8]);
  const [sleepQuality, setSleepQuality] = useState([7]);
  const [soreness, setSoreness] = useState([3]);
  const [hydration, setHydration] = useState([7]);
  const [nutrition, setNutrition] = useState([7]);
  const [stress, setStress] = useState([3]);
  const [mood, setMood] = useState([7]);
  const [painLevel, setPainLevel] = useState([0]);
  const [trainingReadiness, setTrainingReadiness] = useState([8]);
  
  const [painLocation, setPainLocation] = useState('');
  const [overallMood, setOverallMood] = useState('');
  const [medicationTaken, setMedicationTaken] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  
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

  const handleSymptomChange = (symptom: string, checked: boolean) => {
    if (checked) {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    } else {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
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
      const checkInData = {
        player_id: selectedPlayer,
        check_in_date: format(checkInDate, 'yyyy-MM-dd'),
        energy_level: energyLevel[0],
        sleep_hours: sleepHours[0],
        sleep_quality: sleepQuality[0],
        soreness_level: soreness[0],
        hydration_level: hydration[0],
        nutrition_quality: nutrition[0],
        stress_level: stress[0],
        mood: mood[0],
        pain_level: painLevel[0],
        training_readiness: trainingReadiness[0],
        pain_location: painLocation || null,
        overall_mood: overallMood || null,
        medication_taken: medicationTaken || null,
        additional_notes: additionalNotes || null,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : null
      };

      const { error } = await supabase
        .from('daily_health_checkins')
        .insert(checkInData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Daily check-in submitted successfully"
      });
      
      // Reset form
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting check-in:', error);
      toast({
        title: "Error",
        description: "Failed to submit daily check-in",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPlayer(playerId || '');
    setCheckInDate(new Date());
    setEnergyLevel([7]);
    setSleepHours([8]);
    setSleepQuality([7]);
    setSoreness([3]);
    setHydration([7]);
    setNutrition([7]);
    setStress([3]);
    setMood([7]);
    setPainLevel([0]);
    setTrainingReadiness([8]);
    setPainLocation('');
    setOverallMood('');
    setMedicationTaken('');
    setAdditionalNotes('');
    setSelectedSymptoms([]);
  };

  const SliderField = ({ 
    label, 
    value, 
    onChange, 
    max = 10, 
    icon: Icon, 
    color = "blue" 
  }: {
    label: string;
    value: number[];
    onChange: (value: number[]) => void;
    max?: number;
    icon?: any;
    color?: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`h-4 w-4 text-${color}-600`} />}
        <Label>{label}: {value[0]}/{max}</Label>
      </div>
      <div className="px-3">
        <Slider
          value={value}
          onValueChange={onChange}
          max={max}
          min={0}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-600" />
            Daily Health Check-in
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
              <Label>Check-in Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkInDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkInDate ? format(checkInDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={(date) => date && setCheckInDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Health Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SliderField
              label="Energy Level"
              value={energyLevel}
              onChange={setEnergyLevel}
              icon={Zap}
              color="yellow"
            />
            
            <SliderField
              label="Sleep Quality"
              value={sleepQuality}
              onChange={setSleepQuality}
              icon={Moon}
              color="blue"
            />
            
            <SliderField
              label="Sleep Hours"
              value={sleepHours}
              onChange={setSleepHours}
              max={12}
              icon={Moon}
              color="blue"
            />
            
            <SliderField
              label="Hydration Level"
              value={hydration}
              onChange={setHydration}
              icon={Droplets}
              color="blue"
            />
            
            <SliderField
              label="Nutrition Quality"
              value={nutrition}
              onChange={setNutrition}
              color="green"
            />
            
            <SliderField
              label="Training Readiness"
              value={trainingReadiness}
              onChange={setTrainingReadiness}
              icon={Activity}
              color="green"
            />
            
            <SliderField
              label="Soreness Level"
              value={soreness}
              onChange={setSoreness}
              color="orange"
            />
            
            <SliderField
              label="Pain Level"
              value={painLevel}
              onChange={setPainLevel}
              color="red"
            />
            
            <SliderField
              label="Stress Level"
              value={stress}
              onChange={setStress}
              color="red"
            />
            
            <SliderField
              label="Mood"
              value={mood}
              onChange={setMood}
              color="purple"
            />
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="painLocation">Pain Location (if any)</Label>
              <Select value={painLocation} onValueChange={setPainLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No pain</SelectItem>
                  <SelectItem value="head">Head</SelectItem>
                  <SelectItem value="neck">Neck</SelectItem>
                  <SelectItem value="shoulder">Shoulder</SelectItem>
                  <SelectItem value="arm">Arm</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                  <SelectItem value="chest">Chest</SelectItem>
                  <SelectItem value="abdomen">Abdomen</SelectItem>
                  <SelectItem value="hip">Hip</SelectItem>
                  <SelectItem value="leg">Leg</SelectItem>
                  <SelectItem value="knee">Knee</SelectItem>
                  <SelectItem value="ankle">Ankle</SelectItem>
                  <SelectItem value="foot">Foot</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overallMood">Overall Mood</Label>
              <Select value={overallMood} onValueChange={setOverallMood}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="stressed">Stressed</SelectItem>
                  <SelectItem value="anxious">Anxious</SelectItem>
                  <SelectItem value="tired">Tired</SelectItem>
                  <SelectItem value="irritated">Irritated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medication">Medication Taken</Label>
            <Textarea
              id="medication"
              value={medicationTaken}
              onChange={(e) => setMedicationTaken(e.target.value)}
              placeholder="List any medications, supplements, or treatments taken..."
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-3">
            <Label>Symptoms (check all that apply)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {symptomsList.map((symptom) => (
                <div key={symptom} className="flex items-center space-x-2">
                  <Checkbox
                    id={symptom}
                    checked={selectedSymptoms.includes(symptom)}
                    onCheckedChange={(checked) => handleSymptomChange(symptom, checked as boolean)}
                  />
                  <Label htmlFor={symptom} className="text-sm">
                    {symptom}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional information about how you're feeling today..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Check-in"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DailyCheckInForm;