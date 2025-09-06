import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  MessageSquare, 
  Calendar as CalendarIcon,
  Send,
  Phone,
  Mail,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Edit,
  Trash2,
  Eye,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CommunicationRecord {
  id: string;
  type: 'message' | 'meeting' | 'report' | 'call';
  subject: string;
  content: string;
  recipient: string;
  status: 'sent' | 'pending' | 'scheduled' | 'completed';
  created_at: string;
  scheduled_for?: string;
}

interface CommunicationCenterProps {
  partnerId?: string;
  teamId?: string;
}

const CommunicationCenter = ({ partnerId, teamId }: CommunicationCenterProps) => {
  const { toast } = useToast();
  const { isSuperAdmin } = useOptimizedAuth();
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [showRequestReport, setShowRequestReport] = useState(false);
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<CommunicationRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states
  const [messageForm, setMessageForm] = useState({
    recipient: '',
    subject: '',
    content: '',
    priority: 'normal'
  });
  
  const [meetingForm, setMeetingForm] = useState({
    attendees: '',
    subject: '',
    agenda: '',
    date: undefined as Date | undefined,
    time: '',
    duration: '60'
  });
  
  const [reportForm, setReportForm] = useState({
    reportType: '',
    period: '',
    details: '',
    deadline: undefined as Date | undefined
  });

  const [callForm, setCallForm] = useState({
    recipient: '',
    purpose: '',
    date: undefined as Date | undefined,
    time: '',
    duration: '30',
    notes: ''
  });

  useEffect(() => {
    fetchCommunications();
  }, [partnerId, teamId]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      
      // Fetch communication records (simulated for now)
      // In a real implementation, this would fetch from a communications table
      const mockCommunications: CommunicationRecord[] = [
        {
          id: '1',
          type: 'message',
          subject: 'Q1 Performance Review',
          content: 'Quarterly performance discussion',
          recipient: 'Team Manager',
          status: 'sent',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          type: 'meeting',
          subject: 'Partnership Renewal Discussion',
          content: 'Discuss renewal terms for next season',
          recipient: 'Executive Team',
          status: 'scheduled',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          scheduled_for: new Date(Date.now() + 86400000).toISOString()
        },
        {
          id: '3',
          type: 'report',
          subject: 'Monthly Analytics Report',
          content: 'Comprehensive performance analytics',
          recipient: 'Analytics Team',
          status: 'completed',
          created_at: new Date(Date.now() - 259200000).toISOString()
        }
      ];
      
      setCommunications(mockCommunications);
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        title: "Error",
        description: "Failed to load communication history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    try {
      setLoading(true);
      
      // Log communication event
      const { error: analyticsError } = await supabase
        .from('analytics_events')
        .insert({
          event_type: 'partner_communication',
          event_data: {
            type: 'message',
            subject: messageForm.subject,
            recipient: messageForm.recipient,
            priority: messageForm.priority
          }
        });

      if (analyticsError) throw analyticsError;

      // Create new communication record
      const newCommunication: CommunicationRecord = {
        id: Date.now().toString(),
        type: 'message',
        subject: messageForm.subject,
        content: messageForm.content,
        recipient: messageForm.recipient,
        status: 'sent',
        created_at: new Date().toISOString()
      };

      setCommunications(prev => [newCommunication, ...prev]);
      
      // Reset form
      setMessageForm({
        recipient: '',
        subject: '',
        content: '',
        priority: 'normal'
      });
      
      setShowNewMessage(false);
      
      toast({
        title: "Success",
        description: "Message sent successfully.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeeting = async () => {
    try {
      setLoading(true);
      
      // Log communication event
      const { error: analyticsError } = await supabase
        .from('analytics_events')
        .insert({
          event_type: 'partner_communication',
          event_data: {
            type: 'meeting',
            subject: meetingForm.subject,
            attendees: meetingForm.attendees,
            scheduled_for: meetingForm.date?.toISOString()
          }
        });

      if (analyticsError) throw analyticsError;

      // Create new meeting record
      const scheduledDateTime = meetingForm.date && meetingForm.time 
        ? new Date(`${format(meetingForm.date, 'yyyy-MM-dd')}T${meetingForm.time}`)
        : undefined;

      const newMeeting: CommunicationRecord = {
        id: Date.now().toString(),
        type: 'meeting',
        subject: meetingForm.subject,
        content: meetingForm.agenda,
        recipient: meetingForm.attendees,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        scheduled_for: scheduledDateTime?.toISOString()
      };

      setCommunications(prev => [newMeeting, ...prev]);
      
      // Reset form
      setMeetingForm({
        attendees: '',
        subject: '',
        agenda: '',
        date: undefined,
        time: '',
        duration: '60'
      });
      
      setShowScheduleMeeting(false);
      
      toast({
        title: "Success",
        description: "Meeting scheduled successfully.",
      });
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: "Error",
        description: "Failed to schedule meeting.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReport = async () => {
    try {
      setLoading(true);
      
      // Log communication event
      const { error: analyticsError } = await supabase
        .from('analytics_events')
        .insert({
          event_type: 'partner_communication',
          event_data: {
            type: 'report_request',
            reportType: reportForm.reportType,
            period: reportForm.period,
            deadline: reportForm.deadline?.toISOString()
          }
        });

      if (analyticsError) throw analyticsError;

      // Create new report request
      const newReport: CommunicationRecord = {
        id: Date.now().toString(),
        type: 'report',
        subject: `${reportForm.reportType} Report Request`,
        content: reportForm.details,
        recipient: 'Analytics Team',
        status: 'pending',
        created_at: new Date().toISOString(),
        scheduled_for: reportForm.deadline?.toISOString()
      };

      setCommunications(prev => [newReport, ...prev]);
      
      // Reset form
      setReportForm({
        reportType: '',
        period: '',
        details: '',
        deadline: undefined
      });
      
      setShowRequestReport(false);
      
      toast({
        title: "Success",
        description: "Report request submitted successfully.",
      });
    } catch (error) {
      console.error('Error requesting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCall = async () => {
    try {
      setLoading(true);
      
      // Log communication event
      const { error: analyticsError } = await supabase
        .from('analytics_events')
        .insert({
          event_type: 'partner_communication',
          event_data: {
            type: 'call',
            purpose: callForm.purpose,
            recipient: callForm.recipient,
            scheduled_for: callForm.date?.toISOString()
          }
        });

      if (analyticsError) throw analyticsError;

      // Create new call record
      const scheduledDateTime = callForm.date && callForm.time 
        ? new Date(`${format(callForm.date, 'yyyy-MM-dd')}T${callForm.time}`)
        : undefined;

      const newCall: CommunicationRecord = {
        id: Date.now().toString(),
        type: 'call',
        subject: `Call: ${callForm.purpose}`,
        content: callForm.notes,
        recipient: callForm.recipient,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        scheduled_for: scheduledDateTime?.toISOString()
      };

      setCommunications(prev => [newCall, ...prev]);
      
      // Reset form
      setCallForm({
        recipient: '',
        purpose: '',
        date: undefined,
        time: '',
        duration: '30',
        notes: ''
      });
      
      setShowScheduleCall(false);
      
      toast({
        title: "Success",
        description: "Call scheduled successfully.",
      });
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast({
        title: "Error",
        description: "Failed to schedule call.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCommunication = (communication: CommunicationRecord) => {
    setSelectedCommunication(communication);
    setShowEditModal(true);
  };

  const handleDeleteCommunication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this communication record?')) {
      return;
    }

    try {
      setCommunications(prev => prev.filter(comm => comm.id !== id));
      
      toast({
        title: "Success",
        description: "Communication record deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting communication:', error);
      toast({
        title: "Error",
        description: "Failed to delete communication record.",
        variant: "destructive",
      });
    }
  };

  const updateCommunicationStatus = async (id: string, newStatus: string) => {
    try {
      setCommunications(prev => 
        prev.map(comm => 
          comm.id === id ? { ...comm, status: newStatus as any } : comm
        )
      );
      
      toast({
        title: "Success",
        description: "Communication status updated.",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'scheduled':
        return <CalendarIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'meeting':
        return <CalendarIcon className="h-4 w-4" />;
      case 'report':
        return <FileText className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Communication Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
          <DialogTrigger asChild>
            <Button className="mobile-btn bg-gradient-to-r from-blue-500 to-blue-600 h-auto py-4">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>Send Message</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Recipient</label>
                <Select value={messageForm.recipient} onValueChange={(value) => setMessageForm(prev => ({ ...prev, recipient: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_manager">Team Manager</SelectItem>
                    <SelectItem value="coach">Head Coach</SelectItem>
                    <SelectItem value="admin">Administration</SelectItem>
                    <SelectItem value="marketing">Marketing Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Message subject"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={messageForm.content}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Type your message..."
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={messageForm.priority} onValueChange={(value) => setMessageForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSendMessage} disabled={loading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showScheduleMeeting} onOpenChange={setShowScheduleMeeting}>
          <DialogTrigger asChild>
            <Button className="mobile-btn bg-gradient-to-r from-green-500 to-green-600 h-auto py-4">
              <div className="flex flex-col items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                <span>Schedule Meeting</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Attendees</label>
                <Input
                  value={meetingForm.attendees}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, attendees: e.target.value }))}
                  placeholder="Enter attendee names"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={meetingForm.subject}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Meeting subject"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {meetingForm.date ? format(meetingForm.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={meetingForm.date}
                      onSelect={(date) => setMeetingForm(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (min)</label>
                  <Select value={meetingForm.duration} onValueChange={(value) => setMeetingForm(prev => ({ ...prev, duration: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Agenda</label>
                <Textarea
                  value={meetingForm.agenda}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, agenda: e.target.value }))}
                  placeholder="Meeting agenda..."
                  rows={3}
                />
              </div>
              <Button onClick={handleScheduleMeeting} disabled={loading} className="w-full">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRequestReport} onOpenChange={setShowRequestReport}>
          <DialogTrigger asChild>
            <Button className="mobile-btn bg-gradient-to-r from-purple-500 to-purple-600 h-auto py-4">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Request Report</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Performance Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Report Type</label>
                <Select value={reportForm.reportType} onValueChange={(value) => setReportForm(prev => ({ ...prev, reportType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance Analytics</SelectItem>
                    <SelectItem value="roi">ROI Analysis</SelectItem>
                    <SelectItem value="engagement">Engagement Metrics</SelectItem>
                    <SelectItem value="attendance">Attendance Report</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Period</label>
                <Select value={reportForm.period} onValueChange={(value) => setReportForm(prev => ({ ...prev, period: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Deadline</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportForm.deadline ? format(reportForm.deadline, "PPP") : "Pick a deadline"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reportForm.deadline}
                      onSelect={(date) => setReportForm(prev => ({ ...prev, deadline: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">Additional Details</label>
                <Textarea
                  value={reportForm.details}
                  onChange={(e) => setReportForm(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="Any specific requirements..."
                  rows={3}
                />
              </div>
              <Button onClick={handleRequestReport} disabled={loading} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showScheduleCall} onOpenChange={setShowScheduleCall}>
          <DialogTrigger asChild>
            <Button className="mobile-btn bg-black hover:bg-gray-800 h-auto py-4">
              <div className="flex flex-col items-center gap-2">
                <Phone className="h-5 w-5" />
                <span>Schedule Call</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Call With</label>
                <Select value={callForm.recipient} onValueChange={(value) => setCallForm(prev => ({ ...prev, recipient: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_manager">Team Manager</SelectItem>
                    <SelectItem value="head_coach">Head Coach</SelectItem>
                    <SelectItem value="executive_team">Executive Team</SelectItem>
                    <SelectItem value="marketing_director">Marketing Director</SelectItem>
                    <SelectItem value="partnership_manager">Partnership Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Purpose</label>
                <Input
                  value={callForm.purpose}
                  onChange={(e) => setCallForm(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Call purpose or topic"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {callForm.date ? format(callForm.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={callForm.date}
                      onSelect={(date) => setCallForm(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={callForm.time}
                    onChange={(e) => setCallForm(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (min)</label>
                  <Select value={callForm.duration} onValueChange={(value) => setCallForm(prev => ({ ...prev, duration: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={callForm.notes}
                  onChange={(e) => setCallForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Call agenda or notes..."
                  rows={3}
                />
              </div>
              <Button onClick={handleScheduleCall} disabled={loading} className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Schedule Call
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Communication History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication History
          </CardTitle>
          <CardDescription>
            Recent messages, meetings, and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {communications.map((comm) => (
              <Card 
                key={comm.id} 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => isSuperAdmin && handleEditCommunication(comm)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-gray-100">
                      {getTypeIcon(comm.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{comm.subject}</h4>
                        <Badge 
                          variant={comm.status === 'completed' || comm.status === 'sent' ? 'default' : 'secondary'}
                          className={cn(
                            "text-xs",
                            comm.status === 'completed' && "bg-green-100 text-green-800",
                            comm.status === 'sent' && "bg-green-100 text-green-800",
                            comm.status === 'scheduled' && "bg-blue-100 text-blue-800",
                            comm.status === 'pending' && "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {comm.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{comm.content}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {comm.recipient}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(comm.created_at), 'MMM dd, yyyy')}
                        </div>
                        {comm.scheduled_for && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(comm.scheduled_for), 'MMM dd, HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(comm.status)}
                    {isSuperAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCommunication(comm);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCommunication(comm.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {communications.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No communications yet</h3>
                <p className="text-gray-600">Start by sending a message or scheduling a meeting.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Communication Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Communication</DialogTitle>
          </DialogHeader>
          {selectedCommunication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Input value={selectedCommunication.type} readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    value={selectedCommunication.status} 
                    onValueChange={(value) => updateCommunicationStatus(selectedCommunication.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input value={selectedCommunication.subject} readOnly />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea value={selectedCommunication.content} rows={4} readOnly />
              </div>
              <div>
                <label className="text-sm font-medium">Recipient</label>
                <Input value={selectedCommunication.recipient} readOnly />
              </div>
              {selectedCommunication.scheduled_for && (
                <div>
                  <label className="text-sm font-medium">Scheduled For</label>
                  <Input 
                    value={format(new Date(selectedCommunication.scheduled_for), 'PPP p')} 
                    readOnly 
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Close
                </Button>
                {isSuperAdmin && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      handleDeleteCommunication(selectedCommunication.id);
                      setShowEditModal(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunicationCenter;