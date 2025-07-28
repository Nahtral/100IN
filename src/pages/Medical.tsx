
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Plus, Edit, Trash2, Activity, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import HealthWellnessForm from '@/components/forms/HealthWellnessForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface HealthRecord {
  id: string;
  player_id: string;
  date: string;
  weight?: number;
  body_fat_percentage?: number;
  fitness_score?: number;
  injury_status?: string;
  injury_description?: string;
  medical_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  players?: {
    profiles?: {
      full_name: string;
      email: string;
    } | null;
  } | null;
}

const Medical = () => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || "Medical Team",
    role: "Medical Team",
    avatar: user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') || "M"
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('health_wellness')
        .select(`
          *,
          players (
            profiles (
              full_name,
              email
            )
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setRecords((data as any) || []);
    } catch (error) {
      console.error('Error fetching health records:', error);
      toast({
        title: "Error",
        description: "Failed to load health records.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const recordData = {
        player_id: formData.playerId,
        date: formData.date,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        body_fat_percentage: formData.bodyFatPercentage ? parseFloat(formData.bodyFatPercentage) : null,
        fitness_score: formData.fitnessScore ? parseInt(formData.fitnessScore) : null,
        injury_status: formData.injuryStatus,
        injury_description: formData.injuryDescription,
        medical_notes: formData.medicalNotes,
        created_by: user?.id,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('health_wellness')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Health record updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('health_wellness')
          .insert([recordData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Health record created successfully.",
        });
      }

      setIsFormOpen(false);
      setEditingRecord(null);
      fetchRecords();
    } catch (error) {
      console.error('Error saving health record:', error);
      toast({
        title: "Error",
        description: "Failed to save health record.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this health record?')) return;

    try {
      const { error } = await supabase
        .from('health_wellness')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Health record deleted successfully.",
      });
      
      fetchRecords();
    } catch (error) {
      console.error('Error deleting health record:', error);
      toast({
        title: "Error",
        description: "Failed to delete health record.",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (record: HealthRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const getInjuryStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status.toLowerCase()) {
      case 'injured':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {status}
        </Badge>;
      case 'recovering':
        return <Badge variant="secondary">{status}</Badge>;
      case 'cleared':
        return <Badge variant="default" className="bg-green-100 text-green-800">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical</h1>
            <p className="text-gray-600">Health and injury management</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddForm} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRecord ? 'Edit Health Record' : 'Add New Health Record'}
                </DialogTitle>
              </DialogHeader>
              <HealthWellnessForm
                onSubmit={handleSubmit}
                initialData={editingRecord ? {
                  date: editingRecord.date,
                  weight: editingRecord.weight,
                  bodyFatPercentage: editingRecord.body_fat_percentage,
                  fitnessScore: editingRecord.fitness_score,
                  injuryStatus: editingRecord.injury_status,
                  injuryDescription: editingRecord.injury_description,
                  medicalNotes: editingRecord.medical_notes,
                } : undefined}
                isLoading={isSubmitting}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold">{records.length}</p>
                </div>
                <Heart className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Injured</p>
                  <p className="text-2xl font-bold text-red-600">
                    {records.filter(r => r.injury_status?.toLowerCase() === 'injured').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recovering</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {records.filter(r => r.injury_status?.toLowerCase() === 'recovering').length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cleared</p>
                  <p className="text-2xl font-bold text-green-600">
                    {records.filter(r => r.injury_status?.toLowerCase() === 'cleared').length}
                  </p>
                </div>
                <Heart className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Health Records ({records.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading health records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No health records found. Add your first record to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Fitness Score</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Body Fat %</TableHead>
                      <TableHead>Injury Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.players?.profiles?.full_name || 'Unknown Player'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {record.players?.profiles?.email || ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.fitness_score ? (
                            <Badge variant="outline">{record.fitness_score}/100</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.weight ? `${record.weight} lbs` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.body_fat_percentage ? `${record.body_fat_percentage}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {getInjuryStatusBadge(record.injury_status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditForm(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Medical;
