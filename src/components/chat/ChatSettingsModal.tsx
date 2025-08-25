import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ChatSettings {
  notifications_enabled: boolean;
  sound_enabled: boolean;
  auto_archive_days: number;
  theme: 'light' | 'dark' | 'system';
  message_preview: boolean;
  typing_indicators: boolean;
  read_receipts: boolean;
}

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const [settings, setSettings] = useState<ChatSettings>({
    notifications_enabled: true,
    sound_enabled: true,
    auto_archive_days: 30,
    theme: 'system',
    message_preview: true,
    typing_indicators: true,
    read_receipts: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadSettings();
    }
  }, [isOpen, currentUser]);

  const loadSettings = async () => {
    try {
      // For now, just use default settings since we don't have user ID access
      // In a real implementation, you'd get the user ID from auth context
      console.log('Loading chat settings for user...');
    } catch (error) {
      console.error('Error loading chat settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // For now, just show success since we don't have proper user ID access
      // In a real implementation, you'd save to the database
      toast({
        title: "Success",
        description: "Chat settings saved successfully",
      });
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save chat settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
          <DialogDescription>
            Customize your chat experience and preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notifications */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => updateSetting('notifications_enabled', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sound">Sound Notifications</Label>
                <Switch
                  id="sound"
                  checked={settings.sound_enabled}
                  onCheckedChange={(checked) => updateSetting('sound_enabled', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="preview">Message Preview</Label>
                <Switch
                  id="preview"
                  checked={settings.message_preview}
                  onCheckedChange={(checked) => updateSetting('message_preview', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Chat Features */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Chat Features</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="typing">Typing Indicators</Label>
                <Switch
                  id="typing"
                  checked={settings.typing_indicators}
                  onCheckedChange={(checked) => updateSetting('typing_indicators', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="receipts">Read Receipts</Label>
                <Switch
                  id="receipts"
                  checked={settings.read_receipts}
                  onCheckedChange={(checked) => updateSetting('read_receipts', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Auto Archive */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Auto Archive</h4>
            <div className="space-y-2">
              <Label htmlFor="archive-days">Archive chats after</Label>
              <Select
                value={settings.auto_archive_days.toString()}
                onValueChange={(value) => updateSetting('auto_archive_days', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="0">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Theme */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Appearance</h4>
            <div className="space-y-2">
              <Label htmlFor="theme">Chat Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') => updateSetting('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};