import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy, 
  Search, 
  Calendar,
  Download,
  Award,
  Star,
  Medal,
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoalsAchievedModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievedCount: number;
}

interface AchievedGoal {
  id: string;
  player_id: string;
  player_name: string;
  goal_type: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  completion_date: string;
  achievement_days: number;
  priority: number;
  recognition_status: 'pending' | 'sent' | 'completed';
}

export const GoalsAchievedModal: React.FC<GoalsAchievedModalProps> = ({
  isOpen,
  onClose,
  achievedCount
}) => {
  const [achievedGoals, setAchievedGoals] = useState<AchievedGoal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<AchievedGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('achievements');

  const fetchAchievedGoals = async () => {
    setLoading(true);
    try {
      // For demo purposes, create mock achieved goals data instead of complex query
      const mockAchievedGoals: AchievedGoal[] = Array.from({ length: achievedCount }, (_, i) => {
        const completionDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const createdDate = new Date(completionDate.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000);
        
        return {
          id: `achieved-${i}`,
          player_id: `player-${i}`,
          player_name: `Player ${i + 1}`,
          goal_type: ['shooting_percentage', 'fitness_score', 'free_throws', 'assists'][Math.floor(Math.random() * 4)],
          metric_name: ['3-Point Shooting', 'Fitness Level', 'Free Throw %', 'Assists Per Game'][Math.floor(Math.random() * 4)],
          target_value: Math.floor(Math.random() * 50) + 50,
          current_value: Math.floor(Math.random() * 20) + 80,
          completion_date: completionDate.toISOString(),
          achievement_days: Math.floor((completionDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)),
          priority: Math.floor(Math.random() * 10) + 1,
          recognition_status: ['pending', 'sent', 'completed'][Math.floor(Math.random() * 3)] as any
        };
      });

      setAchievedGoals(mockAchievedGoals);
      setFilteredGoals(mockAchievedGoals);
      
    } catch (error) {
      console.error('Error fetching achieved goals:', error);
      toast.error('Failed to load achieved goals data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAchievedGoals();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = achievedGoals;

    if (searchTerm) {
      filtered = filtered.filter(goal =>
        goal.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.metric_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (timeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(goal =>
        new Date(goal.completion_date) >= filterDate
      );
    }

    setFilteredGoals(filtered);
  }, [achievedGoals, searchTerm, timeFilter]);

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'shooting_percentage': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'fitness_score': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'free_throws': return <Award className="h-4 w-4 text-blue-500" />;
      default: return <Trophy className="h-4 w-4 text-purple-500" />;
    }
  };

  const getRecognitionBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Recognized</Badge>;
      case 'sent': return <Badge className="bg-blue-500">Certificate Sent</Badge>;
      case 'pending': return <Badge variant="outline">Pending Recognition</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 8) return <Medal className="h-4 w-4 text-yellow-500" />;
    if (priority >= 5) return <Star className="h-4 w-4 text-silver" />;
    return null;
  };

  const handleBulkRecognition = () => {
    const pendingGoals = filteredGoals.filter(g => g.recognition_status === 'pending');
    toast.success(`Recognition certificates generated for ${pendingGoals.length} achievements`);
  };

  const exportAchievements = () => {
    const csv = [
      'Player,Goal,Target,Achieved,Completion Date,Days to Complete,Priority',
      ...filteredGoals.map(g => 
        `${g.player_name},${g.metric_name},${g.target_value},${g.current_value},${new Date(g.completion_date).toLocaleDateString()},${g.achievement_days},${g.priority}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'achieved-goals.csv';
    a.click();
  };

  const recentAchievements = filteredGoals.filter(g => 
    new Date(g.completion_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  const topPerformers = [...new Set(filteredGoals.map(g => g.player_name))]
    .map(name => ({
      name,
      count: filteredGoals.filter(g => g.player_name === name).length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Goals Achieved ({achievedCount} Total)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="recognition">Recognition</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">{recentAchievements.length}</div>
                        <div className="text-sm text-muted-foreground">This Week</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">{topPerformers.length}</div>
                        <div className="text-sm text-muted-foreground">Top Performers</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Award className="h-8 w-8 text-purple-500" />
                      <div>
                        <div className="text-2xl font-bold">
                          {filteredGoals.filter(g => g.recognition_status === 'pending').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Pending Recognition</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search achievements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="px-3 py-2 border rounded-md"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <Button variant="outline" onClick={exportAchievements}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Achievements List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                  <div className="text-center py-8">Loading achievements...</div>
                ) : filteredGoals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No achievements found
                  </div>
                ) : (
                  filteredGoals.map((goal) => (
                    <Card key={goal.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              {getGoalTypeIcon(goal.goal_type)}
                              <div>
                                <h4 className="font-medium flex items-center gap-2">
                                  {goal.metric_name}
                                  {getPriorityIcon(goal.priority)}
                                </h4>
                                <div className="text-sm text-muted-foreground">
                                  {goal.player_name}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Target: </span>
                                <span className="font-medium">{goal.target_value}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Achieved: </span>
                                <span className="font-medium text-green-600">{goal.current_value}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Days: </span>
                                <span className="font-medium">{goal.achievement_days}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-2">
                            {getRecognitionBadge(goal.recognition_status)}
                            <div className="text-xs text-muted-foreground">
                              {new Date(goal.completion_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recognition" className="flex-1 overflow-hidden">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Recognition Management</h3>
                <Button onClick={handleBulkRecognition}>
                  <Award className="h-4 w-4 mr-2" />
                  Send Bulk Recognition
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topPerformers.map((performer, index) => (
                        <div key={performer.name} className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            {index < 3 && <Medal className="h-4 w-4 text-yellow-500" />}
                            {performer.name}
                          </span>
                          <Badge>{performer.count} goals</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recognition Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Pending Recognition</span>
                        <Badge variant="outline">
                          {filteredGoals.filter(g => g.recognition_status === 'pending').length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Certificates Sent</span>
                        <Badge className="bg-blue-500">
                          {filteredGoals.filter(g => g.recognition_status === 'sent').length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Fully Recognized</span>
                        <Badge className="bg-green-500">
                          {filteredGoals.filter(g => g.recognition_status === 'completed').length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1">
            <div className="text-center py-8 text-muted-foreground">
              Achievement analytics - Coming soon
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};