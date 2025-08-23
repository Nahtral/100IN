import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Heart, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  Zap,
  Moon,
  Activity,
  Droplets
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CheckInDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const CheckInDetailsModal: React.FC<CheckInDetailsModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin
}) => {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [filteredCheckIns, setFilteredCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCheckIns();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = checkIns;
    
    if (searchTerm) {
      filtered = filtered.filter(checkIn =>
        checkIn.players?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (dateFilter !== 'all') {
      const today = new Date();
      const filterDate = new Date(today);
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(c => new Date(c.check_in_date) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(c => new Date(c.check_in_date) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(c => new Date(c.check_in_date) >= filterDate);
          break;
      }
    }
    
    setFilteredCheckIns(filtered);
  }, [searchTerm, dateFilter, checkIns]);

  const fetchCheckIns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_health_checkins')
        .select(`
          *,
          players!inner(
            id,
            profiles!inner(full_name, email),
            teams(name)
          )
        `)
        .order('check_in_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCheckIns(data || []);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      toast({
        title: "Error",
        description: "Failed to load check-in data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCheckIn = async (checkInId: string) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('daily_health_checkins')
        .delete()
        .eq('id', checkInId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Check-in deleted successfully"
      });
      fetchCheckIns();
    } catch (error) {
      console.error('Error deleting check-in:', error);
      toast({
        title: "Error",
        description: "Failed to delete check-in",
        variant: "destructive"
      });
    }
  };

  const getOverallStatus = (checkIn: any) => {
    const scores = [
      checkIn.energy_level,
      checkIn.sleep_quality,
      checkIn.hydration_level,
      checkIn.nutrition_quality,
      checkIn.mood,
      checkIn.training_readiness
    ].filter(score => score !== null);
    
    if (scores.length === 0) return { status: 'No Data', color: 'gray' };
    
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (avg >= 8) return { status: 'Excellent', color: 'green' };
    if (avg >= 6) return { status: 'Good', color: 'blue' };
    if (avg >= 4) return { status: 'Fair', color: 'yellow' };
    return { status: 'Poor', color: 'red' };
  };

  const calculateStats = () => {
    if (filteredCheckIns.length === 0) return { total: 0, today: 0, week: 0, avgScore: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    
    const todayCount = filteredCheckIns.filter(c => 
      new Date(c.check_in_date) >= today
    ).length;
    
    const weekCount = filteredCheckIns.filter(c => 
      new Date(c.check_in_date) >= weekAgo
    ).length;
    
    const allScores = filteredCheckIns.map(c => {
      const scores = [
        c.energy_level,
        c.sleep_quality,
        c.hydration_level,
        c.nutrition_quality,
        c.mood,
        c.training_readiness
      ].filter(score => score !== null);
      
      return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    }).filter(score => score > 0);
    
    const avgScore = allScores.length > 0 
      ? Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10) / 10
      : 0;
    
    return {
      total: filteredCheckIns.length,
      today: todayCount,
      week: weekCount,
      avgScore
    };
  };

  const stats = calculateStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-600" />
            Daily Health Check-ins
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Check-in
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <p className="text-sm text-gray-600">Total Check-ins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.today}</div>
                <p className="text-sm text-gray-600">Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.week}</div>
                <p className="text-sm text-gray-600">This Week</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.avgScore}</div>
                <p className="text-sm text-gray-600">Avg Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Check-ins List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">Loading check-ins...</div>
            ) : filteredCheckIns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No check-ins found matching your criteria.
              </div>
            ) : (
              filteredCheckIns.map((checkIn) => {
                const status = getOverallStatus(checkIn);
                
                return (
                  <Card key={checkIn.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 bg-${status.color}-100 rounded-full flex items-center justify-center`}>
                            <Heart className={`h-6 w-6 text-${status.color}-600`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{checkIn.players?.profiles?.full_name}</h3>
                              <Badge 
                                variant="secondary" 
                                className={`bg-${status.color}-100 text-${status.color}-800`}
                              >
                                {status.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {checkIn.players?.teams?.name || 'No team'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(checkIn.check_in_date).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Health Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                              {checkIn.energy_level && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <Zap className="h-3 w-3 text-yellow-600" />
                                  <div>
                                    <p className="text-xs text-gray-600">Energy</p>
                                    <p className="text-sm font-semibold">{checkIn.energy_level}/10</p>
                                  </div>
                                </div>
                              )}
                              
                              {checkIn.sleep_quality && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <Moon className="h-3 w-3 text-blue-600" />
                                  <div>
                                    <p className="text-xs text-gray-600">Sleep</p>
                                    <p className="text-sm font-semibold">{checkIn.sleep_quality}/10</p>
                                  </div>
                                </div>
                              )}
                              
                              {checkIn.hydration_level && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <Droplets className="h-3 w-3 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-gray-600">Hydration</p>
                                    <p className="text-sm font-semibold">{checkIn.hydration_level}/10</p>
                                  </div>
                                </div>
                              )}
                              
                              {checkIn.training_readiness && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <Activity className="h-3 w-3 text-green-600" />
                                  <div>
                                    <p className="text-xs text-gray-600">Readiness</p>
                                    <p className="text-sm font-semibold">{checkIn.training_readiness}/10</p>
                                  </div>
                                </div>
                              )}
                              
                              {checkIn.pain_level && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <div className="h-3 w-3 bg-red-600 rounded-full"></div>
                                  <div>
                                    <p className="text-xs text-gray-600">Pain</p>
                                    <p className="text-sm font-semibold">{checkIn.pain_level}/10</p>
                                  </div>
                                </div>
                              )}
                              
                              {checkIn.mood && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
                                  <div>
                                    <p className="text-xs text-gray-600">Mood</p>
                                    <p className="text-sm font-semibold">{checkIn.mood}/10</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {checkIn.additional_notes && (
                              <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                                <strong>Notes:</strong> {checkIn.additional_notes}
                              </div>
                            )}
                            
                            {checkIn.symptoms && checkIn.symptoms.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-600 mb-1">Symptoms:</p>
                                <div className="flex flex-wrap gap-1">
                                  {checkIn.symptoms.map((symptom: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {symptom}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSuperAdmin && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteCheckIn(checkIn.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInDetailsModal;