import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Location {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const LocationsManagement = () => {
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Location[];
    }
  });

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('locations')
        .insert({ name, created_by: (await supabase.auth.getUser()).data.user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setNewLocationName('');
      setShowAddDialog(false);
      toast({ title: 'Location added successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add location', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Location> }) => {
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setEditingLocation(null);
      toast({ title: 'Location updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update location', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Location deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete location', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const handleToggleActive = (location: Location) => {
    updateLocationMutation.mutate({
      id: location.id,
      updates: { is_active: !location.is_active }
    });
  };

  const handleSaveEdit = () => {
    if (editingLocation && editingLocation.name.trim()) {
      updateLocationMutation.mutate({
        id: editingLocation.id,
        updates: { name: editingLocation.name.trim() }
      });
    }
  };

  const handleDelete = (location: Location) => {
    if (confirm(`Are you sure you want to delete "${location.name}"?`)) {
      deleteLocationMutation.mutate(location.id);
    }
  };

  const handleAddLocation = () => {
    if (newLocationName.trim()) {
      addLocationMutation.mutate(newLocationName.trim());
    }
  };

  if (isLoading) {
    return <div>Loading locations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Manage Locations</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="space-y-2">
        {locations.map((location) => (
          <Card key={location.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingLocation?.id === location.id ? (
                  <Input
                    value={editingLocation.name}
                    onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingLocation(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <span className={`font-medium ${!location.is_active ? 'text-muted-foreground' : ''}`}>
                    {location.name}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(location)}
                >
                  {location.is_active ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
                
                {editingLocation?.id === location.id ? (
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingLocation(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingLocation(location)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(location)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Location name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddLocation();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddLocation}
              disabled={!newLocationName.trim() || addLocationMutation.isPending}
            >
              {addLocationMutation.isPending ? 'Adding...' : 'Add Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};