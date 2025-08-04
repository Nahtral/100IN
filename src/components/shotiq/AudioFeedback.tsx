import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Mic, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ShotData {
  arc: number;
  depth: number;
  deviation: number;
  made: boolean;
}

interface AudioFeedbackProps {
  lastShot: ShotData | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const AudioFeedback: React.FC<AudioFeedbackProps> = ({ lastShot, enabled, onToggle }) => {
  const [volume, setVolume] = useState(80);
  const [voiceType, setVoiceType] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [feedbackStyle, setFeedbackStyle] = useState<'detailed' | 'simple' | 'encouragement'>('detailed');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (lastShot && enabled) {
      provideFeedback(lastShot);
    }
  }, [lastShot, enabled]);

  const generateFeedbackText = (shot: ShotData): string => {
    const { arc, depth, deviation, made } = shot;
    
    // Determine feedback based on shot quality
    const arcFeedback = arc < 35 ? "too flat" : arc > 55 ? "too high" : "good arc";
    const depthFeedback = depth < 6 ? "too short" : depth > 14 ? "too long" : "good depth";
    const deviationFeedback = Math.abs(deviation) > 2 ? 
      deviation > 0 ? "right" : "left" : "centered";

    switch (feedbackStyle) {
      case 'simple':
        if (made) return "Good shot!";
        return `${arcFeedback}, ${depthFeedback}`;
        
      case 'encouragement':
        if (made) return "Excellent! Perfect form!";
        return `Nice try! Work on your ${arcFeedback === "good arc" ? "depth" : "arc"}`;
        
      case 'detailed':
      default:
        const result = made ? "Made" : "Miss";
        return `${result}. Arc: ${arc} degrees, ${arcFeedback}. Depth: ${depth} inches, ${depthFeedback}. ${deviationFeedback}.`;
    }
  };

  const provideFeedback = async (shot: ShotData) => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    
    try {
      const feedbackText = generateFeedbackText(shot);
      
      // Call text-to-speech edge function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: feedbackText,
          voice: voiceType === 'male' ? 'onyx' : voiceType === 'female' ? 'nova' : 'alloy',
          speed: 1.1
        }
      });

      if (error) {
        console.error('TTS Error:', error);
        // Fallback to browser speech synthesis
        fallbackSpeech(feedbackText);
        return;
      }

      // Play the audio
      if (data.audioContent && audioRef.current) {
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))
        ], { type: 'audio/mp3' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        audioRef.current.volume = volume / 100;
        
        await audioRef.current.play();
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error('Audio feedback error:', error);
      fallbackSpeech(generateFeedbackText(shot));
    }
  };

  const fallbackSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume / 100;
      utterance.rate = 1.1;
      utterance.pitch = voiceType === 'male' ? 0.8 : voiceType === 'female' ? 1.2 : 1.0;
      
      utterance.onend = () => setIsPlaying(false);
      
      speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
    }
  };

  const testFeedback = () => {
    const testShot: ShotData = {
      arc: 45,
      depth: 10,
      deviation: 1,
      made: true
    };
    provideFeedback(testShot);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Feedback
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Volume</label>
            <span className="text-sm text-muted-foreground">{volume}%</span>
          </div>
          <div className="flex items-center gap-2">
            <VolumeX className="h-4 w-4" />
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={5}
              className="flex-1"
            />
            <Volume2 className="h-4 w-4" />
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Voice Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['neutral', 'male', 'female'] as const).map((voice) => (
              <Button
                key={voice}
                variant={voiceType === voice ? "default" : "outline"}
                size="sm"
                onClick={() => setVoiceType(voice)}
                className="capitalize"
              >
                {voice}
              </Button>
            ))}
          </div>
        </div>

        {/* Feedback Style */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Feedback Style</label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { key: 'detailed', label: 'Detailed Analysis', desc: 'Complete shot breakdown' },
              { key: 'simple', label: 'Quick Tips', desc: 'Brief corrections only' },
              { key: 'encouragement', label: 'Positive Focus', desc: 'Motivational feedback' }
            ].map((style) => (
              <Button
                key={style.key}
                variant={feedbackStyle === style.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedbackStyle(style.key as any)}
                className="justify-start h-auto p-3"
              >
                <div className="text-left">
                  <div className="font-medium">{style.label}</div>
                  <div className="text-xs text-muted-foreground">{style.desc}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Test Button */}
        <Button 
          onClick={testFeedback} 
          disabled={!enabled || isPlaying}
          variant="outline" 
          className="w-full"
        >
          <Mic className="w-4 h-4 mr-2" />
          {isPlaying ? "Playing..." : "Test Feedback"}
        </Button>

        {/* Real-time Status */}
        {enabled && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium text-primary">
              🎯 Audio Feedback Active
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Instant feedback after each shot
            </div>
          </div>
        )}

        {/* Hidden audio element for playback */}
        <audio ref={audioRef} style={{ display: 'none' }} />
      </CardContent>
    </Card>
  );
};

export default AudioFeedback;