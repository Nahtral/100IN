import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Target,
  TrendingUp,
  User,
  FileText,
  Play,
  Pause
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RehabilitationManagerProps {
  plans: any[];
  userRole: string;
  isSuperAdmin: boolean;
  onRefresh: () => void;
}

const RehabilitationManager: React.FC<RehabilitationManagerProps> = ({ 
  plans, 
  userRole, 
  isSuperAdmin,
  onRefresh 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [progressNotes, setProgressNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active', color: 'text-blue-600' },
      completed: { variant: 'secondary' as const, label: 'Completed', color: 'text-green-600' },
      paused: { variant: 'outline' as const, label: 'Paused', color: 'text-orange-600' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled', color: 'text-red-600' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  const calculateProgress = (plan: any) => {
    if (!plan.exercises || !Array.isArray(plan.exercises)) return 0;
    
    const exercises = plan.exercises;
    const completedExercises = exercises.filter((ex: any) => ex.completed).length;
    return exercises.length > 0 ? Math.round((completedExercises / exercises.length) * 100) : 0;
  };

  const updatePlanProgress = async (planId: string, notes: string, status?: string) => {
    setIsUpdating(true);
    try {
      const updateData: any = {
        progress_notes: notes,
        updated_at: new Date().toISOString()
      };

      if (status) {
        updateData.status = status;
        if (status === 'completed') {
          updateData.actual_completion_date = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('rehabilitation_plans')
        .update(updateData)
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Progress Updated",
        description: "Rehabilitation plan progress has been updated successfully.",
      });

      onRefresh();
      setSelectedPlan(null);
      setProgressNotes('');
    } catch (error) {
      console.error('Error updating plan progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canManagePlans = isSuperAdmin || ['medical', 'staff', 'coach'].includes(userRole);

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No rehabilitation plans assigned.</h3>
        <p className="text-gray-600">
          Rehabilitation plans and progress tracking will appear here when assigned by medical staff.
        </p>
        {canManagePlans && (
          <Button className="mt-4" onClick={() => {}}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rehabilitation Plan
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {plans.map((plan) => {
        const progress = calculateProgress(plan);
        const isOverdue = plan.target_completion_date && 
          new Date(plan.target_completion_date) < new Date() && 
          plan.status !== 'completed';

        return (
          <Card key={plan.id} className={`hover:shadow-md transition-shadow ${
            isOverdue ? 'border-orange-200 bg-orange-50' : ''
          }`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    {plan.plan_title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.plan_description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOverdue && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      Overdue
                    </Badge>
                  )}
                  {getStatusBadge(plan.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Patient Info (for medical staff) */}
              {userRole !== 'player' && plan.players?.profiles && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <User className="h-4 w-4" />
                  <span>Patient: {plan.players.profiles.full_name}</span>
                </div>
              )}

              {/* Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <div>
                    <span className="text-gray-500">Started:</span>
                    <span className="font-medium ml-1">
                      {format(new Date(plan.start_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
                
                {plan.target_completion_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="text-gray-500">Target:</span>
                      <span className="font-medium ml-1">
                        {format(new Date(plan.target_completion_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                )}

                {plan.actual_completion_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <span className="text-gray-500">Completed:</span>
                      <span className="font-medium ml-1">
                        {format(new Date(plan.actual_completion_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Exercise Progress</span>
                  <span className="font-medium">{progress}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Exercise List */}
              {plan.exercises && Array.isArray(plan.exercises) && plan.exercises.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Exercises:</h4>
                  <div className="space-y-2">
                    {plan.exercises.slice(0, 3).map((exercise: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {exercise.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={exercise.completed ? 'text-green-700' : 'text-gray-600'}>
                          {exercise.name || `Exercise ${index + 1}`}
                        </span>
                        {exercise.sets && exercise.reps && (
                          <span className="text-gray-500 ml-auto">
                            {exercise.sets}x{exercise.reps}
                          </span>
                        )}
                      </div>
                    ))}
                    {plan.exercises.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{plan.exercises.length - 3} more exercises
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Notes */}
              {plan.progress_notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Latest Progress Notes:</h4>
                  <p className="text-sm text-gray-600">{plan.progress_notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setProgressNotes(plan.progress_notes || '');
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Update Progress
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Rehabilitation Progress</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">{selectedPlan?.plan_title}</h4>
                        <p className="text-sm text-gray-600">{selectedPlan?.plan_description}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Progress Notes</label>
                        <Textarea
                          placeholder="Enter progress notes, observations, or updates..."
                          value={progressNotes}
                          onChange={(e) => setProgressNotes(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedPlan(null)}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                        {canManagePlans && selectedPlan?.status === 'active' && (
                          <Button
                            variant="outline"
                            onClick={() => updatePlanProgress(selectedPlan.id, progressNotes, 'completed')}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                        <Button
                          onClick={() => updatePlanProgress(selectedPlan?.id, progressNotes)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <>
                              <Clock className="h-4 w-4 mr-1 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-1" />
                              Update Notes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {canManagePlans && plan.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePlanProgress(plan.id, plan.progress_notes || '', 'paused')}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}

                {canManagePlans && plan.status === 'paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePlanProgress(plan.id, plan.progress_notes || '', 'active')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RehabilitationManager;