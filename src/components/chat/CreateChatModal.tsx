import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CreateChatModalProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string | null) => void;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface Team {
  id: string;
  name: string;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  open,
  onClose,
  onChatCreated
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [chatType, setChatType] = useState<'private' | 'group' | 'team'>('private');
  const [chatName, setChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchAvailableUsers();
      if (chatType === 'team') {
        fetchTeams();
      }
    }
  }, [open, user, chatType]);

  const fetchAvailableUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          user_roles (
            role,
            is_active
          )
        `)
        .neq('id', user?.id);

      if (error) throw error;

      const users = data.map(profile => ({
        id: profile.id,
        full_name: profile.full_name || profile.email,
        email: profile.email,
        role: profile.user_roles?.find((ur: any) => ur.is_active)?.role
      }));

      setAvailableUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createChat = async () => {
    if (!user) return;

    if (selectedUsers.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one participant"
      });
      return;
    }

    if (chatType === 'group' && !chatName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a group name"
      });
      return;
    }

    setLoading(true);
    try {
      const chatData = {
        name: chatName.trim() || (chatType === 'private' ? 'Private Chat' : 'New Chat'),
        chat_type: chatType,
        created_by: user.id,
        team_id: chatType === 'team' ? selectedTeam : null
      };

      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert(chatData)
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants including the creator
      const participants = [
        { chat_id: newChat.id, user_id: user.id, role: 'admin' },
        ...selectedUsers.map(userId => ({
          chat_id: newChat.id,
          user_id: userId,
          role: 'member'
        }))
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: "Success",
        description: "Chat created successfully"
      });

      onChatCreated(newChat.id);
      resetForm();
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create chat"
      });
      onChatCreated(null);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setChatType('private');
    setChatName('');
    setSelectedUsers([]);
    setSelectedTeam('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getSelectedUsersList = () => {
    return selectedUsers.map(userId => {
      const user = availableUsers.find(u => u.id === userId);
      return user?.full_name || user?.email || 'Unknown';
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chat Type */}
          <div>
            <Label className="text-sm font-medium">Chat Type</Label>
            <RadioGroup
              value={chatType}
              onValueChange={(value) => setChatType(value as any)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private">Private Chat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group">Group Chat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team">Team Chat</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Chat Name (for group chats) */}
          {chatType === 'group' && (
            <div>
              <Label htmlFor="chatName">Group Name</Label>
              <Input
                id="chatName"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Enter group name"
                className="mt-1"
              />
            </div>
          )}

          {/* Team Selection (for team chats) */}
          {chatType === 'team' && (
            <div>
              <Label>Select Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Selected Participants</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {getSelectedUsersList().map((name, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => handleUserToggle(selectedUsers[index])}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* User Selection */}
          <div>
            <Label className="text-sm font-medium">Add Participants</Label>
            <ScrollArea className="h-48 mt-2 border rounded-md">
              <div className="p-4">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading users...</span>
                  </div>
                ) : availableUsers.length > 0 ? (
                  <div className="space-y-2">
                    {availableUsers.map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={user.id}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                        />
                        <Label
                          htmlFor={user.id}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          <div>
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-muted-foreground ml-2">
                              {user.email}
                            </span>
                            {user.role && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {user.role}
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No users available
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={createChat}
              disabled={selectedUsers.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Chat'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};