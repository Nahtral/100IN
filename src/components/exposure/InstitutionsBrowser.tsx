import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, MessageSquare, Globe, Phone, Mail } from "lucide-react";
import { useExposureContacts } from '@/hooks/useExposureContacts';
import { ContactDetailModal } from './ContactDetailModal';
import { format } from 'date-fns';

export interface Contact {
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

export const InstitutionsBrowser = () => {
  const [filters, setFilters] = useState({
    search_term: '',
    country: '',
    level: '',
    state_province: '',
    sport: '',
    department_category: '',
    verification_status: '',
    sort_by: 'institution_name'
  });
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: contacts, loading, error, refetch } = useExposureContacts(filters);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search_term: '',
      country: 'all',
      level: 'all',
      state_province: '',
      sport: '',
      department_category: 'all',
      verification_status: 'all',
      sort_by: 'institution_name'
    });
  };

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

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Contacts
          </CardTitle>
          <CardDescription>
            Find verified school contacts using advanced filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search institutions, contacts..."
                value={filters.search_term}
                onChange={(e) => handleFilterChange('search_term', e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={filters.country} onValueChange={(value) => handleFilterChange('country', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="USA">United States</SelectItem>
                <SelectItem value="CAN">Canada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="HS">High School</SelectItem>
                <SelectItem value="University">University</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.department_category} onValueChange={(value) => handleFilterChange('department_category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Admissions">Admissions</SelectItem>
                <SelectItem value="Athletics">Athletics</SelectItem>
                <SelectItem value="Academics">Academics</SelectItem>
                <SelectItem value="FinancialAid">Financial Aid</SelectItem>
                <SelectItem value="InternationalOffice">International Office</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="State/Province"
              value={filters.state_province}
              onChange={(e) => handleFilterChange('state_province', e.target.value)}
            />

            <Input
              placeholder="Sport"
              value={filters.sport}
              onChange={(e) => handleFilterChange('sport', e.target.value)}
            />

            <Select value={filters.verification_status} onValueChange={(value) => handleFilterChange('verification_status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Verification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="stale">Stale</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => refetch()} disabled={loading}>
              Search
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            {contacts?.length || 0} contacts found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading contacts...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading contacts: {error.message}
            </div>
          ) : !contacts?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found. Try adjusting your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contact.institution_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {contact.institution_level} • {contact.institution_country}
                            {contact.conference && ` • ${contact.conference}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {contact.contact_first_name} {contact.contact_last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {contact.contact_title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {contact.contact_email && (
                              <Mail className="h-3 w-3 text-muted-foreground" />
                            )}
                            {contact.contact_phone && (
                              <Phone className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline">{contact.department_category}</Badge>
                          {contact.department_name && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {contact.department_name}
                            </div>
                          )}
                          {contact.sport && (
                            <div className="text-sm text-muted-foreground">
                              {contact.sport}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {contact.city}, {contact.state_province}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getVerificationBadge(contact.verification_status, contact.last_verified_at)}
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(contact.last_verified_at), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {contact.data_source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewContact(contact)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
    </div>
  );
};