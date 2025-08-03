import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  UserPlus, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  User,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface OnboardingTask {
  id: string;
  employee_id: string;
  task_name: string;
  task_description: string;
  due_date: string;
  completion_date: string | null;
  status: string;
  priority: string;
  task_order: number;
  employees: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface OnboardingTasksProps {
  onStatsUpdate: () => void;
}

const OnboardingTasks: React.FC<OnboardingTasksProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOnboardingTasks();
  }, []);

  const fetchOnboardingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_id
          )
        `)
        .order('task_order', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
      onStatsUpdate();
    } catch (error) {
      console.error('Error fetching onboarding tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch onboarding tasks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('onboarding_tasks')
        .update({ 
          status: 'completed',
          completion_date: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task marked as completed.",
      });
      fetchOnboardingTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete task.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'text-red-600',
      medium: 'text-orange-600',
      low: 'text-green-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'completed' && new Date(dueDate) < new Date();
  };

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === filterStatus);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t.due_date, t.status)).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Onboarding Tasks</h2>
          <p className="text-muted-foreground">Track employee onboarding progress and tasks</p>
        </div>
        {(isSuperAdmin || hasRole('staff')) && (
          <Button className="btn-panthers">
            <Plus className="h-4 w-4 mr-2" />
            Add Task Template
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Onboarding Tasks</CardTitle>
            <div className="flex items-center gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-1"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No onboarding tasks found</h3>
              <p className="text-muted-foreground">
                {filterStatus === 'all' 
                  ? 'No onboarding tasks have been created yet' 
                  : `No ${filterStatus.replace('_', ' ')} tasks found`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  {(isSuperAdmin || hasRole('staff')) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">
                            {task.employees?.first_name} {task.employees?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {task.employees?.employee_id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.task_name}</div>
                        {task.task_description && (
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {task.task_description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className={isOverdue(task.due_date, task.status) ? 'text-red-600' : ''}>
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        {isOverdue(task.due_date, task.status) && (
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(
                        isOverdue(task.due_date, task.status) ? 'overdue' : task.status
                      )}>
                        {isOverdue(task.due_date, task.status) ? 'overdue' : task.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.completion_date ? (
                        <span className="text-sm text-green-600">
                          Completed {new Date(task.completion_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">In progress</span>
                      )}
                    </TableCell>
                    {(isSuperAdmin || hasRole('staff')) && (
                      <TableCell>
                        {task.status !== 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => completeTask(task.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTasks;