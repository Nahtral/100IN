import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChatSettings } from '@/types/chat';

interface ChatSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentChatId?: string | null;
  currentChatName?: string;
  onRenameChat?: (chatId: string, newName: string) => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  open,
  onClose,
  currentChatId,
  currentChatName,
  onRenameChat
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    notifications: true,
    sound: true,
    message_preview: true,
    typing_indicators: true,
    read_receipts: true,
    auto_archive_days: 30,
    theme: 'auto'
  });
  const [chatName, setChatName] = useState('');

  useEffect(() => {
    if (open && user) {
      loadSettings();
    }
    if (open && currentChatName) {
      setChatName(currentChatName);
    }
  }, [open, user, currentChatName]);

  const loadSettings = async () => {
    // For now, we'll use default settings
    // In a real app, you'd fetch these from the database
    setSettings({
      notifications: true,
      sound: true,
      message_preview: true,
      typing_indicators: true,
      read_receipts: true,
      auto_archive_days: 30,
      theme: 'auto'
    });
  };

  const saveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Here you would save settings to the database
      // For now, we'll just simulate success
      
      toast({
        title: "Success",
        description: "Chat settings saved successfully"
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleRenameChat = async () => {
    if (!currentChatId || !onRenameChat || !chatName.trim()) return;

    try {
      await onRenameChat(currentChatId, chatName.trim());
      toast({
        title: "Success",
        description: "Chat renamed successfully"
      });
    } catch (error) {
      console.error('Error renaming chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to rename chat"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chat Name Rename */}
          {currentChatId && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Chat Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="chatName" className="text-sm">
                    Chat Name
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="chatName"
                      value={chatName}
                      onChange={(e) => setChatName(e.target.value)}
                      placeholder="Enter chat name..."
                    />
                    <Button 
                      size="sm" 
                      onClick={handleRenameChat}
                      disabled={!chatName.trim() || chatName === currentChatName}
                    >
                      Rename
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Notifications</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="text-sm">
                Enable notifications
              </Label>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => updateSetting('notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sound" className="text-sm">
                Sound notifications
              </Label>
              <Switch
                id="sound"
                checked={settings.sound}
                onCheckedChange={(checked) => updateSetting('sound', checked)}
                disabled={!settings.notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="preview" className="text-sm">
                Message preview
              </Label>
              <Switch
                id="preview"
                checked={settings.message_preview}
                onCheckedChange={(checked) => updateSetting('message_preview', checked)}
                disabled={!settings.notifications}
              />
            </div>
          </div>

          <Separator />

          {/* Privacy */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Privacy</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="typing" className="text-sm">
                Typing indicators
              </Label>
              <Switch
                id="typing"
                checked={settings.typing_indicators}
                onCheckedChange={(checked) => updateSetting('typing_indicators', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="receipts" className="text-sm">
                Read receipts
              </Label>
              <Switch
                id="receipts"
                checked={settings.read_receipts}
                onCheckedChange={(checked) => updateSetting('read_receipts', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Auto-archive */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Auto-archive</h3>
            
            <div className="space-y-2">
              <Label htmlFor="archive" className="text-sm">
                Archive inactive chats after
              </Label>
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

          {/* Appearance */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Appearance</h3>
            
            <div className="space-y-2">
              <Label htmlFor="theme" className="text-sm">
                Theme
              </Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => updateSetting('theme', value as 'light' | 'dark' | 'auto')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
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
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};