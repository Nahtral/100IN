import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Save, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const playerFormSchema = z.object({
  selected_user_id: z.string().optional(),
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().refine((val) => val === '' || z.string().email().safeParse(val).success, 'Invalid email address'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  position: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  jersey_number: z.number().int().positive().optional().or(z.literal('')),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  medical_notes: z.string().optional(),
});

type PlayerFormData = z.infer<typeof playerFormSchema>;

interface ApprovedPlayer {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

interface PlayerSelectionFormProps {
  onSubmit: (data: PlayerFormData) => void;
  isLoading?: boolean;
}

const PlayerSelectionForm: React.FC<PlayerSelectionFormProps> = ({ onSubmit, isLoading = false }) => {
  const [approvedPlayers, setApprovedPlayers] = useState<ApprovedPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const { toast } = useToast();

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      selected_user_id: '',
      full_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      position: '',
      height: '',
      weight: '',
      jersey_number: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_notes: '',
    },
  });

  const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];

  useEffect(() => {
    fetchApprovedPlayers();
  }, []);

  const fetchApprovedPlayers = async () => {
    try {
      setLoadingPlayers(true);
      
      // Use RPC function to get approved players with player role
      const { data, error } = await supabase.rpc('get_approved_players');

      if (error) throw error;

      const approvedPlayersList: ApprovedPlayer[] = (data || []).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name || '',
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        avatar_url: profile.avatar_url || undefined,
      }));

      setApprovedPlayers(approvedPlayersList);
    } catch (error) {
      console.error('Error fetching approved players:', error);
      // Fallback to empty array if RPC doesn't exist yet
      setApprovedPlayers([]);
      toast({
        title: "Info",
        description: "No approved players found",
        variant: "default",
      });
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handlePlayerSelection = (playerId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedPlayerId(playerId);
      const selectedPlayer = approvedPlayers.find(p => p.id === playerId);
      
      if (selectedPlayer) {
        // Auto-populate form with selected player's data
        form.setValue('selected_user_id', playerId);
        form.setValue('full_name', selectedPlayer.full_name || '');
        form.setValue('email', selectedPlayer.email || '');
        form.setValue('phone', selectedPlayer.phone || '');
      }
    } else {
      setSelectedPlayerId('');
      // Clear form when deselected
      form.reset();
    }
  };

  const handleSubmit = (data: PlayerFormData) => {
    onSubmit({
      ...data,
      selected_user_id: selectedPlayerId || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add New Player
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Player Selection Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Approved Player</h3>
              {loadingPlayers ? (
                <div className="text-center py-4">Loading approved players...</div>
              ) : approvedPlayers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No approved players found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {approvedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlayerId === player.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handlePlayerSelection(player.id, selectedPlayerId !== player.id)}
                    >
                      <Checkbox
                        checked={selectedPlayerId === player.id}
                        onChange={() => {}}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.full_name}</p>
                        {player.email && (
                          <p className="text-sm text-muted-foreground truncate">{player.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Player Information Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Player Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positions.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 6'2&quot;" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 180 lbs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="jersey_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jersey Number <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter jersey number" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emergency_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter emergency contact name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emergency_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter emergency contact phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="medical_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Notes <span className="text-muted-foreground">(Optional)</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any medical conditions, allergies, or notes..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Adding Player...' : 'Add Player to Team'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PlayerSelectionForm;