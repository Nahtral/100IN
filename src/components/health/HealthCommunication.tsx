import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare,
  Send,
  Users,
  Bell,
  Filter,
  Search
} from 'lucide-react';

interface HealthCommunicationProps {
  userRole: string;
  isSuperAdmin: boolean;
}

const HealthCommunication: React.FC<HealthCommunicationProps> = ({ 
  userRole, 
  isSuperAdmin 
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [messageType, setMessageType] = useState('general');

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
    setMessages(mockMessages);
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedRecipient) return;

    const message = {
      id: Date.now(),
      from: "Current User",
      to: selectedRecipient,
      subject: "New Message",
      message: newMessage,
      type: messageType,
      timestamp: new Date().toISOString(),
      priority: "normal"
    };

    setMessages(prev => [message, ...prev]);
    setNewMessage('');
    setSelectedRecipient('');
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
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
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
              disabled={!newMessage.trim() || !selectedRecipient}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </CardContent>
        </Card>

        {/* Message List */}
        <Card className="lg:col-span-2">
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
                        <span className="font-medium text-gray-900">{message.from}</span>
                        <span className="text-sm text-gray-500">to {message.to}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(message.priority)}
                        {getMessageTypeBadge(message.type)}
                      </div>
                    </div>

                    <h4 className="font-medium text-gray-900 mb-2">{message.subject}</h4>
                    <p className="text-gray-700 text-sm mb-3">{message.message}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(message.timestamp).toLocaleString()}</span>
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
        <Card className="border-orange-200 hover:border-orange-300 transition-colors cursor-pointer">
          <CardContent className="p-4 text-center">
            <Bell className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Send Health Alert</h3>
            <p className="text-sm text-gray-600">Broadcast urgent health notifications</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 hover:border-blue-300 transition-colors cursor-pointer">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Team Updates</h3>
            <p className="text-sm text-gray-600">Send updates to the entire team</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 hover:border-green-300 transition-colors cursor-pointer">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Parent Communication</h3>
            <p className="text-sm text-gray-600">Send health updates to parents</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HealthCommunication;