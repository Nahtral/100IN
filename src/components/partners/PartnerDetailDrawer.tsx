import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Edit, MessageSquare } from 'lucide-react';
import { Partner, usePartnerData } from '@/hooks/usePartnerData';
import { format } from 'date-fns';

interface PartnerDetailDrawerProps {
  partner: Partner | null;
  open: boolean;
  onClose: () => void;
  onEdit: (partner: Partner) => void;
}

export const PartnerDetailDrawer: React.FC<PartnerDetailDrawerProps> = ({
  partner,
  open,
  onClose,
  onEdit,
}) => {
  const { fetchNotes, notes, addNote, loading } = usePartnerData();
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (partner?.id && open) {
      fetchNotes(partner.id);
    }
  }, [partner?.id, open]);

  const handleAddNote = async () => {
    if (!partner?.id || !newNote.trim()) return;
    
    try {
      await addNote(partner.id, undefined, newNote.trim());
      setNewNote('');
      fetchNotes(partner.id); // Refresh notes
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!partner) return null;

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-4xl mx-auto max-h-[90vh]">
        <DrawerHeader>
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle className="text-2xl">{partner.name}</DrawerTitle>
              <DrawerDescription className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(partner.status)}>
                  {partner.status}
                </Badge>
                <Badge variant="outline">{partner.partnership_type}</Badge>
              </DrawerDescription>
            </div>
            <Button onClick={() => onEdit(partner)} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-6 pb-6 overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sponsorships">Sponsorships</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{partner.contact_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{partner.contact_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{partner.contact_phone || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Partnership Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Partnership Value</p>
                      <p className="font-medium text-lg">
                        {formatCurrency(partner.partnership_value || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contract Period</p>
                      <p className="font-medium">
                        {partner.contract_start_date 
                          ? format(new Date(partner.contract_start_date), 'MMM dd, yyyy')
                          : 'Not set'
                        } - {
                        partner.contract_end_date
                          ? format(new Date(partner.contract_end_date), 'MMM dd, yyyy')
                          : 'Ongoing'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Partnership Type</p>
                      <p className="font-medium capitalize">{partner.partnership_type}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {partner.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{partner.description}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Partnership Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{partner.total_sponsorships}</p>
                      <p className="text-sm text-muted-foreground">Total Sponsorships</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{partner.active_sponsorships}</p>
                      <p className="text-sm text-muted-foreground">Active Sponsorships</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(partner.total_sponsorship_value || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Sponsorship Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sponsorships" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sponsorship History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sponsorship details would be loaded here from the sponsorships API.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Communication Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a new note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddNote} 
                      disabled={!newNote.trim() || loading}
                      size="sm"
                    >
                      Add Note
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No notes yet. Add the first note above.
                      </p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{note.author_name || 'Unknown User'}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                          <p className="text-muted-foreground">{note.note_body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
};