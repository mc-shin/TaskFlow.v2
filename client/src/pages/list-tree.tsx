import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, Plus, Calendar, User, BarChart3, Check, X, Tag, Mail, UserPlus, Trash2, Archive } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { ProjectModal } from "@/components/project-modal";
import { GoalModal } from "@/components/goal-modal";
import { TaskModal } from "@/components/task-modal";
import { apiRequest } from "@/lib/queryClient";
import { KoreanDatePicker } from "@/components/korean-date-picker";
import { parse } from "date-fns";

export default function ListTree() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Get archived items from localStorage and filter out archived projects
  const archivedItems = (() => {
    try {
      const stored = localStorage.getItem('archivedItems');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  // Filter projects to exclude archived ones
  const activeProjects = (projects as ProjectWithDetails[])?.filter(project => {
    return !archivedItems.includes(project.id); // Exclude archived projects
  }).map(project => {
    // Filter out archived goals and tasks (without mutating original data)
    const activeGoals = project.goals?.filter(goal => {
      const isGoalArchived = archivedItems.includes(goal.id);
      return !isGoalArchived;
    }).map(goal => ({
      ...goal,
      tasks: goal.tasks?.filter(task => !archivedItems.includes(task.id)) || []
    }));
    
    return {
      ...project,
      goals: activeGoals || []
    };
  }) || [];

  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSelectionToast, setShowSelectionToast] = useState(false);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean; projectId: string; projectTitle: string }>({ 
    isOpen: false, 
    projectId: '', 
    projectTitle: '' 
  });
  const [taskModalState, setTaskModalState] = useState<{ isOpen: boolean; goalId: string; goalTitle: string }>({ 
    isOpen: false, 
    goalId: '', 
    goalTitle: '' 
  });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('팀원');
  const [emailError, setEmailError] = useState('');
  const [deletedMemberIds, setDeletedMemberIds] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingField, setEditingField] = useState<{ itemId: string; field: string; type: 'project' | 'goal' | 'task' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Get users for assignee dropdown
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const queryClient = useQueryClient();
  
  // Function to update progress for parent items (goals and projects) by modifying child tasks
  const updateProgressForParentItem = async (itemId: string, type: 'goal' | 'project', targetProgress: number): Promise<number> => {
    if (!projects) return targetProgress;
    
    let childTasks: SafeTaskWithAssignees[] = [];
    
    if (type === 'goal') {
      // Find all tasks under this goal
      (projects as ProjectWithDetails[]).forEach(project => {
        const goal = project.goals?.find(g => g.id === itemId);
        if (goal?.tasks) {
          childTasks = goal.tasks;
        }
      });
    } else if (type === 'project') {
      // Find all tasks under all goals in this project
      const project = (projects as ProjectWithDetails[]).find(p => p.id === itemId);
      if (project?.goals) {
        project.goals.forEach(goal => {
          if (goal.tasks) {
            childTasks.push(...goal.tasks);
          }
        });
      }
      // Also include direct project tasks if any
      if (project?.tasks) {
        childTasks.push(...project.tasks);
      }
    }
    
    if (childTasks.length === 0) return targetProgress;
    
    // Improved progress calculation algorithm
    const totalTasks = childTasks.length;
    console.log(`Updating progress for ${type} ${itemId} to ${targetProgress}% with ${totalTasks} child tasks`);
    
    // Get current distribution
    const currentDistribution = childTasks.reduce((acc, task) => {
      if (task.status === '완료') acc.completed++;
      else if (task.status === '진행중') acc.inProgress++;
      else acc.notStarted++;
      return acc;
    }, { completed: 0, inProgress: 0, notStarted: 0 });
    
    const currentProgress = (currentDistribution.completed * 100 + currentDistribution.inProgress * 50) / totalTasks;
    console.log(`Current progress: ${currentProgress}% (${currentDistribution.completed} completed, ${currentDistribution.inProgress} in-progress, ${currentDistribution.notStarted} not-started)`);
    
    // Find optimal distribution with preference for minimal changes
    let bestDistribution = currentDistribution;
    let bestError = Math.abs(currentProgress - targetProgress);
    let bestChangeCount = 0;
    
    // Try all possible combinations, preferring distributions with fewer changes
    for (let completed = 0; completed <= totalTasks; completed++) {
      for (let inProgress = 0; inProgress <= (totalTasks - completed); inProgress++) {
        const notStarted = totalTasks - completed - inProgress;
        const actualProgress = (completed * 100 + inProgress * 50) / totalTasks;
        const error = Math.abs(actualProgress - targetProgress);
        
        // Calculate how many task status changes would be needed
        const changeCount = Math.abs(completed - currentDistribution.completed) + 
                          Math.abs(inProgress - currentDistribution.inProgress) + 
                          Math.abs(notStarted - currentDistribution.notStarted);
        
        // Prefer solution with lower error, or same error with fewer changes
        if (error < bestError || (error === bestError && changeCount < bestChangeCount)) {
          bestError = error;
          bestDistribution = { completed, inProgress, notStarted };
          bestChangeCount = changeCount;
        }
      }
    }
    
    const finalProgress = (bestDistribution.completed * 100 + bestDistribution.inProgress * 50) / totalTasks;
    console.log(`Best distribution: ${bestDistribution.completed} completed, ${bestDistribution.inProgress} in-progress, ${bestDistribution.notStarted} not-started`);
    console.log(`This gives ${finalProgress}% progress (target: ${targetProgress}%, error: ${bestError.toFixed(1)}%)`);
    
    // Deterministic task assignment to exactly match target distribution
    const updates: Array<{task: SafeTaskWithAssignees, newStatus: string}> = [];
    
    // Create target assignment arrays for each status
    const targetAssignment: {[status: string]: SafeTaskWithAssignees[]} = {
      '진행전': [],
      '진행중': [],
      '완료': []
    };
    
    // Group tasks by current status
    const tasksByStatus = {
      '진행전': childTasks.filter(t => t.status === '진행전'),
      '진행중': childTasks.filter(t => t.status === '진행중'),
      '완료': childTasks.filter(t => t.status === '완료')
    };
    
    // First, assign tasks that can keep their current status (minimize changes)
    const keepNotStarted = Math.min(tasksByStatus['진행전'].length, bestDistribution.notStarted);
    const keepInProgress = Math.min(tasksByStatus['진행중'].length, bestDistribution.inProgress);
    const keepCompleted = Math.min(tasksByStatus['완료'].length, bestDistribution.completed);
    
    targetAssignment['진행전'].push(...tasksByStatus['진행전'].slice(0, keepNotStarted));
    targetAssignment['진행중'].push(...tasksByStatus['진행중'].slice(0, keepInProgress));
    targetAssignment['완료'].push(...tasksByStatus['완료'].slice(0, keepCompleted));
    
    // Collect remaining tasks that need reassignment
    const remainingTasks = [
      ...tasksByStatus['진행전'].slice(keepNotStarted),
      ...tasksByStatus['진행중'].slice(keepInProgress),
      ...tasksByStatus['완료'].slice(keepCompleted)
    ];
    
    // Calculate remaining slots needed for each status
    const remainingSlots = {
      '진행전': bestDistribution.notStarted - keepNotStarted,
      '진행중': bestDistribution.inProgress - keepInProgress,
      '완료': bestDistribution.completed - keepCompleted
    };
    
    // Assign remaining tasks to fill the remaining slots, preferring minimal status changes
    let taskIndex = 0;
    
    // Sort remaining tasks by how close they are to their target status (prefer one-step changes)
    remainingTasks.sort((a, b) => {
      const getStatusOrder = (status: string) => {
        if (status === '진행전') return 0;
        if (status === '진행중') return 1;
        return 2; // '완료'
      };
      
      const aOrder = getStatusOrder(a.status);
      const bOrder = getStatusOrder(b.status);
      return aOrder - bOrder;
    });
    
    // Fill remaining slots in order of preference
    for (const status of ['진행전', '진행중', '완료'] as const) {
      while (remainingSlots[status] > 0 && taskIndex < remainingTasks.length) {
        targetAssignment[status].push(remainingTasks[taskIndex]);
        remainingSlots[status]--;
        taskIndex++;
      }
    }
    
    // Generate updates for tasks that changed status
    for (const [targetStatus, tasks] of Object.entries(targetAssignment)) {
      for (const task of tasks) {
        if (task.status !== targetStatus) {
          updates.push({ task, newStatus: targetStatus });
          console.log(`Updating task "${task.title}" from ${task.status} to ${targetStatus}`);
        }
      }
    }
    
    // Verify the final distribution
    const finalDistribution = {
      completed: targetAssignment['완료'].length,
      inProgress: targetAssignment['진행중'].length,
      notStarted: targetAssignment['진행전'].length
    };
    console.log(`Final verification: ${finalDistribution.completed} completed, ${finalDistribution.inProgress} in-progress, ${finalDistribution.notStarted} not-started`);
    
    if (finalDistribution.completed !== bestDistribution.completed || 
        finalDistribution.inProgress !== bestDistribution.inProgress || 
        finalDistribution.notStarted !== bestDistribution.notStarted) {
      console.error('Distribution mismatch! Target:', bestDistribution, 'Actual:', finalDistribution);
    }
    
    // Apply updates using direct API calls to avoid individual query invalidations
    const updatePromises = updates.map(async (update) => {
      try {
        await apiRequest("PUT", `/api/tasks/${update.task.id}`, { status: update.newStatus });
        return { success: true, update };
      } catch (error) {
        console.error(`Failed to update task "${update.task.title}":`, error);
        return { success: false, update, error };
      }
    });
    
    const results = await Promise.allSettled(updatePromises);
    const failedUpdates = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.success)
    );
    
    if (failedUpdates.length > 0) {
      console.error(`${failedUpdates.length} task updates failed`);
      throw new Error(`${failedUpdates.length} out of ${updates.length} task updates failed`);
    }
    
    // Invalidate queries once after all updates are complete
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    
    // Return the actual achieved progress
    return finalProgress;
  };
  
  // Show/hide toast based on selection
  useEffect(() => {
    setShowSelectionToast(selectedItems.size > 0);
  }, [selectedItems.size]);
  
  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };
  
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };
  
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    
    // Helper function to find all child items of a project or goal
    const getChildItems = (parentId: string, parentType: 'project' | 'goal'): string[] => {
      const childIds: string[] = [];
      
      if (parentType === 'project') {
        // Find all goals and tasks under this project
        const project = (projects as ProjectWithDetails[])?.find(p => p.id === parentId);
        if (project?.goals) {
          project.goals.forEach(goal => {
            childIds.push(goal.id);
            if (goal.tasks) {
              goal.tasks.forEach(task => {
                childIds.push(task.id);
              });
            }
          });
        }
      } else if (parentType === 'goal') {
        // Find all tasks under this goal
        (projects as ProjectWithDetails[])?.forEach(project => {
          const goal = project.goals?.find(g => g.id === parentId);
          if (goal?.tasks) {
            goal.tasks.forEach(task => {
              childIds.push(task.id);
            });
          }
        });
      }
      
      return childIds;
    };
    
    // Helper function to find parent items
    const getParentItems = (childId: string): { projectId?: string; goalId?: string } => {
      for (const project of (projects as ProjectWithDetails[]) || []) {
        // Check if this is a goal of the project
        const goal = project.goals?.find(g => g.id === childId);
        if (goal) {
          return { projectId: project.id };
        }
        
        // Check if this is a task of any goal in the project
        for (const goal of project.goals || []) {
          const task = goal.tasks?.find(t => t.id === childId);
          if (task) {
            return { projectId: project.id, goalId: goal.id };
          }
        }
      }
      return {};
    };
    
    // Determine the type of the selected item
    let itemType: 'project' | 'goal' | 'task' = 'task';
    const isProject = (projects as ProjectWithDetails[])?.some(p => p.id === itemId);
    if (isProject) {
      itemType = 'project';
    } else {
      // Check if it's a goal
      const isGoal = (projects as ProjectWithDetails[])?.some(p => 
        p.goals?.some(g => g.id === itemId)
      );
      if (isGoal) {
        itemType = 'goal';
      }
    }
    
    // For parent items (project/goal), check if they should be considered "selected" 
    // either directly or because all their children are selected
    let isCurrentlySelected = newSelected.has(itemId);
    if (!isCurrentlySelected && (itemType === 'project' || itemType === 'goal')) {
      const childIds = getChildItems(itemId, itemType);
      // Consider parent selected if all children are selected
      if (childIds.length > 0) {
        isCurrentlySelected = childIds.every(childId => newSelected.has(childId));
      }
    }
    
    if (isCurrentlySelected) {
      // Deselecting: remove the item and all its children
      newSelected.delete(itemId);
      
      if (itemType === 'project' || itemType === 'goal') {
        const childIds = getChildItems(itemId, itemType);
        childIds.forEach(childId => newSelected.delete(childId));
      }
    } else {
      // Selecting: add the item and all its children
      newSelected.add(itemId);
      
      if (itemType === 'project' || itemType === 'goal') {
        const childIds = getChildItems(itemId, itemType);
        childIds.forEach(childId => newSelected.add(childId));
      }
    }
    
    // No automatic parent selection when selecting child items
    // Users should explicitly select parent items if they want them selected
    
    setSelectedItems(newSelected);
  };
  
  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Delete selected items
  const deleteSelectedItems = async () => {
    const selectedArray = Array.from(selectedItems);
    
    try {
      // Categorize selected items by type
      const projectIds: string[] = [];
      const goalIds: string[] = [];
      const taskIds: string[] = [];
      
      selectedArray.forEach(itemId => {
        // Check if it's a project
        const isProject = (projects as ProjectWithDetails[])?.some(p => p.id === itemId);
        if (isProject) {
          projectIds.push(itemId);
          return;
        }
        
        // Check if it's a goal
        const isGoal = (projects as ProjectWithDetails[])?.some(p => 
          p.goals?.some(g => g.id === itemId)
        );
        if (isGoal) {
          goalIds.push(itemId);
          return;
        }
        
        // Otherwise it's a task
        taskIds.push(itemId);
      });
      
      // Delete tasks first (to avoid foreign key conflicts)
      for (const taskId of taskIds) {
        await deleteTaskMutation.mutateAsync(taskId);
      }
      
      // Then delete goals
      for (const goalId of goalIds) {
        await deleteGoalMutation.mutateAsync(goalId);
      }
      
      // Finally delete projects
      for (const projectId of projectIds) {
        await deleteProjectMutation.mutateAsync(projectId);
      }
      
      // Clear selection after successful deletion
      clearSelection();
    } catch (error) {
      console.error('Failed to delete selected items:', error);
      // TODO: Show error toast to user
    }
  };

  // Inline editing functions
  const startEditing = (itemId: string, field: string, type: 'project' | 'goal' | 'task', currentValue: string) => {
    setEditingField({ itemId, field, type });
    setEditingValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditingValue('');
  };

  // Mutations for updating items
  const updateProjectMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/projects/${data.id}`, data.updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(["/api/projects"]);

      // Optimistically update the cache
      queryClient.setQueryData(["/api/projects"], (old: ProjectWithDetails[] | undefined) => {
        if (!old) return old;
        
        return old.map(project => 
          project.id === id ? { ...project, ...updates } : project
        );
      });

      return { previousProjects };
    },
    onError: (err, newProject, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/goals/${data.id}`, data.updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(["/api/projects"]);

      // Optimistically update the cache
      queryClient.setQueryData(["/api/projects"], (old: ProjectWithDetails[] | undefined) => {
        if (!old) return old;
        
        return old.map(project => ({
          ...project,
          goals: project.goals?.map(goal => 
            goal.id === id ? { ...goal, ...updates } : goal
          )
        }));
      });

      return { previousProjects };
    },
    onError: (err, newGoal, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/tasks/${data.id}`, data.updates);
    },
    onMutate: async ({ id, updates }) => {
      // Skip optimistic update for progress changes as they require recalculating project progress
      if (updates.progress !== undefined) {
        return { taskId: id, updates };
      }
      
      // Cancel outgoing refetches to prevent optimistic update from being overwritten
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(["/api/projects"]);

      // Optimistically update the cache for non-progress updates
      queryClient.setQueryData(["/api/projects"], (old: ProjectWithDetails[] | undefined) => {
        if (!old) return old;
        
        return old.map(project => ({
          ...project,
          goals: project.goals?.map(goal => ({
            ...goal,
            tasks: goal.tasks?.map(task => 
              task.id === id ? { ...task, ...updates } : task
            )
          }))
        }));
      });

      return { previousProjects, taskId: id, updates };
    },
    onSuccess: (data, variables) => {
      // Backend now stores progress field, no manual cache update needed
    },
    onError: (err, newTask, context) => {
      // Revert the optimistic update on error
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      // Force refetch to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
    }
  });

  // Delete mutations
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const saveEdit = async () => {
    if (!editingField) return;
    
    console.log(`SaveEdit called for ${editingField.type} ${editingField.itemId}, field: ${editingField.field}, value: ${editingValue}`);
    
    const updates: any = {};
    
    if (editingField.field === 'deadline') {
      updates.deadline = editingValue;
    } else if (editingField.field === 'assignee') {
      if (editingField.type === 'project') {
        updates.ownerIds = editingValue === 'none' ? [] : [editingValue];
      } else {
        updates.assigneeIds = editingValue === 'none' ? [] : [editingValue];
      }
    } else if (editingField.field === 'status') {
      updates.status = editingValue;
    } else if (editingField.field === 'progress') {
      const progressValue = parseInt(editingValue);
      
      if (editingField.type === 'task') {
        // Map progress to status for backend
        let finalStatus: string;
        
        if (progressValue === 0) {
          finalStatus = '진행전';
        } else if (progressValue === 100) {
          finalStatus = '완료';
        } else {
          finalStatus = '진행중';
        }
        
        updates.status = finalStatus;
        updates.progress = progressValue;
        
        toast({
          title: "진행도 업데이트",
          description: `작업 진행도가 ${progressValue}%로 업데이트되었습니다.`,
        });
      } else if (editingField.type === 'goal' || editingField.type === 'project') {
        // For goals and projects, we need to update their child tasks to achieve target progress
        // Skip the normal update flow and handle this specially
        console.log(`Calling updateProgressForParentItem for ${editingField.type} ${editingField.itemId} with target ${progressValue}%`);
        try {
          const achievedProgress = await updateProgressForParentItem(editingField.itemId, editingField.type, progressValue);
          console.log(`updateProgressForParentItem completed successfully`);
          
          const itemTypeName = editingField.type === 'goal' ? '목표' : '프로젝트';
          
          const description = Math.round(achievedProgress) === progressValue 
            ? `${itemTypeName} 진행도가 ${progressValue}%로 업데이트되고 하위 작업들이 조정되었습니다.`
            : `${itemTypeName} 진행도가 ${Math.round(achievedProgress)}%로 조정되었습니다 (목표: ${progressValue}%).`;
            
          toast({
            title: "진행도 업데이트 완료",
            description,
          });
          
          // Navigate to graph view after successful progress update
          setTimeout(() => {
            setLocation('/');
          }, 1500);
          
        } catch (error) {
          console.error('Error in updateProgressForParentItem:', error);
          toast({
            title: "진행도 업데이트 실패",
            description: "진행도 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.",
            variant: "destructive",
          });
        }
        cancelEditing();
        return;
      }
    } else if (editingField.field === 'importance') {
      if (editingField.type === 'task') {
        updates.priority = editingValue;
      }
      // Projects and goals don't have importance in the schema
    }

    if (editingField.type === 'project') {
      updateProjectMutation.mutate({ id: editingField.itemId, updates }, {
        onSuccess: () => {
          if (editingField.field === 'progress') {
            setTimeout(() => {
              setLocation('/');
            }, 1500);
          }
        }
      });
    } else if (editingField.type === 'goal') {
      updateGoalMutation.mutate({ id: editingField.itemId, updates }, {
        onSuccess: () => {
          if (editingField.field === 'progress') {
            setTimeout(() => {
              setLocation('/');
            }, 1500);
          }
        }
      });
    } else if (editingField.type === 'task') {
      updateTaskMutation.mutate({ id: editingField.itemId, updates }, {
        onSuccess: () => {
          if (editingField.field === 'progress') {
            setTimeout(() => {
              setLocation('/');
            }, 1500);
          }
        }
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Render functions for editable fields
  const renderEditableDeadline = (itemId: string, type: 'project' | 'goal' | 'task', deadline: string | null) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'deadline';
    
    if (isEditing) {
      return (
        <KoreanDatePicker
          value={editingValue}
          onChange={(value) => {
            setEditingValue(value);
            const updates: any = { deadline: value };
            
            if (type === 'project') {
              updateProjectMutation.mutate({ id: itemId, updates });
            } else if (type === 'goal') {
              updateGoalMutation.mutate({ id: itemId, updates });
            } else {
              updateTaskMutation.mutate({ id: itemId, updates });
            }
            cancelEditing();
          }}
          placeholder="날짜 선택"
          className="h-6 text-xs"
        />
      );
    }
    
    return (
      <div 
        className="cursor-pointer hover:bg-muted/20 px-1 py-1 rounded text-sm"
        onClick={() => startEditing(itemId, 'deadline', type, deadline || '')}
        data-testid={`text-${type}-deadline-${itemId}`}
      >
        <span className={getDDayColorClass(deadline)}>
          {formatDeadline(deadline)}
        </span>
      </div>
    );
  };

  const renderEditableAssignee = (itemId: string, type: 'project' | 'goal' | 'task', assignee: SafeUser | null, ownerIds?: string[] | null, assigneeIds?: string[] | null) => {
    // Get all assignees for display
    const currentAssigneeIds = type === 'project' ? 
      (Array.isArray(ownerIds) ? ownerIds : []) : 
      (Array.isArray(assigneeIds) ? assigneeIds : []);
    const assignees = currentAssigneeIds.map(id => 
      (users as SafeUser[])?.find(user => user.id === id)
    ).filter(Boolean) as SafeUser[];

    const handleAssigneeToggle = (userId: string, isSelected: boolean) => {
      // Get the latest assignee IDs from the current cache/data to avoid stale closure issues
      const latestData = queryClient.getQueryData(["/api/projects"]) as ProjectWithDetails[] | undefined;
      let latestCurrentAssigneeIds: string[] = [];
      
      if (latestData) {
        if (type === 'project') {
          const latestProject = latestData.find(p => p.id === itemId);
          latestCurrentAssigneeIds = Array.isArray(latestProject?.ownerIds) ? latestProject.ownerIds : [];
        } else if (type === 'goal') {
          const latestGoal = latestData.flatMap(p => p.goals || []).find(g => g.id === itemId);
          latestCurrentAssigneeIds = Array.isArray(latestGoal?.assigneeIds) ? latestGoal.assigneeIds : [];
        } else if (type === 'task') {
          const latestTask = latestData
            .flatMap(p => [...(p.tasks || []), ...(p.goals || []).flatMap(g => g.tasks || [])])
            .find(t => t.id === itemId);
          latestCurrentAssigneeIds = Array.isArray(latestTask?.assigneeIds) ? latestTask.assigneeIds : [];
        }
      }
      
      const updates: any = {};
      let newAssigneeIds: string[];
      
      if (isSelected) {
        // Add user to assignees if not already present
        newAssigneeIds = latestCurrentAssigneeIds.includes(userId) 
          ? latestCurrentAssigneeIds 
          : [...latestCurrentAssigneeIds, userId];
      } else {
        // Remove user from assignees
        newAssigneeIds = latestCurrentAssigneeIds.filter(id => id !== userId);
      }
      
      if (type === 'project') {
        updates.ownerIds = newAssigneeIds;
      } else {
        updates.assigneeIds = newAssigneeIds;
      }
      
      if (type === 'project') {
        updateProjectMutation.mutate({ id: itemId, updates });
      } else if (type === 'goal') {
        updateGoalMutation.mutate({ id: itemId, updates });
      } else {
        updateTaskMutation.mutate({ id: itemId, updates });
      }
    };
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="cursor-pointer hover:bg-muted/20 px-1 py-1 rounded w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center overflow-hidden"
            data-testid={`edit-assignee-${itemId}`}
          >
            {assignees.length > 0 ? (
              <div className="flex items-center gap-1 truncate">
                {assignees.slice(0, 4).map((assignee, index) => (
                  <Avatar key={assignee.id} className="w-6 h-6 flex-shrink-0" style={{ zIndex: assignees.length - index }}>
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground border border-white">
                      {assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 4 && (
                  <span className="text-xs text-muted-foreground ml-1">+{assignees.length - 4}</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">담당자 없음</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {type === 'project' ? '소유자' : '담당자'} 선택
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(users as SafeUser[])?.map(user => {
                // Always get the latest data for checkbox state to avoid stale display
                const latestData = queryClient.getQueryData(["/api/projects"]) as ProjectWithDetails[] | undefined;
                let latestAssigneeIds: string[] = [];
                
                if (latestData) {
                  if (type === 'project') {
                    const latestProject = latestData.find(p => p.id === itemId);
                    latestAssigneeIds = Array.isArray(latestProject?.ownerIds) ? latestProject.ownerIds : [];
                  } else if (type === 'goal') {
                    const latestGoal = latestData.flatMap(p => p.goals || []).find(g => g.id === itemId);
                    latestAssigneeIds = Array.isArray(latestGoal?.assigneeIds) ? latestGoal.assigneeIds : [];
                  } else if (type === 'task') {
                    const latestTask = latestData
                      .flatMap(p => [...(p.tasks || []), ...(p.goals || []).flatMap(g => g.tasks || [])])
                      .find(t => t.id === itemId);
                    latestAssigneeIds = Array.isArray(latestTask?.assigneeIds) ? latestTask.assigneeIds : [];
                  }
                }
                
                const isSelected = latestAssigneeIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 hover:bg-muted/50 p-2 rounded cursor-pointer"
                    onClick={() => handleAssigneeToggle(user.id, !isSelected)}
                    data-testid={`checkbox-user-${user.id}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Function to derive status from progress
  const getStatusFromProgress = (progress: number): string => {
    if (progress === 0) return '진행전';
    if (progress >= 100) return '완료';
    return '진행중';
  };

  // Function to derive progress from status
  const getProgressFromStatus = (status: string): number => {
    if (status === '진행전') return 0;
    if (status === '완료') return 100;
    return 50; // '진행중'
  };

  const renderEditableStatus = (itemId: string, type: 'project' | 'goal' | 'task', status: string, progress?: number) => {
    // Status is now read-only and derived from progress if progress is provided
    const displayStatus = progress !== undefined ? getStatusFromProgress(progress) : status;
    
    return (
      <Badge 
        variant={getStatusBadgeVariant(displayStatus)} 
        className="text-xs cursor-default"
        data-testid={`status-${itemId}`}
      >
        {displayStatus}
      </Badge>
    );
  };

  const renderEditableProgress = (itemId: string, type: 'project' | 'goal' | 'task', progress: number, status?: string) => {
    // Only tasks can have their progress edited directly
    if (type !== 'task') {
      return (
        <div className="flex items-center gap-2 px-1 py-1">
          <Progress value={progress} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8">
            {progress}%
          </span>
        </div>
      );
    }

    const isEditing = editingField?.itemId === itemId && editingField?.field === 'progress';
    
    // Progress options for dropdown (10% increments)
    const progressOptions = Array.from({ length: 11 }, (_, i) => i * 10);

    const handleProgressSelect = async (value: string) => {
      const progressValue = parseInt(value);
      
      // Map progress to status for backend
      let finalStatus: string;
      
      if (progressValue === 0) {
        finalStatus = '진행전';
      } else if (progressValue === 100) {
        finalStatus = '완료';
      } else {
        finalStatus = '진행중';
      }

      try {
        await updateTaskMutation.mutateAsync({
          id: itemId,
          updates: { status: finalStatus, progress: progressValue }
        });
        
        toast({
          title: "진행도 업데이트",
          description: `작업 진행도가 ${progressValue}%로 업데이트되었습니다.`,
        });
      } catch (error) {
        console.error('Progress update failed:', error);
        toast({
          title: "업데이트 실패",
          description: "진행도 업데이트 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
      
      cancelEditing();
    };
    
    if (isEditing) {
      return (
        <Select value={progress.toString()} onValueChange={handleProgressSelect}>
          <SelectTrigger className="h-6 text-xs w-16" data-testid={`edit-progress-${itemId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {progressOptions.map((option) => (
              <SelectItem key={option} value={option.toString()}>
                {option}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 px-1 py-1 rounded"
        onClick={() => startEditing(itemId, 'progress', type, progress.toString())}
      >
        <Progress value={progress} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8">
          {progress}%
        </span>
      </div>
    );
  };

  // 라벨 편집 기능
  const renderEditableLabel = (itemId: string, type: 'project' | 'goal' | 'task', labels: string[]) => {
    const currentLabels = labels || [];
    
    // Get current item data
    let currentItem: any = null;
    if (type === 'project') {
      currentItem = (projects as ProjectWithDetails[])?.find(p => p.id === itemId);
    } else if (type === 'goal') {
      currentItem = (projects as ProjectWithDetails[])?.flatMap(p => p.goals || []).find(g => g.id === itemId);
    } else if (type === 'task') {
      currentItem = (projects as ProjectWithDetails[])
        ?.flatMap(p => [...(p.tasks || []), ...(p.goals || []).flatMap(g => g.tasks || [])])
        .find(t => t.id === itemId);
    }
    
    const handleLabelAdd = (newLabel: string) => {
      if (!newLabel.trim() || currentLabels.length >= 2 || newLabel.trim().length > 5) return;
      
      const updatedLabels = [...currentLabels, newLabel.trim()];
      
      if (type === 'project') {
        updateProjectMutation.mutate({ id: itemId, updates: { labels: updatedLabels } });
      } else if (type === 'goal') {
        updateGoalMutation.mutate({ id: itemId, updates: { labels: updatedLabels } });
      } else if (type === 'task') {
        updateTaskMutation.mutate({ id: itemId, updates: { labels: updatedLabels } });
      }
    };
    
    const handleLabelRemove = (labelToRemove: string) => {
      const updatedLabels = currentLabels.filter(label => label !== labelToRemove);
      
      if (type === 'project') {
        updateProjectMutation.mutate({ id: itemId, updates: { labels: updatedLabels } });
      } else if (type === 'goal') {
        updateGoalMutation.mutate({ id: itemId, updates: { labels: updatedLabels } });
      } else if (type === 'task') {
        updateTaskMutation.mutate({ id: itemId, updates: { labels: updatedLabels } });
      }
    };
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="cursor-pointer hover:bg-muted/20 rounded-md min-w-16 min-h-6 flex items-center px-1 gap-1 flex-wrap"
            data-testid={`edit-labels-${itemId}`}
          >
            {currentLabels.length > 0 ? (
              currentLabels.map((label, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={`text-xs ${index === 0 ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                >
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Tag className="w-3 h-3" />
                라벨
              </span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">라벨 편집 (최대 2개)</h4>
            
            {/* 입력 필드 */}
            {currentLabels.length < 2 && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="새 라벨 입력 (최대 5글자)"
                    className="flex-1 h-8"
                    maxLength={5}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        handleLabelAdd(target.value);
                        target.value = '';
                      }
                    }}
                    data-testid={`input-new-label-${itemId}`}
                  />
                </div>
                <div className="text-xs text-muted-foreground">최대 5글자</div>
              </div>
            )}
            
            {/* 기존 라벨 목록 */}
            {currentLabels.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">현재 라벨</div>
                {currentLabels.map((label, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <Badge variant="outline" className="text-xs">
                      {label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLabelRemove(label)}
                      className="h-6 w-6 p-0"
                      data-testid={`button-remove-label-${itemId}-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {currentLabels.length >= 2 && (
              <div className="text-xs text-muted-foreground text-center">
                최대 2개의 라벨을 사용할 수 있습니다.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderEditableImportance = (itemId: string, type: 'project' | 'goal' | 'task', importance: string) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'importance';
    
    // 프로젝트와 목표는 중요도 표시하지 않음
    if (type !== 'task') {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
    
    if (isEditing) {
      return (
        <Select value={editingValue} onValueChange={(value) => {
          setEditingValue(value);
          updateTaskMutation.mutate({ id: itemId, updates: { priority: value } });
          cancelEditing();
        }}>
          <SelectTrigger className="h-6 text-xs" data-testid={`edit-importance-${itemId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="높음">높음</SelectItem>
            <SelectItem value="중간">중간</SelectItem>
            <SelectItem value="낮음">낮음</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <Badge 
        variant={getImportanceBadgeVariant(importance)} 
        className="text-xs cursor-pointer hover:opacity-80"
        onClick={() => startEditing(itemId, 'importance', type, importance)}
      >
        {importance}
      </Badge>
    );
  };
  
  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '-';
    
    // Use same parsing logic as KoreanDatePicker to avoid timezone issues
    const deadlineDate = parse(deadline, 'yyyy-MM-dd', new Date());
    
    // Check if the parsed date is valid
    if (isNaN(deadlineDate.getTime())) {
      return '-';
    }
    
    const month = deadlineDate.getMonth() + 1;
    const day = deadlineDate.getDate();
    
    // Calculate D-day
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight for accurate comparison
    deadlineDate.setHours(0, 0, 0, 0); // Set to midnight for accurate comparison
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let dDayPart = '';
    if (diffDays < 0) {
      dDayPart = ` D+${Math.abs(diffDays)}`;
    } else if (diffDays === 0) {
      dDayPart = ' D-Day';
    } else {
      dDayPart = ` D-${diffDays}`;
    }
    
    return `${month}/${day}${dDayPart}`;
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "진행전":
        return "secondary" as const;
      case "진행중":
        return "default" as const;
      case "완료":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };
  
  const getImportanceBadgeVariant = (importance: string) => {
    switch (importance) {
      case "높음":
        return "destructive" as const;
      case "중간":
        return "default" as const;
      case "낮음":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  const getDDayColorClass = (deadline: string | null) => {
    if (!deadline) return "text-muted-foreground";
    
    const deadlineDate = parse(deadline, 'yyyy-MM-dd', new Date());
    if (isNaN(deadlineDate.getTime())) {
      return "text-muted-foreground";
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "px-2 py-1 text-xs rounded font-medium bg-red-100 text-red-700";
    } else if (diffDays === 0) {
      return "px-2 py-1 text-xs rounded font-medium bg-orange-100 text-orange-700";
    } else {
      return "px-2 py-1 text-xs rounded font-medium bg-blue-100 text-blue-700";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              데이터를 불러오는데 실패했습니다
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">프로젝트 관리</h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">계층 구조로 프로젝트를 관리합니다</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="default"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => setLocation('/archive')}
            data-testid="button-archive-page"
          >
            <Archive className="w-4 h-4 mr-2" />
            보관함
          </Button>
          <Button 
            onClick={() => setIsProjectModalOpen(true)}
            data-testid="button-add-project"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">

        {/* Project Members Section */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">프로젝트 참여자</h3>
                  <div className="flex items-center gap-2">
                    {(() => {
                      // Get all unique assignees from all projects
                      const allAssignees = new Set<string>();
                      (projects as ProjectWithDetails[])?.forEach(project => {
                        // Add project owners
                        if (project.ownerIds) {
                          project.ownerIds.forEach(id => allAssignees.add(id));
                        }
                        // Add goal assignees
                        project.goals?.forEach(goal => {
                          if (goal.assigneeIds) {
                            goal.assigneeIds.forEach(id => allAssignees.add(id));
                          }
                        });
                        // Add task assignees
                        project.tasks?.forEach(task => {
                          if (task.assigneeIds) {
                            task.assigneeIds.forEach(id => allAssignees.add(id));
                          }
                        });
                        // Add task assignees from goal tasks
                        project.goals?.forEach(goal => {
                          goal.tasks?.forEach(task => {
                            if (task.assigneeIds) {
                              task.assigneeIds.forEach(id => allAssignees.add(id));
                            }
                          });
                        });
                      });
                      
                      const uniqueMembers = Array.from(allAssignees)
                        .map(id => (users as SafeUser[])?.find(user => user.id === id))
                        .filter(Boolean) as SafeUser[];
                      
                      return uniqueMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-2" data-testid={`member-${member.id}`}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{member.name}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <Button 
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setIsInviteModalOpen(true)}
                  data-testid="button-invite-member"
                >
                  <User className="h-4 w-4" />
                  멤버 초대
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Table Header */}
      <div className="bg-muted/30 p-3 rounded-t-lg border">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">이름</div>
          <div className="col-span-1">마감일</div>
          <div className="col-span-1">담당자</div>
          <div className="col-span-2">라벨</div>
          <div className="col-span-1">상태</div>
          <div className="col-span-2">진행도</div>
          <div className="col-span-1">중요도</div>
        </div>
      </div>

      {/* Content */}
      <Card className="rounded-t-none">
        <CardContent className="p-0">
          {(!projects || (projects as ProjectWithDetails[]).length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>프로젝트가 없습니다</p>
              <p className="text-sm mt-1">새 프로젝트를 추가해주세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {activeProjects.map((project) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' ? 'opacity-50' : ''}`}>
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 flex items-center gap-2">
                        <Checkbox
                          checked={selectedItems.has(project.id)}
                          onCheckedChange={() => toggleItemSelection(project.id)}
                          data-testid={`checkbox-project-${project.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleProject(project.id)}
                        >
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        <button 
                          className="font-medium hover:text-blue-600 cursor-pointer transition-colors text-left" 
                          onClick={() => setLocation(`/detail/project/${project.id}`)}
                          data-testid={`text-project-name-${project.id}`}
                        >
                          {project.name}
                        </button>
                        <Badge variant="outline" className="text-xs">
                          {project.code}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => setGoalModalState({
                            isOpen: true,
                            projectId: project.id,
                            projectTitle: project.name
                          })}
                          data-testid={`button-add-goal-${project.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="col-span-1">
                        {renderEditableDeadline(project.id, 'project', project.deadline)}
                      </div>
                      <div className="col-span-1">
                        {renderEditableAssignee(project.id, 'project', project.owners && project.owners.length > 0 ? project.owners[0] : null, project.ownerIds)}
                      </div>
                      <div className="col-span-2">
                        {renderEditableLabel(project.id, 'project', project.labels || [])}
                      </div>
                      <div className="col-span-1">
                        {renderEditableStatus(project.id, 'project', '', project.progressPercentage || 0)}
                      </div>
                      <div className="col-span-2">
                        {(() => {
                          // Calculate progress as "프로젝트 하위 목표 진행도 총합 / 목표 수"
                          const goals = project.goals || [];
                          if (goals.length === 0) return renderEditableProgress(project.id, 'project', 0);
                          
                          const goalProgressSum = goals.reduce((sum, goal) => {
                            const goalTasks = goal.tasks || [];
                            const goalProgress = goalTasks.length > 0 
                              ? goalTasks.reduce((taskSum, task) => taskSum + (task.progress || 0), 0) / goalTasks.length
                              : 0;
                            return sum + goalProgress;
                          }, 0);
                          
                          const averageProgress = Math.round(goalProgressSum / goals.length);
                          return renderEditableProgress(project.id, 'project', averageProgress);
                        })()}
                      </div>
                      <div className="col-span-1">
                        {renderEditableImportance(project.id, 'project', '중간')}
                      </div>
                    </div>
                  </div>

                  {/* Goals */}
                  {expandedProjects.has(project.id) && project.goals && (
                    <div className="bg-muted/20">
                      {project.goals.map((goal) => (
                        <div key={goal.id}>
                          {/* Goal Row */}
                          <div className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' || goal.status === '완료' ? 'opacity-50' : ''}`}>
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-4 flex items-center gap-2 ml-8">
                                <Checkbox
                                  checked={selectedItems.has(goal.id)}
                                  onCheckedChange={() => toggleItemSelection(goal.id)}
                                  data-testid={`checkbox-goal-${goal.id}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleGoal(goal.id)}
                                >
                                  {expandedGoals.has(goal.id) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                                <Target className="w-4 h-4 text-green-600" />
                                <button 
                                  className="font-medium hover:text-green-600 cursor-pointer transition-colors text-left" 
                                  onClick={() => setLocation(`/detail/goal/${goal.id}`)}
                                  data-testid={`text-goal-name-${goal.id}`}
                                >
                                  {goal.title}
                                </button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-2"
                                  onClick={() => setTaskModalState({
                                    isOpen: true,
                                    goalId: goal.id,
                                    goalTitle: goal.title
                                  })}
                                  data-testid={`button-add-task-${goal.id}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="col-span-1">
                                {renderEditableDeadline(goal.id, 'goal', goal.deadline)}
                              </div>
                              <div className="col-span-1">
                                {renderEditableAssignee(goal.id, 'goal', goal.assigneeIds && goal.assigneeIds.length > 0 ? (users as SafeUser[])?.find(u => u.id === goal.assigneeIds![0]) || null : null, undefined, goal.assigneeIds)}
                              </div>
                              <div className="col-span-2">
                                {renderEditableLabel(goal.id, 'goal', goal.labels || [])}
                              </div>
                              <div className="col-span-1">
                                {renderEditableStatus(goal.id, 'goal', '', goal.progressPercentage || 0)}
                              </div>
                              <div className="col-span-2">
                                {renderEditableProgress(goal.id, 'goal', goal.progressPercentage || 0)}
                              </div>
                              <div className="col-span-1">
                                {renderEditableImportance(goal.id, 'goal', '중간')}
                              </div>
                            </div>
                          </div>

                          {/* Tasks */}
                          {expandedGoals.has(goal.id) && goal.tasks && (
                            <div className="bg-muted/30">
                              {goal.tasks.map((task) => (
                                <div key={task.id} className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' || goal.status === '완료' || task.status === '완료' ? 'opacity-50' : ''}`}>
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 flex items-center gap-2 ml-16">
                                      <Checkbox
                                        checked={selectedItems.has(task.id)}
                                        onCheckedChange={() => toggleItemSelection(task.id)}
                                        data-testid={`checkbox-task-${task.id}`}
                                      />
                                      <Circle className="w-4 h-4 text-orange-600" />
                                      <button 
                                        className="font-medium hover:text-orange-600 cursor-pointer transition-colors text-left" 
                                        onClick={() => setLocation(`/detail/task/${task.id}`)}
                                        data-testid={`text-task-name-${task.id}`}
                                      >
                                        {task.title}
                                      </button>
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableDeadline(task.id, 'task', task.deadline)}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableAssignee(task.id, 'task', task.assignees && task.assignees.length > 0 ? task.assignees[0] : null, undefined, task.assigneeIds)}
                                    </div>
                                    <div className="col-span-2">
                                      {renderEditableLabel(task.id, 'task', task.labels || [])}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableStatus(task.id, 'task', task.status, getProgressFromStatus(task.status))}
                                    </div>
                                    <div className="col-span-2">
                                      {renderEditableProgress(task.id, 'task', task.progress ?? getProgressFromStatus(task.status), task.status)}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableImportance(task.id, 'task', task.priority || '중간')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Selection Toast */}
      {showSelectionToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedItems.size}개 선택됨
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-slate-800 text-sm"
              onClick={clearSelection}
              data-testid="button-clear-selection"
            >
              선택 해제
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-sm"
              onClick={deleteSelectedItems}
              disabled={deleteProjectMutation.isPending || deleteGoalMutation.isPending || deleteTaskMutation.isPending}
              data-testid="button-delete-selection"
            >
              {(deleteProjectMutation.isPending || deleteGoalMutation.isPending || deleteTaskMutation.isPending) ? '삭제 중...' : '삭제'}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-sm"
              onClick={() => {
                // Get existing archived items from localStorage
                const existingArchived = localStorage.getItem('archivedItems');
                const archivedItems = existingArchived ? JSON.parse(existingArchived) : [];
                
                // Add selected items to archived list
                const newArchivedItems = [...archivedItems, ...Array.from(selectedItems)];
                localStorage.setItem('archivedItems', JSON.stringify(newArchivedItems));
                
                toast({
                  title: "보관 완료",
                  description: `${selectedItems.size}개 항목이 보관함으로 이동되었습니다.`,
                });
                clearSelection();
                setTimeout(() => {
                  setLocation('/archive');
                }, 1000);
              }}
              data-testid="button-archive"
            >
              보관하기
            </Button>
          </div>
        </div>
      )}

      </main>

      {/* Modals */}
      <ProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
      />
      
      <GoalModal 
        isOpen={goalModalState.isOpen} 
        onClose={() => setGoalModalState({ isOpen: false, projectId: '', projectTitle: '' })}
        projectId={goalModalState.projectId}
        projectTitle={goalModalState.projectTitle}
      />
      
      <TaskModal 
        isOpen={taskModalState.isOpen} 
        onClose={() => setTaskModalState({ isOpen: false, goalId: '', goalTitle: '' })}
        goalId={taskModalState.goalId}
        goalTitle={taskModalState.goalTitle}
      />

      {/* Member Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">초대</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="kmeod@rido.io"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className={`flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 ${emailError ? 'border-red-500' : ''}`}
                  data-testid="input-invite-email"
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white" data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="관리자" className="text-white hover:bg-slate-600">관리자</SelectItem>
                    <SelectItem value="팀원" className="text-white hover:bg-slate-600">팀원</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  onClick={() => {
                    // Email validation
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(inviteEmail)) {
                      setEmailError('올바른 이메일을 입력해 주세요.');
                      return;
                    }
                    
                    // Handle invite logic here
                    toast({
                      title: "초대 완료",
                      description: `${inviteEmail}로 ${inviteRole} 권한으로 초대를 보냈습니다.`,
                    });
                    setInviteEmail('');
                    setInviteRole('팀원');
                    setEmailError('');
                  }}
                  disabled={!inviteEmail.trim()}
                  data-testid="button-send-invite"
                >
                  초대하기
                </Button>
              </div>
              {emailError && (
                <p className="text-red-400 text-sm mt-1" data-testid="text-email-error">{emailError}</p>
              )}
            </div>

            {/* Existing Members */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">하이더의 멤버</h4>
              <div className="space-y-2 overflow-y-auto relative" style={{minHeight: '340px', maxHeight: '340px'}}>
                {(() => {
                  const allUsers = Array.isArray(users) ? users as SafeUser[] : [];
                  const filteredUsers = allUsers.filter(user => !deletedMemberIds.has(user.id));
                  
                  return (
                    <>
                      {filteredUsers.map((user) => {
                        const originalIndex = allUsers.findIndex(originalUser => originalUser.id === user.id);
                        return (
                          <div key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-700 rounded" data-testid={`member-row-${user.id}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-600 text-white text-sm">
                                  {user.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-white">{user.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                                {originalIndex === 0 ? '관리자' : '팀원'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                                onClick={() => {
                                  setDeletedMemberIds(prev => new Set([...Array.from(prev), user.id]));
                                  toast({
                                    title: "멤버 삭제",
                                    description: `${user.name}님이 목록에서 제거되었습니다.`,
                                  });
                                }}
                                data-testid={`button-delete-member-${user.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                          멤버가 없습니다.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}