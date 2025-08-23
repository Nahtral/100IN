import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FitnessDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const FitnessDetailsModal: React.FC<FitnessDetailsModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin
}) => {
  const [fitnessRecords, setFitnessRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchFitnessRecords();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = fitnessRecords;
    
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.players?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (scoreFilter !== 'all') {
      filtered = filtered.filter(record => {
        const score = record.fitness_score;
        switch (scoreFilter) {
          case 'excellent': return score >= 80;
          case 'good': return score >= 60 && score < 80;
          case 'fair': return score >= 40 && score < 60;
          case 'poor': return score < 40;
          default: return true;
        }
      });
    }
    
    setFilteredRecords(filtered);
  }, [searchTerm, scoreFilter, fitnessRecords]);

  const fetchFitnessRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('health_wellness')
        .select(`
          *,
          players!inner(
            id,
            profiles!inner(full_name, email),
            teams(name)
          )
        `)
        .not('fitness_score', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;
      setFitnessRecords(data || []);
    } catch (error) {
      console.error('Error fetching fitness records:', error);
      toast({
        title: "Error",
        description: "Failed to load fitness data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFitnessScore = async (recordId: string, newScore: number) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('health_wellness')
        .update({ 
          fitness_score: newScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fitness score updated successfully"
      });
      fetchFitnessRecords();
    } catch (error) {
      console.error('Error updating fitness score:', error);
      toast({
        title: "Error",
        description: "Failed to update fitness score",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('health_wellness')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fitness record deleted successfully"
      });
      fetchFitnessRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete fitness record",
        variant: "destructive"
      });
    }
  };

  const getFitnessCategory = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'green', icon: TrendingUp };
    if (score >= 60) return { label: 'Good', color: 'blue', icon: TrendingUp };
    if (score >= 40) return { label: 'Fair', color: 'yellow', icon: Minus };
    return { label: 'Poor', color: 'red', icon: TrendingDown };
  };

  const calculateStats = () => {
    if (filteredRecords.length === 0) return { avg: 0, excellent: 0, good: 0, poor: 0 };
    
    const avg = Math.round(
      filteredRecords.reduce((sum, record) => sum + record.fitness_score, 0) / filteredRecords.length
    );
    
    const excellent = filteredRecords.filter(r => r.fitness_score >= 80).length;
    const good = filteredRecords.filter(r => r.fitness_score >= 60 && r.fitness_score < 80).length;
    const poor = filteredRecords.filter(r => r.fitness_score < 40).length;
    
    return { avg, excellent, good, poor };
  };

  const stats = calculateStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Fitness Score Management
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
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="excellent">Excellent (80+)</SelectItem>
                  <SelectItem value="good">Good (60-79)</SelectItem>
                  <SelectItem value="fair">Fair (40-59)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;40)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Assessment
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.avg}</div>
                <p className="text-sm text-gray-600">Average Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.excellent}</div>
                <p className="text-sm text-gray-600">Excellent (80+)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.good}</div>
                <p className="text-sm text-gray-600">Good (60-79)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.poor}</div>
                <p className="text-sm text-gray-600">Needs Attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Fitness Records List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">Loading fitness records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No fitness records found matching your criteria.
              </div>
            ) : (
              filteredRecords.map((record) => {
                const category = getFitnessCategory(record.fitness_score);
                const IconComponent = category.icon;
                
                return (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-${category.color}-100 rounded-full flex items-center justify-center`}>
                            <IconComponent className={`h-6 w-6 text-${category.color}-600`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{record.players?.profiles?.full_name}</h3>
                            <p className="text-sm text-gray-600">{record.players?.teams?.name || 'No team'}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(record.date).toLocaleDateString()}
                              </div>
                              {record.weight && (
                                <span>Weight: {record.weight}lbs</span>
                              )}
                              {record.body_fat_percentage && (
                                <span>Body Fat: {record.body_fat_percentage}%</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900">{record.fitness_score}</div>
                            <Badge 
                              variant="secondary" 
                              className={`bg-${category.color}-100 text-${category.color}-800`}
                            >
                              {category.label}
                            </Badge>
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
                                onClick={() => handleDeleteRecord(record.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {record.medical_notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                          <strong>Notes:</strong> {record.medical_notes}
                        </div>
                      )}
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

export default FitnessDetailsModal;