import React, { useState, useEffect } from 'react';
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
  User
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
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [showRequestReport, setShowRequestReport] = useState(false);
  
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

        <Button className="mobile-btn bg-gradient-to-r from-orange-500 to-orange-600 h-auto py-4">
          <div className="flex flex-col items-center gap-2">
            <Phone className="h-5 w-5" />
            <span>Schedule Call</span>
          </div>
        </Button>
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
            {communications.length > 0 ? communications.map((comm) => (
              <div key={comm.id} className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  {getTypeIcon(comm.type)}
                  {getStatusIcon(comm.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium truncate">{comm.subject}</h4>
                    <Badge variant="outline" className="ml-2">
                      {comm.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{comm.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {comm.recipient}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(comm.created_at), 'MMM dd, yyyy')}
                    </span>
                    {comm.scheduled_for && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(comm.scheduled_for), 'MMM dd, HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">
                No communication history yet. Start by sending a message or scheduling a meeting.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunicationCenter;