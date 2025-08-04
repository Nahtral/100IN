import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Download, Filter, MessageCircle, Send, FileText, BarChart3 } from 'lucide-react';
import { format, subDays, isWithinInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TrainingSession {
  id: string;
  playerId: string;
  date: string;
  totalShots: number;
  madeShots: number;
  accuracy: number;
  avgArc: number;
  avgDepth: number;
  notes?: string;
  drillType?: string;
  duration?: number;
  shots: any[];
}

interface DrillMessage {
  id: string;
  playerId: string;
  message: string;
  drillType: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  createdBy: string;
  read: boolean;
}

interface TrainingHistoryProps {
  playerId: string;
  onSessionSelect?: (session: TrainingSession) => void;
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ playerId, onSessionSelect }) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<TrainingSession[]>([]);
  const [drillMessages, setDrillMessages] = useState<DrillMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [drillType, setDrillType] = useState<string>('all');
  const [minAccuracy, setMinAccuracy] = useState<number>(0);
  const [searchNotes, setSearchNotes] = useState<string>('');
  
  // Drill messaging
  const [newMessage, setNewMessage] = useState<string>('');
  const [selectedDrillType, setSelectedDrillType] = useState<string>('general');
  const [messagePriority, setMessagePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [playerId]);

  useEffect(() => {
    applyFilters();
  }, [sessions, dateRange, drillType, minAccuracy, searchNotes]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTrainingSessions(),
        loadDrillMessages()
      ]);
    } catch (error) {
      console.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingSessions = async () => {
    try {
      // Get shots grouped by date
      const { data: shots, error } = await supabase
        .from('shots')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group shots by date to create sessions
      const sessionMap: { [key: string]: any } = {};
      
      shots?.forEach(shot => {
        const date = format(new Date(shot.created_at), 'yyyy-MM-dd');
        if (!sessionMap[date]) {
          sessionMap[date] = {
            id: `session_${date}`,
            playerId,
            date,
            shots: [],
            totalShots: 0,
            madeShots: 0,
            accuracy: 0,
            avgArc: 0,
            avgDepth: 0,
            duration: 0,
          };
        }
        sessionMap[date].shots.push(shot);
      });

      // Calculate session statistics
      const sessionList: TrainingSession[] = Object.values(sessionMap).map(session => {
        const totalShots = session.shots.length;
        const madeShots = session.shots.filter((s: any) => s.made).length;
        const accuracy = totalShots > 0 ? (madeShots / totalShots) * 100 : 0;
        const avgArc = totalShots > 0 ? session.shots.reduce((sum: number, s: any) => sum + (s.arc_degrees || 0), 0) / totalShots : 0;
        const avgDepth = totalShots > 0 ? session.shots.reduce((sum: number, s: any) => sum + (s.depth_inches || 0), 0) / totalShots : 0;

        return {
          ...session,
          totalShots,
          madeShots,
          accuracy: Math.round(accuracy),
          avgArc: Math.round(avgArc),
          avgDepth: Math.round(avgDepth),
        };
      });

      setSessions(sessionList);
    } catch (error) {
      console.error('Error loading training sessions:', error);
    }
  };

  const loadDrillMessages = async () => {
    try {
      // Temporarily disable drill messages until types are updated
      // const { data, error } = await supabase
      //   .from('drill_messages')
      //   .select('*')
      //   .eq('player_id', playerId)
      //   .order('created_at', { ascending: false });

      // if (error) throw error;
      setDrillMessages([]);
    } catch (error) {
      console.error('Error loading drill messages:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Date range filter
    if (dateRange !== 'all') {
      const days = parseInt(dateRange.replace('d', ''));
      const cutoffDate = subDays(new Date(), days);
      filtered = filtered.filter(session => 
        new Date(session.date) >= cutoffDate
      );
    }

    // Drill type filter
    if (drillType !== 'all') {
      filtered = filtered.filter(session => 
        session.drillType === drillType
      );
    }

    // Accuracy filter
    filtered = filtered.filter(session => 
      session.accuracy >= minAccuracy
    );

    // Notes search
    if (searchNotes.trim()) {
      filtered = filtered.filter(session => 
        session.notes?.toLowerCase().includes(searchNotes.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  };

  const sendDrillMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Temporarily disable until types are updated
      // const { error } = await supabase
      //   .from('drill_messages')
      //   .insert({
      //     player_id: playerId,
      //     message: newMessage,
      //     drill_type: selectedDrillType,
      //     priority: messagePriority,
      //     created_by: 'system', // In a real app, this would be the coach's ID
      //     read: false
      //   });

      // if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Drill assignment has been sent to the player",
      });

      setNewMessage('');
      setMessageDialogOpen(false);
      loadDrillMessages();
    } catch (error) {
      console.error('Error sending drill message:', error);
      toast({
        title: "Message Error",
        description: "Failed to send drill message",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async (session?: TrainingSession) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFontSize(20);
      pdf.text('ShotIQ Training Report', pageWidth / 2, 20, { align: 'center' });
      
      if (session) {
        // Single session report
        pdf.setFontSize(16);
        pdf.text(`Session: ${format(new Date(session.date), 'MMMM d, yyyy')}`, 20, 40);
        
        pdf.setFontSize(12);
        let yPos = 60;
        
        // Session stats
        pdf.text(`Total Shots: ${session.totalShots}`, 20, yPos);
        pdf.text(`Made Shots: ${session.madeShots}`, 20, yPos + 10);
        pdf.text(`Accuracy: ${session.accuracy}%`, 20, yPos + 20);
        pdf.text(`Average Arc: ${session.avgArc}°`, 20, yPos + 30);
        pdf.text(`Average Depth: ${session.avgDepth}"`, 20, yPos + 40);
        
        yPos += 60;
        
        // Shot breakdown
        if (session.shots.length > 0) {
          pdf.text('Shot Breakdown:', 20, yPos);
          yPos += 15;
          
          session.shots.slice(0, 20).forEach((shot, index) => {
            const result = shot.made ? 'Made' : 'Miss';
            pdf.text(`${index + 1}. ${result} - Arc: ${shot.arc_degrees || 0}° Depth: ${shot.depth_inches || 0}"`, 20, yPos);
            yPos += 8;
            
            if (yPos > 280) {
              pdf.addPage();
              yPos = 20;
            }
          });
        }
      } else {
        // Summary report for all sessions
        pdf.setFontSize(16);
        pdf.text('Training Summary Report', 20, 40);
        
        pdf.setFontSize(12);
        let yPos = 60;
        
        const totalShots = filteredSessions.reduce((sum, s) => sum + s.totalShots, 0);
        const totalMade = filteredSessions.reduce((sum, s) => sum + s.madeShots, 0);
        const overallAccuracy = totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : 0;
        
        pdf.text(`Total Sessions: ${filteredSessions.length}`, 20, yPos);
        pdf.text(`Total Shots: ${totalShots}`, 20, yPos + 10);
        pdf.text(`Overall Accuracy: ${overallAccuracy}%`, 20, yPos + 20);
        
        yPos += 40;
        
        // Session list
        pdf.text('Session History:', 20, yPos);
        yPos += 15;
        
        filteredSessions.slice(0, 30).forEach(session => {
          pdf.text(`${format(new Date(session.date), 'MM/dd/yyyy')} - ${session.totalShots} shots, ${session.accuracy}% accuracy`, 20, yPos);
          yPos += 8;
          
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
        });
      }
      
      // Save PDF
      const filename = session 
        ? `shotiq-session-${session.date}.pdf`
        : `shotiq-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      pdf.save(filename);
      
      toast({
        title: "Export Complete",
        description: `Training report has been downloaded as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Error",
        description: "Failed to generate PDF report",
        variant: "destructive"
      });
    }
  };

  const SessionCard: React.FC<{ session: TrainingSession }> = ({ session }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium">
              {format(new Date(session.date), 'EEEE, MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {session.duration ? `${session.duration} minutes` : 'Duration not tracked'}
            </p>
          </div>
          <Badge variant={session.accuracy >= 70 ? "default" : session.accuracy >= 50 ? "secondary" : "destructive"}>
            {session.accuracy}% accuracy
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold">{session.totalShots}</div>
            <div className="text-xs text-muted-foreground">Total Shots</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{session.avgArc}°</div>
            <div className="text-xs text-muted-foreground">Avg Arc</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{session.avgDepth}"</div>
            <div className="text-xs text-muted-foreground">Avg Depth</div>
          </div>
        </div>
        
        {session.notes && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {session.notes}
          </p>
        )}
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onSessionSelect?.(session)}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            View Details
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => exportToPDF(session)}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          Loading training history...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Training History
          </h2>
          <p className="text-muted-foreground">
            {filteredSessions.length} sessions found
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Send Drill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Drill Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Drill Type</label>
                  <Select value={selectedDrillType} onValueChange={setSelectedDrillType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="free_throws">Free Throws</SelectItem>
                      <SelectItem value="catch_shoot">Catch & Shoot</SelectItem>
                      <SelectItem value="off_dribble">Off the Dribble</SelectItem>
                      <SelectItem value="form_shooting">Form Shooting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={messagePriority} onValueChange={(value: any) => setMessagePriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Enter drill instructions or feedback..."
                    rows={4}
                  />
                </div>
                
                <Button onClick={sendDrillMessage} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={() => exportToPDF()}>
            <FileText className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Drill Type</label>
              <Select value={drillType} onValueChange={setDrillType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="free_throws">Free Throws</SelectItem>
                  <SelectItem value="catch_shoot">Catch & Shoot</SelectItem>
                  <SelectItem value="off_dribble">Off the Dribble</SelectItem>
                  <SelectItem value="form_shooting">Form Shooting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Min Accuracy (%)</label>
              <Input
                type="number"
                value={minAccuracy}
                onChange={(e) => setMinAccuracy(parseInt(e.target.value) || 0)}
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Search Notes</label>
              <Input
                value={searchNotes}
                onChange={(e) => setSearchNotes(e.target.value)}
                placeholder="Search session notes..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drill Messages */}
      {drillMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Drill Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drillMessages.slice(0, 3).map(message => (
                <div key={message.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge variant={message.priority === 'high' ? 'destructive' : message.priority === 'medium' ? 'default' : 'secondary'}>
                    {message.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(message.createdAt), 'MMM d, yyyy at h:mm a')} • {message.drillType.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Training Sessions Found</h3>
            <p className="text-muted-foreground">
              {sessions.length === 0 
                ? "Start recording shots to build your training history"
                : "Try adjusting your filters to see more sessions"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingHistory;