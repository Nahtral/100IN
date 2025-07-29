import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Heart,
  Activity,
  Moon,
  Zap,
  Shield,
  Save,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DailyCheckInProps {
  playerProfile?: any;
  userRole: string;
}

const DailyCheckIn: React.FC<DailyCheckInProps> = ({ playerProfile, userRole }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checkInData, setCheckInData] = useState({
    sleepQuality: [7],
    energyLevel: [7],
    stressLevel: [3],
    hydration: [7],
    nutrition: [7],
    mood: '',
    notes: '',
    painLevel: [0],
    painLocation: ''
  });
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerProfile) {
      checkTodayRecord();
    }
  }, [playerProfile]);

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
        // Populate form with existing data
        setCheckInData({
          sleepQuality: [data.sleep_quality || 7],
          energyLevel: [data.energy_level || 7],
          stressLevel: [data.stress_level || 3],
          hydration: [data.hydration_level || 7],
          nutrition: [data.nutrition_quality || 7],
          mood: data.overall_mood || '',
          notes: data.additional_notes || '',
          painLevel: [data.pain_level || 0],
          painLocation: data.pain_location || ''
        });
      }
    } catch (error) {
      console.error('Error checking today record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!playerProfile) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const recordData = {
        player_id: playerProfile.id,
        check_in_date: today,
        sleep_quality: checkInData.sleepQuality[0],
        sleep_hours: 8, // Could be added to form
        energy_level: checkInData.energyLevel[0],
        stress_level: checkInData.stressLevel[0],
        hydration_level: checkInData.hydration[0],
        nutrition_quality: checkInData.nutrition[0],
        overall_mood: checkInData.mood,
        pain_level: checkInData.painLevel[0],
        pain_location: checkInData.painLocation || null,
        additional_notes: checkInData.notes,
        mood: checkInData.mood === 'Great' ? 9 : checkInData.mood === 'Good' ? 7 : checkInData.mood === 'Okay' ? 5 : checkInData.mood === 'Tired' ? 4 : checkInData.mood === 'Stressed' ? 3 : checkInData.mood === 'Unwell' ? 2 : 5,
        training_readiness: Math.round((checkInData.energyLevel[0] + checkInData.sleepQuality[0] + (10 - checkInData.stressLevel[0])) / 3)
      };

      if (todayRecord) {
        // Update existing record
        const { error } = await supabase
          .from('daily_health_checkins')
          .update(recordData)
          .eq('id', todayRecord.id);

        if (error) throw error;

        toast({
          title: "Check-in Updated",
          description: "Your daily health check-in has been updated successfully.",
        });
      } else {
        // Create new record
        const { error } = await supabase
          .from('daily_health_checkins')
          .insert([recordData]);

        if (error) throw error;

        toast({
          title: "Check-in Completed",
          description: "Your daily health check-in has been recorded successfully.",
        });
      }

      checkTodayRecord();
    } catch (error) {
      console.error('Error saving check-in:', error);
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
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No player profile found</h3>
          <p className="text-gray-600">Please contact your administrator.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card>
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();
  const moods = ['Great', 'Good', 'Okay', 'Tired', 'Stressed', 'Unwell'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Check-in</h2>
          <p className="text-gray-600">
            {format(today, 'EEEE, MMMM do, yyyy')} • 
            {todayRecord ? ' Already completed today' : ' Complete your daily wellness check'}
          </p>
        </div>
        {todayRecord && (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Clock className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wellness Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Wellness Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sleep Quality */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Moon className="h-4 w-4 text-purple-500" />
                Sleep Quality: {checkInData.sleepQuality[0]}/10
              </label>
              <Slider
                value={checkInData.sleepQuality}
                onValueChange={(value) => setCheckInData(prev => ({ ...prev, sleepQuality: value }))}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Energy Level */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Energy Level: {checkInData.energyLevel[0]}/10
              </label>
              <Slider
                value={checkInData.energyLevel}
                onValueChange={(value) => setCheckInData(prev => ({ ...prev, energyLevel: value }))}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Exhausted</span>
                <span>Energized</span>
              </div>
            </div>

            {/* Stress Level */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Stress Level: {checkInData.stressLevel[0]}/10
              </label>
              <Slider
                value={checkInData.stressLevel}
                onValueChange={(value) => setCheckInData(prev => ({ ...prev, stressLevel: value }))}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Relaxed</span>
                <span>Very Stressed</span>
              </div>
            </div>

            {/* Hydration */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-blue-400" />
                Hydration: {checkInData.hydration[0]}/10
              </label>
              <Slider
                value={checkInData.hydration}
                onValueChange={(value) => setCheckInData(prev => ({ ...prev, hydration: value }))}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Dehydrated</span>
                <span>Well Hydrated</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Health Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Mood */}
            <div>
              <label className="text-sm font-medium mb-2 block">Overall Mood</label>
              <Select
                value={checkInData.mood}
                onValueChange={(value) => setCheckInData(prev => ({ ...prev, mood: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How are you feeling today?" />
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
              <label className="text-sm font-medium mb-2 block">
                Pain Level: {checkInData.painLevel[0]}/10
              </label>
              <Slider
                value={checkInData.painLevel}
                onValueChange={(value) => setCheckInData(prev => ({ ...prev, painLevel: value }))}
                max={10}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>No Pain</span>
                <span>Severe Pain</span>
              </div>
            </div>

            {checkInData.painLevel[0] > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Pain Location</label>
                <Textarea
                  placeholder="Describe where you feel pain..."
                  value={checkInData.painLocation}
                  onChange={(e) => setCheckInData(prev => ({ ...prev, painLocation: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Additional Notes</label>
              <Textarea
                placeholder="Any other health concerns, symptoms, or notes..."
                value={checkInData.notes}
                onChange={(e) => setCheckInData(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : (todayRecord ? 'Update Check-in' : 'Complete Check-in')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DailyCheckIn;