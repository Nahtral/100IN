import { useState, useEffect, useCallback } from 'react';

interface LoadingTask {
  id: string;
  label: string;
  fn: () => Promise<any>;
  priority: number;
}

interface ProgressiveLoaderState {
  currentTask: string | null;
  completedTasks: string[];
  progress: number;
  isComplete: boolean;
  error: string | null;
}

export const useProgressiveLoader = (tasks: LoadingTask[]) => {
  const [state, setState] = useState<ProgressiveLoaderState>({
    currentTask: null,
    completedTasks: [],
    progress: 0,
    isComplete: false,
    error: null
  });

  const executeTasks = useCallback(async () => {
    if (tasks.length === 0) {
      setState(prev => ({ ...prev, isComplete: true, progress: 100 }));
      return;
    }

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) => a.priority - b.priority);
    let completed = 0;

    try {
      for (const task of sortedTasks) {
        setState(prev => ({ 
          ...prev, 
          currentTask: task.label,
          progress: (completed / tasks.length) * 100 
        }));

        await task.fn();
        completed++;

        setState(prev => ({
          ...prev,
          completedTasks: [...prev.completedTasks, task.id],
          progress: (completed / tasks.length) * 100
        }));

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setState(prev => ({
        ...prev,
        currentTask: null,
        isComplete: true,
        progress: 100
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Loading failed',
        currentTask: null
      }));
    }
  }, [tasks]);

  useEffect(() => {
    if (tasks.length > 0) {
      executeTasks();
    }
  }, [executeTasks]);

  return {
    ...state,
    reset: () => setState({
      currentTask: null,
      completedTasks: [],
      progress: 0,
      isComplete: false,
      error: null
    })
  };
};