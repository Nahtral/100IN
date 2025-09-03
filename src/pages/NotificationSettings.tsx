import React, { useState } from 'react';
import { ArrowLeft, Bell, Volume2, VolumeX, Monitor, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import Layout from '@/components/layout/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';

export default function NotificationSettings() {
  const { currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preferences, loading, updatePreferences, requestDesktopPermission, isMuted, muteFor } = useNotificationPreferences();
  const [customMuteHours, setCustomMuteHours] = useState('');

  const handleSoundToggle = async (enabled: boolean) => {
    await updatePreferences({ sound_enabled: enabled });
    if (enabled) {
      notificationSound.play(); // Test sound
    }
  };

  const handleDesktopToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestDesktopPermission();
      if (!granted) return;
    } else {
      await updatePreferences({ desktop_push_enabled: enabled });
    }
  };

  const handleSeverityFilterChange = async (severity: string, checked: boolean) => {
    if (!preferences) return;

    const newFilters = checked 
      ? [...preferences.severity_filters, severity]
      : preferences.severity_filters.filter(s => s !== severity);

    await updatePreferences({ severity_filters: newFilters });
  };

  const handleQuickMute = async (hours: number) => {
    await muteFor(hours);
    toast({
      title: "Notifications Muted",
      description: `Notifications muted for ${hours} hour${hours > 1 ? 's' : ''}`
    });
  };

  const handleCustomMute = async () => {
    const hours = parseFloat(customMuteHours);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number of hours",
        variant: "destructive"
      });
      return;
    }

    await muteFor(hours);
    setCustomMuteHours('');
    toast({
      title: "Notifications Muted",
      description: `Notifications muted for ${hours} hour${hours > 1 ? 's' : ''}`
    });
  };

  const handleUnmute = async () => {
    await updatePreferences({ mute_until: null });
    toast({
      title: "Unmuted",
      description: "Notifications are now enabled"
    });
  };

  if (loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notification Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your notification preferences and sound settings
            </p>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Sound Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 size={20} />
                Sound Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sound-enabled">Enable notification sounds</Label>
                  <p className="text-sm text-muted-foreground">
                    Play a sound when new notifications arrive
                  </p>
                </div>
                <Switch
                  id="sound-enabled"
                  checked={preferences?.sound_enabled || false}
                  onCheckedChange={handleSoundToggle}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => notificationSound.play()}>
                  Test Sound
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor size={20} />
                Desktop Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="desktop-enabled">Enable desktop notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications even when the app is not active
                  </p>
                </div>
                <Switch
                  id="desktop-enabled"
                  checked={preferences?.desktop_push_enabled || false}
                  onCheckedChange={handleDesktopToggle}
                />
              </div>
              
              {!('Notification' in window) && (
                <p className="text-sm text-destructive mt-2">
                  Desktop notifications are not supported in this browser
                </p>
              )}
              
              {Notification.permission === 'denied' && (
                <p className="text-sm text-destructive mt-2">
                  Desktop notification permission has been denied. Please enable it in your browser settings.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Mute Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Mute Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMuted() && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <VolumeX size={16} />
                      <span className="font-medium">Notifications are muted</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleUnmute}>
                      Unmute
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Muted until: {preferences?.mute_until ? 
                      new Date(preferences.mute_until).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              )}

              <div>
                <Label>Quick mute options</Label>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickMute(1)}>
                    1 hour
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickMute(4)}>
                    4 hours
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickMute(8)}>
                    8 hours
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickMute(24)}>
                    1 day
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="custom-mute">Custom mute duration</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="custom-mute"
                    type="number"
                    placeholder="Hours"
                    value={customMuteHours}
                    onChange={(e) => setCustomMuteHours(e.target.value)}
                    className="w-24"
                  />
                  <Button variant="outline" size="sm" onClick={handleCustomMute}>
                    Mute
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} />
                Notification Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Which notification priorities should trigger sounds and desktop notifications?</Label>
                <div className="space-y-3 mt-4">
                  {[
                    { id: 'urgent', label: 'Urgent', description: 'Critical notifications that require immediate attention' },
                    { id: 'high', label: 'High', description: 'Important notifications that should be noticed soon' },
                    { id: 'normal', label: 'Normal', description: 'Standard notifications for general updates' },
                    { id: 'low', label: 'Low', description: 'Minor notifications and informational updates' }
                  ].map((severity) => (
                    <div key={severity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={severity.id}
                        checked={preferences?.severity_filters.includes(severity.id) || false}
                        onCheckedChange={(checked) => 
                          handleSeverityFilterChange(severity.id, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor={severity.id} className="font-medium">
                          {severity.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {severity.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={() => toast({ title: "Settings saved automatically" })}>
              Settings are saved automatically
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}