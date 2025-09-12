import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Search, 
  MessageSquare,
  Bell,
  Calendar,
  Clock,
  TrendingDown,
  UserX,
  Heart,
  Target,
  Send,
  BookOpen,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NeedAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attentionCount: number;
}

interface AttentionItem {
  id: string;
  type: 'goal_behind' | 'performance_decline' | 'attendance_low' | 'health_concern' | 'behavior_issue';
  player_id: string;
  player_name: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric_value: number;
  target_value?: number;
  last_updated: string;
  days_overdue?: number;
  status: 'new' | 'in_progress' | 'resolved';
  assigned_to?: string;
  notes?: string;
}

export const NeedAttentionModal: React.FC<NeedAttentionModalProps> = ({
  isOpen,
  onClose,
  attentionCount
}) => {
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedItem, setSelectedItem] = useState<AttentionItem | null>(null);
  const [interventionNote, setInterventionNote] = useState('');

  const fetchAttentionItems = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration - in real app, this would come from multiple sources
      const mockItems: AttentionItem[] = Array.from({ length: attentionCount }, (_, i) => {
        const types: AttentionItem['type'][] = ['goal_behind', 'performance_decline', 'attendance_low', 'health_concern', 'behavior_issue'];
        const priorities: AttentionItem['priority'][] = ['high', 'medium', 'low'];
        const statuses: AttentionItem['status'][] = ['new', 'in_progress', 'resolved'];
        
        const type = types[Math.floor(Math.random() * types.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];
        
        return {
          id: `attention-${i}`,
          type,
          player_id: `player-${i}`,
          player_name: `Player ${i + 1}`,
          priority,
          title: getItemTitle(type),
          description: getItemDescription(type),
          metric_value: Math.floor(Math.random() * 50) + 10,
          target_value: type === 'goal_behind' ? Math.floor(Math.random() * 50) + 70 : undefined,
          last_updated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          days_overdue: type === 'goal_behind' ? Math.floor(Math.random() * 30) + 1 : undefined,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          assigned_to: Math.random() > 0.5 ? 'Coach Smith' : undefined,
          notes: Math.random() > 0.7 ? 'Previous intervention attempted' : undefined
        };
      });

      setAttentionItems(mockItems);
      setFilteredItems(mockItems);
      
    } catch (error) {
      console.error('Error fetching attention items:', error);
      toast.error('Failed to load attention items');
    } finally {
      setLoading(false);
    }
  };

  const getItemTitle = (type: AttentionItem['type']): string => {
    switch (type) {
      case 'goal_behind': return 'Behind on Goals';
      case 'performance_decline': return 'Performance Decline';
      case 'attendance_low': return 'Low Attendance';
      case 'health_concern': return 'Health Concern';
      case 'behavior_issue': return 'Behavior Issue';
      default: return 'Attention Required';
    }
  };

  const getItemDescription = (type: AttentionItem['type']): string => {
    switch (type) {
      case 'goal_behind': return 'Player is significantly behind on development goals';
      case 'performance_decline': return 'Recent performance metrics show declining trend';
      case 'attendance_low': return 'Attendance rate below acceptable threshold';
      case 'health_concern': return 'Health metrics indicate potential concern';
      case 'behavior_issue': return 'Behavioral patterns require attention';
      default: return 'General attention required';
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAttentionItems();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = attentionItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    setFilteredItems(filtered);
  }, [attentionItems, searchTerm, priorityFilter, typeFilter]);

  const getTypeIcon = (type: AttentionItem['type']) => {
    switch (type) {
      case 'goal_behind': return <Target className="h-4 w-4 text-orange-500" />;
      case 'performance_decline': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'attendance_low': return <UserX className="h-4 w-4 text-purple-500" />;
      case 'health_concern': return <Heart className="h-4 w-4 text-pink-500" />;
      case 'behavior_issue': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: AttentionItem['priority']) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">High Priority</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium Priority</Badge>;
      case 'low': return <Badge variant="secondary">Low Priority</Badge>;
    }
  };

  const getStatusBadge = (status: AttentionItem['status']) => {
    switch (status) {
      case 'new': return <Badge variant="outline">New</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'resolved': return <Badge className="bg-green-500">Resolved</Badge>;
    }
  };

  const handleSendNotification = async (item: AttentionItem) => {
    toast.success(`Notification sent to coaches about ${item.player_name}`);
  };

  const handleCreateIntervention = async (item: AttentionItem) => {
    if (!interventionNote.trim()) {
      toast.error('Please add intervention notes');
      return;
    }
    
    toast.success(`Intervention plan created for ${item.player_name}`);
    setInterventionNote('');
    setSelectedItem(null);
  };

  const handleMarkResolved = async (item: AttentionItem) => {
    const updatedItems = attentionItems.map(i => 
      i.id === item.id ? { ...i, status: 'resolved' as const } : i
    );
    setAttentionItems(updatedItems);
    toast.success(`${item.player_name} marked as resolved`);
  };

  const stats = {
    high: filteredItems.filter(i => i.priority === 'high').length,
    medium: filteredItems.filter(i => i.priority === 'medium').length,
    low: filteredItems.filter(i => i.priority === 'low').length,
    new: filteredItems.filter(i => i.status === 'new').length,
    inProgress: filteredItems.filter(i => i.status === 'in_progress').length
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Players Needing Attention ({attentionCount} Total)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* Priority Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">{stats.high}</div>
                      <div className="text-xs text-muted-foreground">High Priority</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">{stats.medium}</div>
                      <div className="text-xs text-muted-foreground">Medium Priority</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-500">{stats.low}</div>
                      <div className="text-xs text-muted-foreground">Low Priority</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{stats.new}</div>
                      <div className="text-xs text-muted-foreground">New</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">{stats.inProgress}</div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search alerts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="px-3 py-2 border rounded-md"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                <select 
                  className="px-3 py-2 border rounded-md"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="goal_behind">Behind on Goals</option>
                  <option value="performance_decline">Performance Decline</option>
                  <option value="attendance_low">Low Attendance</option>
                  <option value="health_concern">Health Concerns</option>
                  <option value="behavior_issue">Behavior Issues</option>
                </select>
              </div>

              {/* Alerts List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                  <div className="text-center py-8">Loading attention items...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items requiring attention found
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <Card key={item.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                {getTypeIcon(item.type)}
                                <div>
                                  <h4 className="font-medium">{item.title}</h4>
                                  <p className="text-sm text-muted-foreground">{item.player_name}</p>
                                </div>
                              </div>
                              <p className="text-sm">{item.description}</p>
                            </div>
                            
                            <div className="flex flex-col gap-2 items-end">
                              {getPriorityBadge(item.priority)}
                              {getStatusBadge(item.status)}
                            </div>
                          </div>

                          {/* Metrics */}
                          {item.type === 'goal_behind' && item.target_value && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Progress: {item.metric_value} / {item.target_value}</span>
                                <span>{Math.round((item.metric_value / item.target_value) * 100)}%</span>
                              </div>
                              <Progress value={(item.metric_value / item.target_value) * 100} className="h-2" />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleSendNotification(item)}>
                              <Bell className="h-3 w-3 mr-1" />
                              Notify Coach
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                              <BookOpen className="h-3 w-3 mr-1" />
                              Create Plan
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleMarkResolved(item)}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Resolved
                            </Button>
                          </div>

                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>Last updated: {new Date(item.last_updated).toLocaleDateString()}</span>
                            {item.days_overdue && (
                              <span className="text-red-500">
                                {item.days_overdue} days overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interventions" className="flex-1">
            <div className="text-center py-8 text-muted-foreground">
              Intervention tracking - Coming soon
            </div>
          </TabsContent>

          <TabsContent value="resolved" className="flex-1">
            <div className="text-center py-8 text-muted-foreground">
              Resolved items - Coming soon
            </div>
          </TabsContent>
        </Tabs>

        {/* Intervention Plan Modal */}
        {selectedItem && (
          <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Intervention Plan - {selectedItem.player_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">{selectedItem.title}</h4>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                </div>
                <Textarea
                  placeholder="Enter intervention plan and coaching recommendations..."
                  value={interventionNote}
                  onChange={(e) => setInterventionNote(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleCreateIntervention(selectedItem)}>
                    <Send className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};