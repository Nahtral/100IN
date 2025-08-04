import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Camera, Volume2, Ruler, Globe, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShotIQSettingsProps {
  playerId: string;
}

interface SettingsData {
  // Rim and Court Settings
  rimHeight: number; // in feet/meters
  courtType: 'regulation' | 'youth' | 'custom';
  unitSystem: 'imperial' | 'metric';
  
  // Camera Settings
  videoQuality: 'hd' | 'fhd' | '4k';
  frameRate: 30 | 60 | 120;
  recordingDuration: number; // in seconds
  autoCapture: boolean;
  
  // Audio Settings
  audioFeedbackEnabled: boolean;
  feedbackStyle: 'detailed' | 'simple' | 'encouragement';
  voiceType: 'male' | 'female' | 'neutral';
  volume: number;
  
  // Analysis Settings
  shotDetectionSensitivity: number;
  arcAnalysisEnabled: boolean;
  depthAnalysisEnabled: boolean;
  deviationAnalysisEnabled: boolean;
  
  // UI Settings
  showGrid: boolean;
  showTrajectoryLine: boolean;
  heatmapIntensity: 'low' | 'medium' | 'high';
  theme: 'light' | 'dark' | 'auto';
}

const defaultSettings: SettingsData = {
  rimHeight: 10,
  courtType: 'regulation',
  unitSystem: 'imperial',
  videoQuality: 'fhd',
  frameRate: 60,
  recordingDuration: 5,
  autoCapture: false,
  audioFeedbackEnabled: true,
  feedbackStyle: 'detailed',
  voiceType: 'neutral',
  volume: 80,
  shotDetectionSensitivity: 75,
  arcAnalysisEnabled: true,
  depthAnalysisEnabled: true,
  deviationAnalysisEnabled: true,
  showGrid: true,
  showTrajectoryLine: true,
  heatmapIntensity: 'medium',
  theme: 'auto',
};

const ShotIQSettings: React.FC<ShotIQSettingsProps> = ({ playerId }) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [playerId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('shotiq_settings')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({ ...defaultSettings, ...data.settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Settings Error",
        description: "Failed to load settings, using defaults",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('shotiq_settings')
        .upsert({
          player_id: playerId,
          settings: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your ShotIQ settings have been updated",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults",
    });
  };

  const updateSetting = <K extends keyof SettingsData>(
    key: K, 
    value: SettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const convertUnit = (value: number, from: 'imperial' | 'metric'): string => {
    if (settings.unitSystem === from) {
      return value.toString();
    }
    
    if (from === 'imperial' && settings.unitSystem === 'metric') {
      return (value * 0.3048).toFixed(2); // feet to meters
    } else {
      return (value / 0.3048).toFixed(1); // meters to feet
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            ShotIQ Settings
          </h2>
          <p className="text-muted-foreground">Customize your shot tracking experience</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetSettings} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Court & Measurements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Court & Measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rimHeight">Rim Height</Label>
              <div className="flex gap-2">
                <Input
                  id="rimHeight"
                  type="number"
                  value={settings.rimHeight}
                  onChange={(e) => updateSetting('rimHeight', parseFloat(e.target.value))}
                  step="0.1"
                />
                <Badge variant="outline">
                  {settings.unitSystem === 'imperial' ? 'ft' : 'm'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Standard: {settings.unitSystem === 'imperial' ? '10 ft' : '3.05 m'}
              </p>
            </div>

            <div>
              <Label htmlFor="courtType">Court Type</Label>
              <Select 
                value={settings.courtType} 
                onValueChange={(value: any) => updateSetting('courtType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulation">Regulation (NBA/FIBA)</SelectItem>
                  <SelectItem value="youth">Youth Court</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unitSystem">Unit System</Label>
              <Select 
                value={settings.unitSystem} 
                onValueChange={(value: any) => updateSetting('unitSystem', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Imperial (ft, in)</SelectItem>
                  <SelectItem value="metric">Metric (m, cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera & Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="videoQuality">Video Quality</Label>
              <Select 
                value={settings.videoQuality} 
                onValueChange={(value: any) => updateSetting('videoQuality', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hd">HD (720p)</SelectItem>
                  <SelectItem value="fhd">Full HD (1080p)</SelectItem>
                  <SelectItem value="4k">4K (2160p)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="frameRate">Frame Rate</Label>
              <Select 
                value={settings.frameRate.toString()} 
                onValueChange={(value: any) => updateSetting('frameRate', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                  <SelectItem value="120">120 FPS (Slow Motion)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recordingDuration">Recording Duration (seconds)</Label>
              <div className="space-y-2">
                <Slider
                  value={[settings.recordingDuration]}
                  onValueChange={(value) => updateSetting('recordingDuration', value[0])}
                  max={10}
                  min={3}
                  step={1}
                />
                <div className="text-sm text-muted-foreground">
                  {settings.recordingDuration} seconds
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="autoCapture"
                checked={settings.autoCapture}
                onCheckedChange={(checked) => updateSetting('autoCapture', checked)}
              />
              <Label htmlFor="autoCapture">Auto-capture on shot detection</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="audioEnabled"
              checked={settings.audioFeedbackEnabled}
              onCheckedChange={(checked) => updateSetting('audioFeedbackEnabled', checked)}
            />
            <Label htmlFor="audioEnabled">Enable audio feedback</Label>
          </div>

          {settings.audioFeedbackEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="feedbackStyle">Feedback Style</Label>
                <Select 
                  value={settings.feedbackStyle} 
                  onValueChange={(value: any) => updateSetting('feedbackStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Detailed Analysis</SelectItem>
                    <SelectItem value="simple">Quick Tips</SelectItem>
                    <SelectItem value="encouragement">Positive Focus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="voiceType">Voice Type</Label>
                <Select 
                  value={settings.voiceType} 
                  onValueChange={(value: any) => updateSetting('voiceType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="volume">Volume</Label>
                <div className="space-y-2">
                  <Slider
                    value={[settings.volume]}
                    onValueChange={(value) => updateSetting('volume', value[0])}
                    max={100}
                    min={0}
                    step={5}
                  />
                  <div className="text-sm text-muted-foreground">
                    {settings.volume}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Analysis & Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sensitivity">Shot Detection Sensitivity</Label>
            <div className="space-y-2">
              <Slider
                value={[settings.shotDetectionSensitivity]}
                onValueChange={(value) => updateSetting('shotDetectionSensitivity', value[0])}
                max={100}
                min={25}
                step={5}
              />
              <div className="text-sm text-muted-foreground">
                {settings.shotDetectionSensitivity}% - {
                  settings.shotDetectionSensitivity < 50 ? 'Low (fewer false positives)' :
                  settings.shotDetectionSensitivity < 80 ? 'Medium (balanced)' :
                  'High (more sensitive)'
                }
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Analysis Features</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.arcAnalysisEnabled}
                    onCheckedChange={(checked) => updateSetting('arcAnalysisEnabled', checked)}
                  />
                  <Label>Arc Analysis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.depthAnalysisEnabled}
                    onCheckedChange={(checked) => updateSetting('depthAnalysisEnabled', checked)}
                  />
                  <Label>Depth Analysis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.deviationAnalysisEnabled}
                    onCheckedChange={(checked) => updateSetting('deviationAnalysisEnabled', checked)}
                  />
                  <Label>Left/Right Deviation</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Interface Options</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.showGrid}
                    onCheckedChange={(checked) => updateSetting('showGrid', checked)}
                  />
                  <Label>Show Court Grid</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.showTrajectoryLine}
                    onCheckedChange={(checked) => updateSetting('showTrajectoryLine', checked)}
                  />
                  <Label>Show Trajectory Line</Label>
                </div>
                <div>
                  <Label>Heatmap Intensity</Label>
                  <Select 
                    value={settings.heatmapIntensity} 
                    onValueChange={(value: any) => updateSetting('heatmapIntensity', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShotIQSettings;