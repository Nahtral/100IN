import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/components/ui/use-toast';
import { Users, MessageCircle } from 'lucide-react';

interface CreateChatModalProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  open,
  onClose,
  onChatCreated,
}) => {
  const { user } = useAuth();
  const { isSuperAdmin, hasRole } = useUserRole();
  const { toast } = useToast();
  const [chatType, setChatType] = useState<'group' | 'private'>('private');
  const [chatName, setChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
      fetchTeams();
    }
  }, [open]);

  const fetchAvailableUsers = async () => {
    // Get all users with their profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name');

    // Get user roles separately
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('is_active', true);

    if (profiles) {
      const profilesWithRoles = profiles.map(profile => ({
        ...profile,
        user_roles: userRoles?.filter(ur => ur.user_id === profile.id) || []
      }));

      const filteredUsers = profilesWithRoles.filter(profile => {
        if (profile.id === user?.id) return false; // Exclude current user
        
        // For private chats, exclude coach users
        if (chatType === 'private') {
          const hasCoachRole = profile.user_roles.some((ur: any) => ur.role === 'coach');
          return !hasCoachRole;
        }
        
        return true;
      });
      
      setAvailableUsers(filteredUsers);
    }
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('name');
    
    setTeams(data || []);
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

    if (chatType === 'group' && !chatName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: chatType === 'group' ? chatName : null,
          chat_type: chatType,
          team_id: selectedTeam || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants
      const participants = [
        { chat_id: chat.id, user_id: user.id, role: 'admin' },
        ...selectedUsers.map(userId => ({
          chat_id: chat.id,
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
        description: `${chatType === 'group' ? 'Group' : 'Private'} chat created successfully`,
      });

      onChatCreated(chat.id);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chat Type Selection */}
          {isSuperAdmin && (
            <div className="space-y-3">
              <Label>Chat Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={chatType === 'private' ? 'default' : 'outline'}
                  onClick={() => setChatType('private')}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Private
                </Button>
                <Button
                  type="button"
                  variant={chatType === 'group' ? 'default' : 'outline'}
                  onClick={() => setChatType('group')}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Group
                </Button>
              </div>
            </div>
          )}

          {/* Group Name */}
          {chatType === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="chatName">Group Name</Label>
              <Input
                id="chatName"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
          )}

          {/* Team Selection for Group Chats */}
          {chatType === 'group' && teams.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="team">Team (Optional)</Label>
              <select
                id="team"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-3">
            <Label>
              Select Users 
              {chatType === 'private' && <span className="text-muted-foreground ml-1">(excludes coaches)</span>}
            </Label>
            
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map(userId => {
                  const user = availableUsers.find(u => u.id === userId);
                  return (
                    <Badge key={userId} variant="secondary">
                      {user?.full_name}
                    </Badge>
                  );
                })}
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {availableUsers.map(user => (
                <div key={user.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={user.id}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => handleUserToggle(user.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor={user.id} className="cursor-pointer">
                      {user.full_name}
                    </Label>
                    {user.user_roles && user.user_roles.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {user.user_roles.map((ur: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {ur.role}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={createChat}
              disabled={loading || selectedUsers.length === 0}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Chat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};