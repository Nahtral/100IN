import React, { useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  is_active: boolean;
}

interface LocationSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  error?: string;
}

export const LocationSelector = ({ value, onValueChange, error }: LocationSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Fetch locations with search
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
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
        .select('id, name, is_active')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onValueChange(data.id);
      setNewLocationName('');
      setShowAddDialog(false);
      setOpen(false);
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

  const selectedLocation = locations.find(loc => loc.id === value);

  const handleAddLocation = () => {
    if (newLocationName.trim()) {
      addLocationMutation.mutate(newLocationName.trim());
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              error && "border-red-500"
            )}
          >
            {selectedLocation ? selectedLocation.name : "Select location..."}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder="Search locations..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">No locations found.</p>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddDialog(true);
                        setNewLocationName(searchQuery);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add "{searchQuery || 'new location'}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {locations.map((location) => (
                  <CommandItem
                    key={location.id}
                    value={location.id}
                    onSelect={() => {
                      onValueChange(location.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === location.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {location.name}
                  </CommandItem>
                ))}
                {isSuperAdmin && locations.length > 0 && (
                  <CommandItem
                    onSelect={() => {
                      setShowAddDialog(true);
                      setNewLocationName(searchQuery);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add new location
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

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
    </>
  );
};