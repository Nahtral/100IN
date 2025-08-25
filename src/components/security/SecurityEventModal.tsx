import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, Lock, Database, User, Calendar, Clock, Edit, Trash2, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

interface SecurityEventModalProps {
  event: SecurityEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  mode: 'view' | 'edit' | 'create';
}

const SecurityEventModal = ({ event, isOpen, onClose, onRefresh, mode }: SecurityEventModalProps) => {
  const [formData, setFormData] = useState({
    security_event_type: '',
    severity: '',
    description: '',
    ip_address: '',
    user_agent: '',
    metadata: {}
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (event && mode !== 'create') {
      const eventData = event.event_data || {};
      setFormData({
        security_event_type: eventData.security_event_type || '',
        severity: eventData.severity || '',
        description: eventData.description || '',
        ip_address: eventData.ip_address || '',
        user_agent: eventData.user_agent || '',
        metadata: eventData
      });
    } else if (mode === 'create') {
      setFormData({
        security_event_type: '',
        severity: 'medium',
        description: '',
        ip_address: '',
        user_agent: '',
        metadata: {}
      });
    }
  }, [event, mode]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth_failure': return <Lock className="h-4 w-4" />;
      case 'data_access': return <Database className="h-4 w-4" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4" />;
      case 'sql_injection_attempt': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleSave = async () => {
    if (!formData.security_event_type || !formData.severity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        ...formData.metadata,
        security_event_type: formData.security_event_type,
        severity: formData.severity,
        description: formData.description,
        ip_address: formData.ip_address,
        user_agent: formData.user_agent,
        timestamp: new Date().toISOString()
      };

      if (mode === 'create') {
        const { error } = await supabase.from('analytics_events').insert({
          event_type: 'security_event',
          event_data: eventData
        });
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Security event created successfully",
        });
      } else if (mode === 'edit' && event) {
        const { error } = await supabase
          .from('analytics_events')
          .update({ event_data: eventData })
          .eq('id', event.id);
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Security event updated successfully",
        });
      }

      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error saving security event:', error);
      toast({
        title: "Error",
        description: "Failed to save security event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('analytics_events')
        .delete()
        .eq('id', event.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Security event deleted successfully",
      });
      
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error deleting security event:', error);
      toast({
        title: "Error",
        description: "Failed to delete security event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!event) return;
    
    setLoading(true);
    try {
      const updatedData = {
        ...event.event_data,
        archived: true,
        archived_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('analytics_events')
        .update({ event_data: updatedData })
        .eq('id', event.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Security event archived successfully",
      });
      
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error archiving security event:', error);
      toast({
        title: "Error",
        description: "Failed to archive security event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? <Shield className="h-5 w-5" /> : getEventIcon(formData.security_event_type)}
            {mode === 'create' ? 'Create Security Event' : 
             mode === 'edit' ? 'Edit Security Event' : 'Security Event Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Summary Card */}
          {mode === 'view' && event && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getEventIcon((event.event_data as any)?.security_event_type)}
                    <span>{((event.event_data as any)?.security_event_type as string)?.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  <Badge className={getSeverityColor((event.event_data as any)?.severity)}>
                    {((event.event_data as any)?.severity as string)?.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(event.created_at).toLocaleTimeString()}
                  </div>
                  {event.user_id && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      User ID: {event.user_id.substring(0, 8)}...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.security_event_type}
                onValueChange={(value) => setFormData({ ...formData, security_event_type: value })}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auth_failure">Authentication Failure</SelectItem>
                  <SelectItem value="data_access">Data Access</SelectItem>
                  <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                  <SelectItem value="sql_injection_attempt">SQL Injection Attempt</SelectItem>
                  <SelectItem value="rate_limit_exceeded">Rate Limit Exceeded</SelectItem>
                  <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip_address">IP Address</Label>
              <Input
                id="ip_address"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                placeholder="192.168.1.1"
                readOnly={mode === 'view'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_agent">User Agent</Label>
              <Input
                id="user_agent"
                value={formData.user_agent}
                onChange={(e) => setFormData({ ...formData, user_agent: e.target.value })}
                placeholder="Browser/OS information"
                readOnly={mode === 'view'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the security event..."
              rows={4}
              readOnly={mode === 'view'}
            />
          </div>

          {/* Metadata Display */}
          {mode === 'view' && event?.event_data && (
            <Card>
              <CardHeader>
                <CardTitle>Event Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(event.event_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              {mode === 'view' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = `/security?edit=${event?.id}`}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleArchive}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {(mode === 'create' || mode === 'edit') && (
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityEventModal;