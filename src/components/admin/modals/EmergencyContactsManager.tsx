import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EmergencyContactForm } from './EmergencyContactForm';
import { 
  Phone, 
  Mail, 
  MapPin, 
  UserPlus, 
  Edit, 
  Trash2,
  Star
} from 'lucide-react';

interface EmergencyContact {
  id: string;
  employee_id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  is_primary: boolean;
  created_at: string;
}

interface EmergencyContactsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export const EmergencyContactsManager: React.FC<EmergencyContactsManagerProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName
}) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | undefined>();

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen, employeeId]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // Using employees table for now - get emergency contact fields
      const { data, error } = await supabase
        .from('employees')
        .select('id, emergency_contact_name, emergency_contact_phone')
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      
      // Transform to match our interface
      const contactsData = data?.emergency_contact_name ? [{
        id: data.id,
        employee_id: employeeId,
        name: data.emergency_contact_name,
        relationship: 'Emergency Contact',
        phone: data.emergency_contact_phone || '',
        is_primary: true,
        created_at: new Date().toISOString()
      }] : [];
      
      setContacts(contactsData);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load emergency contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) {
      return;
    }

    try {
      // For now, just clear the emergency contact from employees table
      const { error } = await supabase
        .from('employees')
        .update({
          emergency_contact_name: null,
          emergency_contact_phone: null
        })
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Emergency contact deleted successfully"
      });

      fetchContacts();
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete emergency contact",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    fetchContacts();
    setShowForm(false);
    setEditingContact(undefined);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogDescription className="sr-only">
            Emergency contacts management for {employeeName}
          </DialogDescription>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contacts - {employeeName}
              </DialogTitle>
              <Button onClick={() => setShowForm(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading contacts...</div>
            ) : contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <Card key={contact.id} className="relative">
                    {contact.is_primary && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Primary
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{contact.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {contact.relationship}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(contact)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contact.email}</span>
                          </div>
                        )}
                        {contact.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contact.address}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No emergency contacts found</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setShowForm(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Contact
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EmergencyContactForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingContact(undefined);
        }}
        employeeId={employeeId}
        employeeName={employeeName}
        contact={editingContact}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};