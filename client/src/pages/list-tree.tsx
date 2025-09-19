import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, Plus, Calendar, User, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import type { SafeTaskWithAssignee, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
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

  // Inline editing state
  const [editingField, setEditingField] = useState<{ itemId: string; field: string; type: 'project' | 'goal' | 'task' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Get users for assignee dropdown
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const queryClient = useQueryClient();
  
  // Function to update progress for parent items (goals and projects) by modifying child tasks
  const updateProgressForParentItem = async (itemId: string, type: 'goal' | 'project', targetProgress: number) => {
    if (!projects) return;
    
    let childTasks: SafeTaskWithAssignee[] = [];
    
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
    
    if (childTasks.length === 0) return;
    
    // Calculate the optimal distribution to achieve target progress
    const totalTasks = childTasks.length;
    console.log(`Updating progress for ${type} ${itemId} to ${targetProgress}% with ${totalTasks} child tasks`);
    
    // Calculate exact progress needed: completed=100%, in-progress=50%, not-started=0%
    // We need to find the optimal combination
    let bestDistribution = { completed: 0, inProgress: 0, notStarted: totalTasks };
    let bestError = Math.abs(targetProgress - 0); // Start with all not-started (0% progress)
    
    // Try all possible combinations
    for (let completed = 0; completed <= totalTasks; completed++) {
      for (let inProgress = 0; inProgress <= (totalTasks - completed); inProgress++) {
        const notStarted = totalTasks - completed - inProgress;
        const actualProgress = (completed * 100 + inProgress * 50) / totalTasks;
        const error = Math.abs(actualProgress - targetProgress);
        
        if (error < bestError) {
          bestError = error;
          bestDistribution = { completed, inProgress, notStarted };
        }
      }
    }
    
    console.log(`Best distribution: ${bestDistribution.completed} completed, ${bestDistribution.inProgress} in-progress, ${bestDistribution.notStarted} not-started`);
    console.log(`This gives ${(bestDistribution.completed * 100 + bestDistribution.inProgress * 50) / totalTasks}% progress (target: ${targetProgress}%)`);
    
    // Sort tasks by current progress (not-started -> in-progress -> completed) for logical updates
    const sortedTasks = [...childTasks].sort((a, b) => {
      const aProgress = a.status === '완료' ? 100 : a.status === '진행전' ? 0 : 50;
      const bProgress = b.status === '완료' ? 100 : b.status === '진행전' ? 0 : 50;
      return aProgress - bProgress;
    });
    
    // Update tasks to achieve target distribution
    const updates: Array<{task: SafeTaskWithAssignee, newStatus: string}> = [];
    
    for (let i = 0; i < sortedTasks.length; i++) {
      let newStatus: string;
      if (i < bestDistribution.notStarted) {
        newStatus = '진행전';
      } else if (i < bestDistribution.notStarted + bestDistribution.inProgress) {
        newStatus = '진행중';
      } else {
        newStatus = '완료';
      }
      
      if (sortedTasks[i].status !== newStatus) {
        console.log(`Updating task ${sortedTasks[i].title} from ${sortedTasks[i].status} to ${newStatus}`);
        updates.push({ task: sortedTasks[i], newStatus });
      }
    }
    
    // Apply updates
    for (const update of updates) {
      try {
        await updateTaskMutation.mutateAsync({ 
          id: update.task.id, 
          updates: { status: update.newStatus } 
        });
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    }
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
    
    // Update parent selection state based on children (only for task/goal selection)
    if (itemType === 'task' || itemType === 'goal') {
      const parents = getParentItems(itemId);
      
      if (parents.goalId && itemType === 'task') {
        // Check if all tasks in this goal are selected
        const goal = (projects as ProjectWithDetails[])?.find(p => 
          p.goals?.some(g => g.id === parents.goalId)
        )?.goals?.find(g => g.id === parents.goalId);
        
        if (goal?.tasks) {
          const allTasksSelected = goal.tasks.every(task => newSelected.has(task.id));
          if (allTasksSelected && !isCurrentlySelected) {
            newSelected.add(parents.goalId!);
          } else if (!allTasksSelected && isCurrentlySelected) {
            newSelected.delete(parents.goalId!);
          }
        }
      }
      
      if (parents.projectId) {
        // Check if all goals and tasks in this project are selected
        const project = (projects as ProjectWithDetails[])?.find(p => p.id === parents.projectId);
        
        if (project?.goals) {
          const allGoalsAndTasksSelected = project.goals.every(goal => {
            const goalSelected = newSelected.has(goal.id);
            const allTasksSelected = goal.tasks?.every(task => newSelected.has(task.id)) ?? true;
            return goalSelected && allTasksSelected;
          });
          
          if (allGoalsAndTasksSelected && !isCurrentlySelected) {
            newSelected.add(parents.projectId);
          } else if (!allGoalsAndTasksSelected && isCurrentlySelected) {
            newSelected.delete(parents.projectId);
          }
        }
      }
    }
    
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/goals/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/tasks/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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

  const saveEdit = () => {
    if (!editingField) return;
    
    console.log(`SaveEdit called for ${editingField.type} ${editingField.itemId}, field: ${editingField.field}, value: ${editingValue}`);
    
    const updates: any = {};
    
    if (editingField.field === 'deadline') {
      updates.deadline = editingValue;
    } else if (editingField.field === 'assignee') {
      if (editingField.type === 'project') {
        updates.ownerId = editingValue === 'none' ? null : editingValue;
      } else {
        updates.assigneeId = editingValue === 'none' ? null : editingValue;
      }
    } else if (editingField.field === 'status') {
      updates.status = editingValue;
    } else if (editingField.field === 'progress') {
      const progressValue = parseInt(editingValue);
      
      if (editingField.type === 'task') {
        // Map progress to the closest valid value and status
        let finalStatus: string;
        let actualProgress: number;
        
        if (progressValue >= 75) {
          finalStatus = '완료';
          actualProgress = 100;
        } else if (progressValue <= 25) {
          finalStatus = '진행전';
          actualProgress = 0;
        } else {
          finalStatus = '진행중';
          actualProgress = 50;
        }
        
        updates.status = finalStatus;
        
        // Provide user feedback if their input was adjusted
        if (actualProgress !== progressValue) {
          console.log(`Task progress adjusted from ${progressValue}% to ${actualProgress}% to match available statuses`);
          // Show a brief toast or similar feedback in the future
        }
      } else if (editingField.type === 'goal' || editingField.type === 'project') {
        // For goals and projects, we need to update their child tasks to achieve target progress
        // Skip the normal update flow and handle this specially
        console.log(`Calling updateProgressForParentItem for ${editingField.type} ${editingField.itemId} with target ${progressValue}%`);
        try {
          updateProgressForParentItem(editingField.itemId, editingField.type, progressValue);
          console.log(`updateProgressForParentItem completed successfully`);
        } catch (error) {
          console.error('Error in updateProgressForParentItem:', error);
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
      updateProjectMutation.mutate({ id: editingField.itemId, updates });
    } else if (editingField.type === 'goal') {
      updateGoalMutation.mutate({ id: editingField.itemId, updates });
    } else if (editingField.type === 'task') {
      updateTaskMutation.mutate({ id: editingField.itemId, updates });
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
        {formatDeadline(deadline)}
      </div>
    );
  };

  const renderEditableAssignee = (itemId: string, type: 'project' | 'goal' | 'task', assignee: SafeUser | null, ownerId?: string | null) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'assignee';
    const currentUserId = type === 'project' ? ownerId : assignee?.id;
    
    if (isEditing) {
      return (
        <div className="w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center">
          <Select value={editingValue} onValueChange={(value) => {
            setEditingValue(value);
            const updates: any = {};
            if (type === 'project') {
              updates.ownerId = value === 'none' ? null : value;
            } else {
              updates.assigneeId = value === 'none' ? null : value;
            }
            
            if (type === 'project') {
              updateProjectMutation.mutate({ id: itemId, updates });
            } else if (type === 'goal') {
              updateGoalMutation.mutate({ id: itemId, updates });
            } else {
              updateTaskMutation.mutate({ id: itemId, updates });
            }
            cancelEditing();
          }}>
            <SelectTrigger className="h-6 text-xs w-full" data-testid={`edit-assignee-${itemId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">담당자 없음</span>
              </SelectItem>
              {(users as SafeUser[])?.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    return (
      <div 
        className="cursor-pointer hover:bg-muted/20 px-1 py-1 rounded w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center overflow-hidden"
        onClick={() => startEditing(itemId, 'assignee', type, currentUserId || 'none')}
      >
        {assignee ? (
          <div className="flex items-center gap-2 truncate">
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{assignee.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">담당자 없음</span>
        )}
      </div>
    );
  };

  const renderEditableStatus = (itemId: string, type: 'project' | 'goal' | 'task', status: string) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'status';
    
    if (isEditing) {
      return (
        <Select value={editingValue} onValueChange={(value) => {
          setEditingValue(value);
          const updates = { status: value };
          
          if (type === 'project') {
            updateProjectMutation.mutate({ id: itemId, updates });
          } else if (type === 'goal') {
            updateGoalMutation.mutate({ id: itemId, updates });
          } else {
            updateTaskMutation.mutate({ id: itemId, updates });
          }
          cancelEditing();
        }}>
          <SelectTrigger className="h-6 text-xs" data-testid={`edit-status-${itemId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="진행전">진행전</SelectItem>
            <SelectItem value="진행중">진행중</SelectItem>
            <SelectItem value="완료">완료</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <Badge 
        variant={getStatusBadgeVariant(status)} 
        className={`text-xs ${type === 'project' ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
        onClick={type === 'project' ? undefined : () => startEditing(itemId, 'status', type, status)}
      >
        {status}
      </Badge>
    );
  };

  const renderEditableProgress = (itemId: string, type: 'project' | 'goal' | 'task', progress: number, status?: string) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'progress';
    
    if (isEditing) {
      return (
        <Input
          type="number"
          min="0"
          max="100"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={saveEdit}
          className="h-6 text-xs w-16"
          autoFocus
          data-testid={`edit-progress-${itemId}`}
        />
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
  const renderEditableLabel = (itemId: string, type: 'project' | 'goal' | 'task', label: string | null) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'label';
    
    // 프로젝트와 목표는 라벨 편집 불가, 빈값 표시
    if (type !== 'task') {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
    
    if (isEditing) {
      return (
        <Input 
          value={editingValue} 
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => {
            const updates = { label: editingValue || null };
            updateTaskMutation.mutate({ id: itemId, updates });
            cancelEditing();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const updates = { label: editingValue || null };
              updateTaskMutation.mutate({ id: itemId, updates });
              cancelEditing();
            }
            if (e.key === 'Escape') {
              cancelEditing();
            }
          }}
          className="h-6 text-xs"
          data-testid={`edit-label-${itemId}`}
          autoFocus
        />
      );
    }
    
    return (
      <div 
        className="cursor-pointer flex items-center min-h-[24px]"
        onClick={() => startEditing(itemId, 'label', type, label || '')}
        data-testid={`text-label-${itemId}`}
      >
        {label ? (
          <Badge 
            className="bg-slate-600 hover:bg-slate-700 text-white text-xs px-2 py-1 font-medium"
          >
            {label}
          </Badge>
        ) : (
          <div className="text-muted-foreground text-xs hover:bg-muted/20 px-2 py-1 rounded">
            라벨 없음
          </div>
        )}
      </div>
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
    <div className="container mx-auto p-6 relative">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">프로젝트 관리</h1>
            <p className="text-muted-foreground">계층 구조로 프로젝트를 관리합니다</p>
          </div>
          <Button 
            onClick={() => setIsProjectModalOpen(true)}
            data-testid="button-add-project"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-muted/30 p-3 rounded-t-lg border">
        <div className="grid grid-cols-11 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">이름</div>
          <div className="col-span-1">마감일</div>
          <div className="col-span-1">담당자</div>
          <div className="col-span-1">라벨</div>
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
              {(projects as ProjectWithDetails[]).map((project) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="grid grid-cols-11 gap-4 items-center">
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
                        <span className="font-medium" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </span>
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
                        {renderEditableAssignee(project.id, 'project', project.owner || null, project.ownerId)}
                      </div>
                      <div className="col-span-1">
                        {renderEditableLabel(project.id, 'project', null)}
                      </div>
                      <div className="col-span-1">
                        {renderEditableStatus(project.id, 'project', (project.progressPercentage || 0) === 0 ? '진행전' : '진행중')}
                      </div>
                      <div className="col-span-2">
                        {renderEditableProgress(project.id, 'project', project.progressPercentage || 0)}
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
                          <div className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="grid grid-cols-11 gap-4 items-center">
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
                                <span className="font-medium" data-testid={`text-goal-name-${goal.id}`}>
                                  {goal.title}
                                </span>
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
                                {renderEditableAssignee(goal.id, 'goal', goal.assigneeId ? (users as SafeUser[])?.find(u => u.id === goal.assigneeId) || null : null, goal.assigneeId)}
                              </div>
                              <div className="col-span-1">
                                {renderEditableLabel(goal.id, 'goal', null)}
                              </div>
                              <div className="col-span-1">
                                {renderEditableStatus(goal.id, 'goal', '목표')}
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
                                <div key={task.id} className="p-3 hover:bg-muted/50 transition-colors">
                                  <div className="grid grid-cols-11 gap-4 items-center">
                                    <div className="col-span-4 flex items-center gap-2 ml-16">
                                      <Checkbox
                                        checked={selectedItems.has(task.id)}
                                        onCheckedChange={() => toggleItemSelection(task.id)}
                                        data-testid={`checkbox-task-${task.id}`}
                                      />
                                      <Circle className="w-4 h-4 text-orange-600" />
                                      <span className="font-medium" data-testid={`text-task-name-${task.id}`}>
                                        {task.title}
                                      </span>
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableDeadline(task.id, 'task', task.deadline)}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableAssignee(task.id, 'task', task.assignee || null)}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableLabel(task.id, 'task', task.label)}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableStatus(task.id, 'task', task.status)}
                                    </div>
                                    <div className="col-span-2">
                                      {renderEditableProgress(task.id, 'task', task.status === '완료' ? 100 : task.status === '진행전' ? 0 : 50, task.status)}
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
              data-testid="button-archive"
            >
              보관하기
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
}