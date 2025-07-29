import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Heart,
  Zap,
  Moon,
  Save,
  CheckCircle,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuickCheckInProps {
  playerProfile?: any;
  userRole: string;
}

const QuickCheckIn: React.FC<QuickCheckInProps> = ({ playerProfile, userRole }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quickData, setQuickData] = useState({
    energy: [7],
    sleep: [7],
    mood: '',
    pain: [0]
  });
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerProfile && userRole === 'player') {
      checkTodayRecord();
    } else {
      setLoading(false);
    }
  }, [playerProfile, userRole]);

  const checkTodayRecord = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_health_checkins')
        .select('*')
        .eq('player_id', playerProfile.id)
        .eq('check_in_date', today)
        .maybeSingle();

      if (data) {
        setTodayRecord(data);
      }
    } catch (error) {
      console.error('Error checking today record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async () => {
    if (!playerProfile || userRole !== 'player') return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const recordData = {
        player_id: playerProfile.id,
        check_in_date: today,
        sleep_quality: quickData.sleep[0],
        sleep_hours: 8,
        energy_level: quickData.energy[0],
        stress_level: 3,
        hydration_level: 7,
        nutrition_quality: 7,
        overall_mood: quickData.mood,
        pain_level: quickData.pain[0],
        mood: quickData.mood === 'Great' ? 9 : quickData.mood === 'Good' ? 7 : quickData.mood === 'Okay' ? 5 : quickData.mood === 'Tired' ? 4 : quickData.mood === 'Stressed' ? 3 : quickData.mood === 'Unwell' ? 2 : 5,
        training_readiness: Math.round((quickData.energy[0] + quickData.sleep[0] + 7) / 3), // Using defaults for missing values
        additional_notes: 'Quick check-in'
      };

      if (todayRecord) {
        // Update existing record
        const { error } = await supabase
          .from('daily_health_checkins')
          .update(recordData)
          .eq('id', todayRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('daily_health_checkins')
          .insert([recordData]);

        if (error) throw error;
      }

      toast({
        title: "Quick Check-in Completed",
        description: "Your wellness status has been recorded.",
      });

      checkTodayRecord();
    } catch (error) {
      console.error('Error saving quick check-in:', error);
      toast({
        title: "Error",
        description: "Failed to save your check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userRole !== 'player' || !playerProfile) {
    return null; // Don't show for non-players
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-6 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (todayRecord) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Today's check-in completed!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            You can update your full check-in anytime in the Daily Check-in tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  const moods = ['Great', 'Good', 'Okay', 'Tired', 'Stressed', 'Unwell'];

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Quick Check-in
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete a quick wellness check for today
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Energy Level */}
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Energy: {quickData.energy[0]}/10
          </label>
          <Slider
            value={quickData.energy}
            onValueChange={(value) => setQuickData(prev => ({ ...prev, energy: value }))}
            max={10}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        {/* Sleep Quality */}
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Moon className="h-4 w-4 text-purple-500" />
            Sleep: {quickData.sleep[0]}/10
          </label>
          <Slider
            value={quickData.sleep}
            onValueChange={(value) => setQuickData(prev => ({ ...prev, sleep: value }))}
            max={10}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        {/* Overall Mood */}
        <div>
          <label className="text-sm font-medium mb-2 block">Mood</label>
          <Select
            value={quickData.mood}
            onValueChange={(value) => setQuickData(prev => ({ ...prev, mood: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="How are you feeling?" />
            </SelectTrigger>
            <SelectContent>
              {moods.map((mood) => (
                <SelectItem key={mood} value={mood}>
                  {mood}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pain Level */}
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-red-500" />
            Any Pain: {quickData.pain[0]}/10
          </label>
          <Slider
            value={quickData.pain}
            onValueChange={(value) => setQuickData(prev => ({ ...prev, pain: value }))}
            max={10}
            min={0}
            step={1}
            className="w-full"
          />
        </div>

        <Button 
          onClick={handleQuickSubmit}
          disabled={isSubmitting || !quickData.mood}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Complete Quick Check-in'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickCheckIn;