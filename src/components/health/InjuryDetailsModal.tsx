import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  Clock,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import InjuryReportForm from './InjuryReportForm';
import EditInjuryModal from './EditInjuryModal';

interface InjuryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const InjuryDetailsModal: React.FC<InjuryDetailsModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin
}) => {
  const [injuries, setInjuries] = useState<any[]>([]);
  const [filteredInjuries, setFilteredInjuries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingInjury, setEditingInjury] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchInjuries();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = injuries;
    
    if (searchTerm) {
      filtered = filtered.filter(injury =>
        injury.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        injury.injury_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(injury => injury.injury_status === statusFilter);
    }
    
    setFilteredInjuries(filtered);
  }, [searchTerm, statusFilter, injuries]);

  const fetchInjuries = async () => {
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
        .eq('injury_status', 'injured')
        .order('date', { ascending: false });

      if (error) throw error;
      setInjuries(data || []);
    } catch (error) {
      console.error('Error fetching injuries:', error);
      toast({
        title: "Error",
        description: "Failed to load injury data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInjuryStatus = async (injuryId: string, newStatus: string) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('health_wellness')
        .update({ 
          injury_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', injuryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Injury status updated successfully"
      });
      fetchInjuries();
    } catch (error) {
      console.error('Error updating injury:', error);
      toast({
        title: "Error",
        description: "Failed to update injury status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteInjury = async (injuryId: string) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('health_wellness')
        .delete()
        .eq('id', injuryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Injury record deleted successfully"
      });
      fetchInjuries();
    } catch (error) {
      console.error('Error deleting injury:', error);
      toast({
        title: "Error",
        description: "Failed to delete injury record",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (description: string) => {
    const desc = description?.toLowerCase() || '';
    if (desc.includes('severe') || desc.includes('fracture') || desc.includes('torn')) {
      return 'red';
    } else if (desc.includes('moderate') || desc.includes('sprain') || desc.includes('strain')) {
      return 'yellow';
    } else {
      return 'green';
    }
  };

  const getDaysSinceInjury = (date: string) => {
    const injuryDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - injuryDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Active Injury Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search injuries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="injured">Active</SelectItem>
                  <SelectItem value="recovering">Recovering</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <Button 
                className="flex items-center gap-2"
                onClick={() => setShowReportForm(true)}
              >
                <Plus className="h-4 w-4" />
                Report Injury
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{filteredInjuries.length}</div>
                <p className="text-sm text-gray-600">Active Injuries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredInjuries.filter(i => getSeverityColor(i.injury_description) === 'yellow').length}
                </div>
                <p className="text-sm text-gray-600">Moderate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {filteredInjuries.filter(i => getSeverityColor(i.injury_description) === 'red').length}
                </div>
                <p className="text-sm text-gray-600">Severe</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredInjuries.length > 0 
                    ? Math.round(filteredInjuries.reduce((sum, i) => sum + getDaysSinceInjury(i.date), 0) / filteredInjuries.length)
                    : 0
                  }
                </div>
                <p className="text-sm text-gray-600">Avg Days</p>
              </CardContent>
            </Card>
          </div>

          {/* Injury List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">Loading injuries...</div>
            ) : filteredInjuries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No injuries found matching your criteria.
              </div>
            ) : (
              filteredInjuries.map((injury) => {
                const severityColor = getSeverityColor(injury.injury_description);
                const daysSince = getDaysSinceInjury(injury.date);
                
                return (
                  <Card key={injury.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 bg-${severityColor}-100 rounded-full flex items-center justify-center`}>
                            <AlertTriangle className={`h-6 w-6 text-${severityColor}-600`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{injury.players?.profiles?.full_name}</h3>
                              <Badge 
                                variant="secondary" 
                                className={`bg-${severityColor}-100 text-${severityColor}-800`}
                              >
                                {severityColor === 'red' ? 'Severe' : severityColor === 'yellow' ? 'Moderate' : 'Minor'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{injury.injury_description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {injury.players?.teams?.name || 'No team'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(injury.date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {daysSince} days ago
                              </div>
                              {injury.fitness_score && (
                                <div className="flex items-center gap-1">
                                  <Activity className="h-3 w-3" />
                                  Fitness: {injury.fitness_score}
                                </div>
                              )}
                            </div>
                            {injury.medical_notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <strong>Medical Notes:</strong> {injury.medical_notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSuperAdmin && (
                          <div className="flex items-center gap-2">
                            <Select 
                              defaultValue={injury.injury_status}
                              onValueChange={(value) => handleUpdateInjuryStatus(injury.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="injured">Injured</SelectItem>
                                <SelectItem value="recovering">Recovering</SelectItem>
                                <SelectItem value="cleared">Cleared</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => setEditingInjury(injury)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteInjury(injury.id)}
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
      
      <InjuryReportForm
        isOpen={showReportForm}
        onClose={() => setShowReportForm(false)}
        onSuccess={fetchInjuries}
      />
      
      <EditInjuryModal
        isOpen={!!editingInjury}
        onClose={() => setEditingInjury(null)}
        onSuccess={fetchInjuries}
        injury={editingInjury}
      />
    </Dialog>
  );
};

export default InjuryDetailsModal;