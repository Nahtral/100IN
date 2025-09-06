import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare,
  Send,
  Users,
  Bell,
  Filter,
  Search,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import HealthAlertModal from './HealthAlertModal';
import TeamUpdatesModal from './TeamUpdatesModal';
import ParentCommunicationModal from './ParentCommunicationModal';

interface HealthCommunicationProps {
  userRole: string;
  isSuperAdmin: boolean;
  playerProfile?: any;
}

const HealthCommunication: React.FC<HealthCommunicationProps> = ({ 
  userRole, 
  isSuperAdmin,
  playerProfile
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userRoles, hasRole } = useOptimizedAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [messageType, setMessageType] = useState('general');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  
  // Modal states
  const [healthAlertModalOpen, setHealthAlertModalOpen] = useState(false);
  const [teamUpdatesModalOpen, setTeamUpdatesModalOpen] = useState(false);
  const [parentCommModalOpen, setParentCommModalOpen] = useState(false);

  // Check if user can compose messages (super admin or staff with manage_medical permission)
  const canComposeMessages = isSuperAdmin || hasRole('staff');

  // Mock data for demonstration
  const mockMessages = [
    {
      id: 1,
      from: "Dr. Sarah Mitchell",
      to: "Basketball Team",
      subject: "Weekly Health Update",
      message: "All players are cleared for this week's training. Please ensure proper hydration during practice.",
      type: "announcement",
      timestamp: "2024-01-15T10:00:00Z",
      priority: "normal"
    },
    {
      id: 2,
      from: "Coach Rodriguez",
      to: "Medical Team",
      subject: "Player Injury Concern",
      message: "Marcus Johnson mentioned some knee discomfort during today's practice. Please assess when possible.",
      type: "injury-report",
      timestamp: "2024-01-15T14:30:00Z",
      priority: "high"
    },
    {
      id: 3,
      from: "Dr. Sarah Mitchell",
      to: "Parents",
      subject: "Nutrition Guidelines",
      message: "Attached are the updated nutrition guidelines for optimal performance and recovery.",
      type: "guidance",
      timestamp: "2024-01-14T09:15:00Z",
      priority: "normal"
    }
  ];

  useEffect(() => {
    fetchMessages();
    if (canComposeMessages) {
      fetchPlayers();
    }
  }, [userRole, playerProfile, canComposeMessages]);

  const fetchMessages = async () => {
    try {
      let query = supabase
        .from('medical_communications')
        .select(`
          *,
          profiles!sender_id(full_name)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Remove fallback to mock data to ensure we're using real data
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          name,
          jersey_number,
          user_id,
          teams:team_id(name),
          profiles:user_id(full_name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipient || !subject.trim()) return;
    if (!canComposeMessages) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to send health communications.",
        variant: "destructive",
      });
      return;
    }

    try {
      const messageData = {
        sender_id: user?.id,
        subject: subject,
        message: newMessage,
        communication_type: messageType,
        priority: priority,
        recipient_type: selectedRecipient === 'Specific Player' ? 'player' : selectedRecipient.toLowerCase().replace(' ', '_'),
        recipient_ids: selectedRecipient === 'Specific Player' ? selectedPlayers : null,
        related_player_id: playerProfile?.id || null
      };

      const { error } = await supabase
        .from('medical_communications')
        .insert([messageData]);

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Your health communication has been sent successfully.",
      });

      setNewMessage('');
      setSelectedRecipient('');
      setSubject('');
      setPriority('normal');
      setMessageType('general');
      setSelectedPlayers([]);
      
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlayerSelection = (playerId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlayers(prev => [...prev, playerId]);
    } else {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
    }
  };

  const handleRecipientChange = (value: string) => {
    setSelectedRecipient(value);
    if (value === 'Specific Player') {
      setShowPlayerDropdown(true);
      setSelectedPlayers([]);
    } else {
      setShowPlayerDropdown(false);
      setSelectedPlayers([]);
    }
  };

  const getMessageTypeBadge = (type: string) => {
    switch (type) {
      case 'injury-report':
        return <Badge variant="destructive">Injury Report</Badge>;
      case 'announcement':
        return <Badge variant="default">Announcement</Badge>;
      case 'guidance':
        return <Badge variant="secondary">Guidance</Badge>;
      default:
        return <Badge variant="outline">General</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return null;
    }
  };

  const recipients = ['All Players', 'All Parents', 'Medical Team', 'Coaching Staff', 'Specific Player'];
  const messageTypes = [
    { value: 'general', label: 'General Communication' },
    { value: 'injury-report', label: 'Injury Report' },
    { value: 'announcement', label: 'Health Announcement' },
    { value: 'guidance', label: 'Health Guidance' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Health Communication</h2>
          <p className="text-gray-600">Secure messaging for health-related communications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Compose */}
        {canComposeMessages && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Send To</label>
              <Select value={selectedRecipient} onValueChange={handleRecipientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((recipient) => (
                    <SelectItem key={recipient} value={recipient}>
                      {recipient}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific Player Selection */}
            {showPlayerDropdown && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Players ({selectedPlayers.length} selected)</label>
                <Card className="p-3">
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {players.map((player) => (
                        <div key={player.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={player.id}
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={(checked) => handlePlayerSelection(player.id, checked as boolean)}
                          />
                          <label
                            htmlFor={player.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {player.profiles?.full_name || player.name || 'Unknown Player'}
                            {player.jersey_number && ` (#${player.jersey_number})`}
                            {player.teams && <span className="text-gray-500 ml-2">- {player.teams.name}</span>}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectedPlayers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">Please select at least one player</p>
                  )}
                </Card>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Message Type</label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {messageTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input
                placeholder="Enter message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                placeholder="Type your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={
                !newMessage.trim() || 
                !selectedRecipient || 
                !subject.trim() ||
                (selectedRecipient === 'Specific Player' && selectedPlayers.length === 0)
              }
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </CardContent>
        </Card>
        )}

        {/* Access denied message for non-authorized users */}
        {!canComposeMessages && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Message
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Send className="h-12 w-12 mx-auto mb-2" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-sm text-gray-600">
                Only Super Admins and authorized staff members can compose health communications.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Message List */}
        <Card className={canComposeMessages ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Messages ({messages.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-600">Health-related communications will appear here</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {message.profiles?.full_name || message.from || 'Unknown Sender'}
                        </span>
                        <span className="text-sm text-gray-500">
                          to {message.recipient_type ? message.recipient_type.replace('_', ' ') : message.to}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(message.priority)}
                        {getMessageTypeBadge(message.communication_type || message.type)}
                      </div>
                    </div>

                    <h4 className="font-medium text-gray-900 mb-2">{message.subject}</h4>
                    <p className="text-gray-700 text-sm mb-3">{message.message}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(message.created_at || message.timestamp).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          Reply
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          Forward
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="border-orange-200 hover:border-orange-300 transition-all duration-200 cursor-pointer hover:shadow-lg"
          onClick={() => setHealthAlertModalOpen(true)}
        >
          <CardContent className="p-4 text-center">
            <Bell className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Send Health Alert</h3>
            <p className="text-sm text-gray-600">Broadcast urgent health notifications</p>
          </CardContent>
        </Card>

        <Card 
          className="border-blue-200 hover:border-blue-300 transition-all duration-200 cursor-pointer hover:shadow-lg"
          onClick={() => setTeamUpdatesModalOpen(true)}
        >
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Team Updates</h3>
            <p className="text-sm text-gray-600">Send updates to the entire team</p>
          </CardContent>
        </Card>

        <Card 
          className="border-green-200 hover:border-green-300 transition-all duration-200 cursor-pointer hover:shadow-lg"
          onClick={() => setParentCommModalOpen(true)}
        >
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Parent Communication</h3>
            <p className="text-sm text-gray-600">Send health updates to parents</p>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <HealthAlertModal
        isOpen={healthAlertModalOpen}
        onClose={() => setHealthAlertModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <TeamUpdatesModal
        isOpen={teamUpdatesModalOpen}
        onClose={() => setTeamUpdatesModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <ParentCommunicationModal
        isOpen={parentCommModalOpen}
        onClose={() => setParentCommModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
};

export default HealthCommunication;