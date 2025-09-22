import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Globe, MessageSquare, UserPlus, Calendar, MapPin, Building } from "lucide-react";
import { format } from 'date-fns';

interface Contact {
  id: string;
  institution_id: string;
  institution_name: string;
  institution_level: 'HS' | 'University';
  institution_country: 'USA' | 'CAN';
  state_province: string;
  city: string;
  conference: string;
  department_id: string;
  department_name: string;
  department_category: 'Admissions' | 'Athletics' | 'Academics' | 'FinancialAid' | 'InternationalOffice' | 'Other';
  sport: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_title: string;
  contact_email: string;
  contact_phone: string;
  verification_status: 'verified' | 'stale' | 'bounced' | 'pending';
  last_verified_at: string;
  data_source: string;
}

interface ContactDetailModalProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  isOpen,
  onClose
}) => {
  const getVerificationBadge = (status: string, lastVerified: string) => {
    const daysSinceVerified = Math.floor(
      (new Date().getTime() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (status === 'bounced') {
      return <Badge variant="destructive">Bounced</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (daysSinceVerified <= 90) {
      return <Badge variant="default">Verified ≤90 days</Badge>;
    }
    return <Badge variant="outline">Stale</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Contact Details
          </DialogTitle>
          <DialogDescription>
            Complete contact information and verification status
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Institution Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Institution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{contact.institution_name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{contact.institution_level}</Badge>
                  <Badge variant="outline">{contact.institution_country}</Badge>
                  {contact.conference && (
                    <Badge variant="secondary">{contact.conference}</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.city}, {contact.state_province}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {contact.contact_first_name} {contact.contact_last_name}
                </h3>
                <p className="text-muted-foreground">{contact.contact_title}</p>
              </div>

              <div className="space-y-2">
                {contact.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${contact.contact_email}`}
                      className="text-primary hover:underline"
                    >
                      {contact.contact_email}
                    </a>
                  </div>
                )}

                {contact.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`tel:${contact.contact_phone}`}
                      className="text-primary hover:underline"
                    >
                      {contact.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Department Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Department</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">
                  {contact.department_category}
                </Badge>
                {contact.department_name && (
                  <p className="font-medium">{contact.department_name}</p>
                )}
                {contact.sport && (
                  <p className="text-sm text-muted-foreground">Sport: {contact.sport}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  {getVerificationBadge(contact.verification_status, contact.last_verified_at)}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Last verified: {format(new Date(contact.last_verified_at), 'PPP')}</span>
                </div>

                <div className="text-sm">
                  <span className="font-medium">Data Source:</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {contact.data_source}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Compose Message
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add to List
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Visit Website
          </Button>

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Outreach History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Outreach History</CardTitle>
            <CardDescription>
              Previous communications with this contact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No outreach history available
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};