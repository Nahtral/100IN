import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  roles?: string[];
  last_sign_in?: string;
  status: 'active' | 'inactive';
}

interface TeamData {
  id: string;
  name: string;
  age_group: string;
  season: string;
  coach_id?: string;
  coach_name?: string;
  created_at: string;
}

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: UserData | null;
  teams: TeamData[];
  coaches: UserData[];
  parents: UserData[];
  onSave: (formData: FormData) => Promise<void>;
}

export const UserDialog: React.FC<UserDialogProps> = ({
  isOpen,
  onClose,
  selectedUser,
  teams,
  coaches,
  parents,
  onSave
}) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isPlayerActive, setIsPlayerActive] = useState(true);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const { toast } = useToast();

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (isOpen && selectedUser) {
      console.log('UserDialog opened, selectedUser:', selectedUser);
      setSelectedRole(selectedUser?.roles?.[0] || '');
      
      // Fetch player data if user is a player
      if (selectedUser.roles?.includes('player')) {
        fetchPlayerDetails(selectedUser.id);
      } else {
        // Reset to defaults for non-players
        setSelectedTeam('');
        setIsPlayerActive(true);
        setSelectedParents([]);
      }
    } else if (!isOpen) {
      // Reset form when dialog closes
      setSelectedRole('');
      setSelectedTeam('');
      setIsPlayerActive(true);
      setSelectedParents([]);
    }
  }, [isOpen, selectedUser]);

  const fetchPlayerDetails = async (userId: string) => {
    try {
      console.log('Fetching player details for userId:', userId);
      const { data: playerData } = await supabase
        .from('players')
        .select('team_id, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (playerData) {
        setSelectedTeam(playerData.team_id || '');
        setIsPlayerActive(playerData.is_active);
      }

      // Fetch parent relationships
      const { data: relationships } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', userId);

      if (relationships) {
        setSelectedParents(relationships.map(r => r.parent_id));
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted, selectedUser:', selectedUser);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Add additional form data
      formData.append('team_id', selectedTeam);
      formData.append('is_active', isPlayerActive.toString());
      formData.append('parent_ids', JSON.stringify(selectedParents));
      
      console.log('Calling onSave with formData');
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error in handleFormSubmit:', error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleParentToggle = (parentId: string, checked: boolean) => {
    if (checked) {
      setSelectedParents(prev => [...prev, parentId]);
    } else {
      setSelectedParents(prev => prev.filter(id => id !== parentId));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-background border border-border">
        <DialogHeader>
          <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={selectedUser?.full_name || ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={selectedUser?.email || ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={selectedUser?.phone || ''}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              name="role" 
              value={selectedRole} 
              onValueChange={setSelectedRole}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRole === 'player' && (
            <>
              <div className="space-y-2">
                <Label>Player Settings</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Assign to Team</Label>
                <Select name="team_id" value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="playerActive"
                  checked={isPlayerActive}
                  onCheckedChange={setIsPlayerActive}
                />
                <Label htmlFor="playerActive">Active Player</Label>
              </div>

              <div className="space-y-2">
                <Label>Assign Parents/Guardians</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {parents && parents.length > 0 ? (
                    parents.map((parent) => (
                      <div key={parent.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={parent.id}
                          checked={selectedParents.includes(parent.id)}
                          onCheckedChange={(checked) => handleParentToggle(parent.id, !!checked)}
                        />
                        <Label htmlFor={parent.id} className="text-sm">
                          {parent.full_name} ({parent.email})
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No parent users found</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};