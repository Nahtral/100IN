import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Search, 
  Filter, 
  Plus, 
  Edit,
  Trash2,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActiveGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalGoals: number;
}

interface GoalData {
  id: string;
  player_id: string;
  player_name: string;
  goal_type: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  priority: number;
  deadline: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ActiveGoalsModal: React.FC<ActiveGoalsModalProps> = ({
  isOpen,
  onClose,
  totalGoals
}) => {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('development_goals')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // For demo purposes, create mock goals data
      const transformedData: GoalData[] = Array.from({ length: totalGoals }, (_, i) => ({
        id: `goal-${i}`,
        player_id: `player-${i}`,
        player_name: `Player ${i + 1}`,
        goal_type: ['shooting_percentage', 'fitness_score', 'free_throws', 'assists'][Math.floor(Math.random() * 4)],
        metric_name: ['3-Point Shooting', 'Fitness Level', 'Free Throw %', 'Assists Per Game'][Math.floor(Math.random() * 4)],
        target_value: Math.floor(Math.random() * 50) + 50,
        current_value: Math.floor(Math.random() * 60) + 20,
        progress_percentage: Math.floor(Math.random() * 100),
        priority: Math.floor(Math.random() * 10) + 1,
        deadline: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }));

      setGoals(transformedData);
      setFilteredGoals(transformedData);
      
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGoals();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = goals;

    if (searchTerm) {
      filtered = filtered.filter(goal =>
        goal.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.metric_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.goal_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(goal => goal.goal_type === typeFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        filtered = filtered.filter(goal => goal.progress_percentage >= 100);
      } else if (statusFilter === 'in_progress') {
        filtered = filtered.filter(goal => goal.progress_percentage > 0 && goal.progress_percentage < 100);
      } else if (statusFilter === 'not_started') {
        filtered = filtered.filter(goal => goal.progress_percentage === 0);
      } else if (statusFilter === 'overdue') {
        filtered = filtered.filter(goal => 
          new Date(goal.deadline) < new Date() && goal.progress_percentage < 100
        );
      }
    }

    setFilteredGoals(filtered);
  }, [goals, searchTerm, typeFilter, statusFilter]);

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) return <Badge variant="destructive">High</Badge>;
    if (priority >= 5) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
  };

  const getStatusBadge = (goal: GoalData) => {
    if (goal.progress_percentage >= 100) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (new Date(goal.deadline) < new Date()) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
    }
    if (goal.progress_percentage > 0) {
      return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    }
    return <Badge variant="outline"><Target className="h-3 w-3 mr-1" />Not Started</Badge>;
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'shooting_percentage': return <Target className="h-4 w-4 text-blue-500" />;
      case 'fitness_score': return <TrendingUp className="h-4 w-4 text-green-500" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const uniqueTypes = [...new Set(goals.map(g => g.goal_type))];

  const statsData = {
    completed: goals.filter(g => g.progress_percentage >= 100).length,
    inProgress: goals.filter(g => g.progress_percentage > 0 && g.progress_percentage < 100).length,
    notStarted: goals.filter(g => g.progress_percentage === 0).length,
    overdue: goals.filter(g => new Date(g.deadline) < new Date() && g.progress_percentage < 100).length
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Active Goals Management ({totalGoals} Total)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{statsData.completed}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{statsData.inProgress}</div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-500">{statsData.notStarted}</div>
                      <div className="text-xs text-muted-foreground">Not Started</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">{statsData.overdue}</div>
                      <div className="text-xs text-muted-foreground">Overdue</div>
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
                    placeholder="Search goals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Goal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Goal
                </Button>
              </div>

              {/* Goals List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                  <div className="text-center py-8">Loading goals...</div>
                ) : filteredGoals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No goals found matching your criteria
                  </div>
                ) : (
                  filteredGoals.map((goal) => (
                    <Card key={goal.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getGoalTypeIcon(goal.goal_type)}
                                <h4 className="font-medium">{goal.metric_name}</h4>
                                {getPriorityBadge(goal.priority)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Player: {goal.player_name}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(goal)}
                              <Button size="sm" variant="ghost">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress: {goal.current_value} / {goal.target_value}</span>
                              <span>{goal.progress_percentage}%</span>
                            </div>
                            <Progress value={goal.progress_percentage} className="h-2" />
                          </div>

                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                            <span>Updated: {new Date(goal.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1">
            <div className="text-center py-8 text-muted-foreground">
              Goals analytics view - Coming soon
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="flex-1">
            <div className="text-center py-8 text-muted-foreground">
              Bulk actions view - Coming soon
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};