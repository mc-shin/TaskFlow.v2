import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, ArrowLeft, X, Eye, Undo2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { parse } from "date-fns";

export default function Archive() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutations for restoring items
  const createProjectMutation = useMutation({
    mutationFn: (projectData: any) => apiRequest("POST", "/api/projects", projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: (goalData: any) => apiRequest("POST", "/api/goals", goalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => apiRequest("POST", "/api/tasks", taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  // State for checkbox selections
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // State for item detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'project' | 'goal' | 'task'>('task');

  // Helper functions from list-tree page for consistent UI
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

  const getStatusFromProgress = (progress: number): string => {
    if (progress === 0) return '진행전';
    if (progress >= 100) return '완료';
    return '진행중';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "진행전":
        return "secondary" as const;
      case "진행중":
        return "default" as const;
      case "완료":
        return "outline" as const;
      case "보류":
        return "destructive" as const;
      default:
        return "secondary" as const;
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
        return "secondary" as const;
    }
  };

  // Checkbox selection functions (new logic: parent selects children, but children don't select parent)
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    
    // Determine the type of the selected item
    let itemType: 'project' | 'goal' | 'task' = 'task';
    const isProject = (archivedProjects as ProjectWithDetails[])?.some(p => p.id === itemId);
    if (isProject) {
      itemType = 'project';
    } else {
      // Check if it's a goal
      const isGoal = (archivedProjects as ProjectWithDetails[])?.some(p => 
        p.goals?.some(g => g.id === itemId)
      );
      if (isGoal) {
        itemType = 'goal';
      }
    }
    
    // Check if currently selected (only direct selection, not automatic parent selection)
    const isCurrentlySelected = newSelected.has(itemId);
    
    if (isCurrentlySelected) {
      // Deselecting: remove the item and all its children
      newSelected.delete(itemId);
      
      if (itemType === 'project' || itemType === 'goal') {
        const childIds = getChildItems(itemId, itemType);
        childIds.forEach(childId => newSelected.delete(childId));
      }
    } else {
      // Selecting: add the item and (if parent) all its children
      newSelected.add(itemId);
      
      if (itemType === 'project' || itemType === 'goal') {
        const childIds = getChildItems(itemId, itemType);
        childIds.forEach(childId => newSelected.add(childId));
      }
      // Note: Children don't automatically select their parents
    }
    
    setSelectedItems(newSelected);
  };

  // Helper functions for checkbox state display
  const getChildItems = (parentId: string, parentType: 'project' | 'goal'): string[] => {
    const childIds: string[] = [];
    
    if (parentType === 'project') {
      // Find all goals and tasks under this project
      const project = archivedProjects?.find(p => p.id === parentId);
      if (project?.goals) {
        project.goals.forEach((goal: any) => {
          childIds.push(goal.id);
          if (goal.tasks) {
            goal.tasks.forEach((task: any) => {
              childIds.push(task.id);
            });
          }
        });
      }
      // Also include direct project tasks if they exist
      if (project?.tasks) {
        project.tasks.forEach((task: any) => {
          childIds.push(task.id);
        });
      }
    } else if (parentType === 'goal') {
      // Find all tasks under this goal
      archivedProjects?.forEach(project => {
        const goal = project.goals?.find((g: any) => g.id === parentId);
        if (goal?.tasks) {
          goal.tasks.forEach((task: any) => {
            childIds.push(task.id);
          });
        }
      });
    }
    
    return childIds;
  };

  const isItemChecked = (itemId: string): boolean => {
    // Only check direct selection, no automatic parent selection
    return selectedItems.has(itemId);
  };


  // Label display function (read-only for archive)
  const renderLabels = (labels: string[]) => {
    const currentLabels = labels || [];
    
    return (
      <div className="cursor-default rounded-md min-w-16 min-h-6 flex items-center px-1 gap-1 flex-wrap">
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
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </div>
    );
  };

  // Importance display function (read-only for archive)
  const renderImportance = (type: 'project' | 'goal' | 'task', importance?: string | null) => {
    // 프로젝트와 목표는 중요도 표시하지 않음
    if (type !== 'task') {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
    
    if (!importance) {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
    
    return (
      <Badge 
        variant={getImportanceBadgeVariant(importance)} 
        className="text-xs cursor-default"
      >
        {importance}
      </Badge>
    );
  };

  // State for archived items with direct localStorage access
  const [archivedItems, setArchivedItems] = useState<any[]>([]);
  
  // Function to read from localStorage
  const readArchivedItems = () => {
    try {
      const stored = localStorage.getItem('archivedItems');
      const parsed = stored ? JSON.parse(stored) : [];
      console.log('Archive page - localStorage archivedItems:', parsed);
      setArchivedItems(parsed);
      return parsed;
    } catch {
      console.log('Archive page - failed to parse localStorage archivedItems');
      setArchivedItems([]);
      return [];
    }
  };
  
  // Read archived items on mount and when page becomes visible
  useEffect(() => {
    readArchivedItems();
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        readArchivedItems();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Create archive display structure from localStorage items
  const archivedProjects = useMemo(() => {
    if (!archivedItems.length) return [];
    
    // Since we only archive projects now, just map them directly with their original goals and tasks
    return archivedItems.filter(item => item.type === 'project').map(item => ({
      ...item,
      // Keep original goals and tasks if they exist, otherwise default to empty arrays
      goals: item.goals || [],
      tasks: item.tasks || []
    }));
  }, [archivedItems]);

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const [_, setLocation] = useLocation();
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleGoal = (goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const getUserById = (userId: string): SafeUser | undefined => {
    return (users as SafeUser[])?.find(user => user.id === userId);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Function to open item detail modal
  const openItemDetail = (item: any, type: 'project' | 'goal' | 'task') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setDetailModalOpen(true);
  };

  // Function to restore selected items to list
  const restoreSelectedItems = async () => {
    const selectedArray = Array.from(selectedItems);
    
    try {
      // Get archived items that match selected IDs
      const allSelectedItems = archivedItems.filter((item: any) => {
        const itemId = item.id || (item.data && item.data.id);
        return selectedArray.includes(itemId);
      });
      
      // Filter to only get selected projects
      const selectedProjects = allSelectedItems.filter((item: any) => item.type === 'project');
      const nonProjectCount = allSelectedItems.length - selectedProjects.length;
      
      if (selectedProjects.length === 0) {
        toast({
          title: "복원 제한",
          description: "프로젝트 기준으로 이동이 가능합니다.",
          variant: "destructive",
        });
        return;
      }
      
      // Show info message if non-project items were also selected
      if (nonProjectCount > 0) {
        toast({
          title: "복원 안내",
          description: `선택된 항목 중 ${selectedProjects.length}개 프로젝트만 복원됩니다.`,
        });
      }

      // Restore projects to database
      for (const item of selectedProjects) {
        const itemData = item.data || item;
        
        await createProjectMutation.mutateAsync({
          name: itemData.name,
          code: itemData.code,
          description: itemData.description,
          deadline: itemData.deadline,
          labels: itemData.labels || [],
          owners: itemData.owners || []
        });
      }

      // Remove restored projects from localStorage
      const restoredProjectIds = selectedProjects.map((item: any) => item.id || (item.data && item.data.id));
      const remainingItems = archivedItems.filter((item: any) => {
        const itemId = item.id || (item.data && item.data.id);
        return !restoredProjectIds.includes(itemId);
      });
      
      localStorage.setItem('archivedItems', JSON.stringify(remainingItems));
      setArchivedItems(remainingItems);

      toast({
        title: "복원 완료",
        description: `${selectedProjects.length}개 프로젝트가 리스트로 복원되었습니다.`,
      });

      setSelectedItems(new Set());
      
      // Navigate to list page after restoration
      setTimeout(() => {
        setLocation('/list');
      }, 1000);

    } catch (error) {
      console.error('Failed to restore items:', error);
      toast({
        title: "복원 실패",
        description: "항목을 복원하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
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
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/list')}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">보관함</h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">보관된 프로젝트, 목표, 작업을 관리합니다</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">

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
          {(!archivedProjects || archivedProjects.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>보관된 항목이 없습니다</p>
              <p className="text-sm mt-1">리스트에서 항목을 보관해주세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {archivedProjects.map((project) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' ? 'opacity-50' : ''}`}>
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 flex items-center gap-2">
                        <Checkbox
                          checked={isItemChecked(project.id)}
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
                          onClick={() => openItemDetail(project, 'project')}
                          data-testid={`text-project-name-${project.id}`}
                        >
                          {project.name}
                        </button>
                        <Badge variant="outline" className="text-xs">
                          {project.code}
                        </Badge>
                      </div>
                      <div className="col-span-1">
                        <div 
                          className="cursor-default hover:bg-muted/20 px-1 py-1 rounded text-sm"
                          data-testid={`text-project-deadline-${project.id}`}
                        >
                          <span className={getDDayColorClass(project.deadline)}>
                            {formatDeadline(project.deadline)}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div 
                          className="cursor-default hover:bg-muted/20 px-1 py-1 rounded w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center overflow-hidden"
                          data-testid={`edit-assignee-${project.id}`}
                        >
                          {project.owners && project.owners.length > 0 ? (
                            <div className="flex items-center gap-1 truncate">
                              {project.owners.slice(0, 4).map((owner: any, index: number) => (
                                <Avatar key={owner.id} className="w-6 h-6 flex-shrink-0" style={{ zIndex: project.owners!.length - index }}>
                                  <AvatarFallback className="text-xs bg-primary text-primary-foreground border border-white">
                                    {owner.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {project.owners.length > 4 && (
                                <span className="text-xs text-muted-foreground ml-1">+{project.owners.length - 4}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">담당자 없음</span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        {renderLabels(project.labels || [])}
                      </div>
                      <div className="col-span-1">
                        <Badge 
                          variant={getStatusBadgeVariant(getStatusFromProgress(project.progressPercentage || 0))}
                          className="text-xs cursor-default"
                          data-testid={`status-${project.id}`}
                        >
                          {getStatusFromProgress(project.progressPercentage || 0)}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 px-1 py-1">
                          <Progress value={project.progressPercentage || 0} className="flex-1" />
                          <span className="text-xs text-muted-foreground w-8">
                            {project.progressPercentage || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        {renderImportance('project')}
                      </div>
                    </div>
                  </div>

                  {/* Direct Project Tasks */}
                  {expandedProjects.has(project.id) && project.tasks && project.tasks.length > 0 && (
                    <div className="bg-muted/20">
                      {project.tasks.map((task: any) => (
                        <div key={task.id} className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' || task.status === '완료' ? 'opacity-50' : ''}`}>
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-4 flex items-center gap-2 ml-8">
                              <Checkbox
                                checked={isItemChecked(task.id)}
                                onCheckedChange={() => toggleItemSelection(task.id)}
                                data-testid={`checkbox-task-${task.id}`}
                              />
                              <Circle className="w-4 h-4 text-orange-600" />
                              <button 
                                className="font-medium hover:text-orange-600 cursor-pointer transition-colors text-left" 
                                onClick={() => openItemDetail(task, 'task')}
                                data-testid={`text-task-name-${task.id}`}
                              >
                                {task.title}
                              </button>
                            </div>
                            <div className="col-span-1">
                              <div 
                                className="cursor-default hover:bg-muted/20 px-1 py-1 rounded text-sm"
                                data-testid={`text-task-deadline-${task.id}`}
                              >
                                <span className={getDDayColorClass(task.deadline)}>
                                  {formatDeadline(task.deadline)}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-1">
                              <div 
                                className="cursor-default hover:bg-muted/20 px-1 py-1 rounded w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center overflow-hidden"
                                data-testid={`edit-assignee-${task.id}`}
                              >
                                {task.assignees && task.assignees.length > 0 ? (
                                  <div className="flex items-center gap-1 truncate">
                                    {task.assignees.slice(0, 4).map((assignee: any, index: number) => (
                                      <Avatar key={assignee.id} className="w-6 h-6 flex-shrink-0" style={{ zIndex: task.assignees!.length - index }}>
                                        <AvatarFallback className="text-xs bg-primary text-primary-foreground border border-white">
                                          {assignee.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {task.assignees.length > 4 && (
                                      <span className="text-xs text-muted-foreground ml-1">+{task.assignees.length - 4}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">담당자 없음</span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2">
                              {renderLabels(task.labels || [])}
                            </div>
                            <div className="col-span-1">
                              <Badge 
                                variant={getStatusBadgeVariant(task.status)}
                                className="text-xs cursor-default"
                                data-testid={`status-${task.id}`}
                              >
                                {task.status}
                              </Badge>
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-2 px-1 py-1">
                                <Progress value={task.progress || 0} className="flex-1" />
                                <span className="text-xs text-muted-foreground w-8">
                                  {task.progress || 0}%
                                </span>
                              </div>
                            </div>
                            <div className="col-span-1">
                              {renderImportance('task', task.priority)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Goals */}
                  {expandedProjects.has(project.id) && project.goals && (
                    <div className="bg-muted/20">
                      {project.goals.map((goal: any) => (
                        <div key={goal.id}>
                          {/* Goal Row */}
                          <div className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' || goal.status === '완료' ? 'opacity-50' : ''}`}>
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-4 flex items-center gap-2 ml-8">
                                <Checkbox
                                  checked={isItemChecked(goal.id)}
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
                                  onClick={() => openItemDetail(goal, 'goal')}
                                  data-testid={`text-goal-name-${goal.id}`}
                                >
                                  {goal.title}
                                </button>
                              </div>
                              <div className="col-span-1">
                                <div 
                                  className="cursor-default hover:bg-muted/20 px-1 py-1 rounded text-sm"
                                  data-testid={`text-goal-deadline-${goal.id}`}
                                >
                                  <span className={getDDayColorClass(goal.deadline)}>
                                    {formatDeadline(goal.deadline)}
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-1">
                                <div 
                                  className="cursor-default hover:bg-muted/20 px-1 py-1 rounded w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center overflow-hidden"
                                  data-testid={`edit-assignee-${goal.id}`}
                                >
                                  {goal.assignees && goal.assignees.length > 0 ? (
                                    <div className="flex items-center gap-1 truncate">
                                      {goal.assignees.slice(0, 4).map((assignee: any, index: number) => (
                                        <Avatar key={assignee.id} className="w-6 h-6 flex-shrink-0" style={{ zIndex: goal.assignees!.length - index }}>
                                          <AvatarFallback className="text-xs bg-primary text-primary-foreground border border-white">
                                            {assignee.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {goal.assignees.length > 4 && (
                                        <span className="text-xs text-muted-foreground ml-1">+{goal.assignees.length - 4}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">담당자 없음</span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-2">
                                {renderLabels(goal.labels || [])}
                              </div>
                              <div className="col-span-1">
                                <Badge 
                                  variant={getStatusBadgeVariant(getStatusFromProgress(goal.progressPercentage || 0))}
                                  className="text-xs cursor-default"
                                  data-testid={`status-${goal.id}`}
                                >
                                  {getStatusFromProgress(goal.progressPercentage || 0)}
                                </Badge>
                              </div>
                              <div className="col-span-2">
                                <div className="flex items-center gap-2 px-1 py-1">
                                  <Progress value={goal.progressPercentage || 0} className="flex-1" />
                                  <span className="text-xs text-muted-foreground w-8">
                                    {goal.progressPercentage || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-1">
                                {renderImportance('goal')}
                              </div>
                            </div>
                          </div>

                          {/* Tasks */}
                          {expandedGoals.has(goal.id) && goal.tasks && (
                            <div className="bg-muted/30">
                              {goal.tasks.map((task: any) => (
                                <div key={task.id} className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' || goal.status === '완료' || task.status === '완료' ? 'opacity-50' : ''}`}>
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 flex items-center gap-2 ml-16">
                                      <Checkbox
                                        checked={isItemChecked(task.id)}
                                        onCheckedChange={() => toggleItemSelection(task.id)}
                                        data-testid={`checkbox-task-${task.id}`}
                                      />
                                      <Circle className="w-4 h-4 text-orange-600" />
                                      <button 
                                        className="font-medium hover:text-orange-600 cursor-pointer transition-colors text-left" 
                                        onClick={() => openItemDetail(task, 'task')}
                                        data-testid={`text-task-name-${task.id}`}
                                      >
                                        {task.title}
                                      </button>
                                    </div>
                                    <div className="col-span-1">
                                      <div 
                                        className="cursor-default hover:bg-muted/20 px-1 py-1 rounded text-sm"
                                        data-testid={`text-task-deadline-${task.id}`}
                                      >
                                        <span className={getDDayColorClass(task.deadline)}>
                                          {formatDeadline(task.deadline)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      <div 
                                        className="cursor-default hover:bg-muted/20 px-1 py-1 rounded w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center overflow-hidden"
                                        data-testid={`edit-assignee-${task.id}`}
                                      >
                                        {task.assignees && task.assignees.length > 0 ? (
                                          <div className="flex items-center gap-1 truncate">
                                            {task.assignees.slice(0, 4).map((assignee: any, index: number) => (
                                              <Avatar key={assignee.id} className="w-6 h-6 flex-shrink-0" style={{ zIndex: task.assignees!.length - index }}>
                                                <AvatarFallback className="text-xs bg-primary text-primary-foreground border border-white">
                                                  {assignee.name.charAt(0)}
                                                </AvatarFallback>
                                              </Avatar>
                                            ))}
                                            {task.assignees.length > 4 && (
                                              <span className="text-xs text-muted-foreground ml-1">+{task.assignees.length - 4}</span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-sm">담당자 없음</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="col-span-2">
                                      {renderLabels(task.labels || [])}
                                    </div>
                                    <div className="col-span-1">
                                      <Badge 
                                        variant={getStatusBadgeVariant(task.status)}
                                        className="text-xs cursor-default"
                                        data-testid={`status-${task.id}`}
                                      >
                                        {task.status}
                                      </Badge>
                                    </div>
                                    <div className="col-span-2">
                                      <div className="flex items-center gap-2 px-1 py-1">
                                        <Progress value={task.progress || 0} className="flex-1" />
                                        <span className="text-xs text-muted-foreground w-8">
                                          {task.progress || 0}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      {renderImportance('task', task.priority)}
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

      </main>

      {/* Selection Toast */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white rounded-lg shadow-lg z-50 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedItems.size}개 선택됨
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedItems(new Set())}
              data-testid="button-clear-selection"
            >
              선택 해제
            </Button>
            <Button 
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={restoreSelectedItems}
              disabled={createProjectMutation.isPending || createGoalMutation.isPending || createTaskMutation.isPending}
              data-testid="button-restore"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              리스트로 복원
            </Button>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItemType === 'project' && <FolderOpen className="w-5 h-5 text-blue-600" />}
              {selectedItemType === 'goal' && <Target className="w-5 h-5 text-green-600" />}
              {selectedItemType === 'task' && <Circle className="w-5 h-5 text-orange-600" />}
              {selectedItem?.name || selectedItem?.title || '항목 상세'}
              <Badge variant="outline" className="ml-2">보관됨</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              {/* Item Information in specified order */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">항목 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* 1) 프로젝트명/목표명/작업명 */}
                  <div>
                    <label className="text-sm font-medium">
                      {selectedItemType === 'project' ? '프로젝트명' : 
                       selectedItemType === 'goal' ? '목표명' : '작업명'}
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedItem.name || selectedItem.title}
                    </p>
                  </div>
                  
                  {/* 2) 프로젝트 코드 (프로젝트인 경우만) */}
                  {selectedItemType === 'project' && selectedItem.code && (
                    <div>
                      <label className="text-sm font-medium">프로젝트 코드</label>
                      <p className="text-sm text-muted-foreground mt-1">{selectedItem.code}</p>
                    </div>
                  )}
                  
                  {/* 3) 설명 */}
                  {selectedItem.description && (
                    <div>
                      <label className="text-sm font-medium">설명</label>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{selectedItem.description}</p>
                    </div>
                  )}
                  
                  {/* 4) 라벨 */}
                  {selectedItem.labels && selectedItem.labels.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">라벨</label>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {selectedItem.labels.map((label: string, index: number) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className={`text-xs ${index === 0 ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 5) 상태 */}
                  <div>
                    <label className="text-sm font-medium">상태</label>
                    <div className="mt-2">
                      <Badge 
                        variant={getStatusBadgeVariant(selectedItemType === 'project' ? getStatusFromProgress(selectedItem.progressPercentage || 0) : selectedItem.status)}
                        className="text-xs"
                      >
                        {selectedItemType === 'project' ? getStatusFromProgress(selectedItem.progressPercentage || 0) : selectedItem.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* 6) 마감일 */}
                  {selectedItem.deadline && (
                    <div>
                      <label className="text-sm font-medium">마감일</label>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className={getDDayColorClass(selectedItem.deadline)}>
                          {formatDeadline(selectedItem.deadline)}
                        </span>
                      </p>
                    </div>
                  )}
                  
                  {/* 7) 담당자/소유자 */}
                  {((selectedItemType === 'project' && selectedItem.owners) || 
                    ((selectedItemType === 'goal' || selectedItemType === 'task') && selectedItem.assignees)) && (
                    <div>
                      <label className="text-sm font-medium">
                        담당자
                      </label>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {(selectedItemType === 'project' ? selectedItem.owners : selectedItem.assignees)?.map((person: any, index: number) => (
                          <div key={person.id || index} className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {person.name ? person.name.charAt(0) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{person.name}</span>
                          </div>
                        )) || <span className="text-sm text-muted-foreground">담당자 없음</span>}
                      </div>
                    </div>
                  )}
                  
                  {/* 8) 진행도 (프로젝트인 경우) */}
                  {selectedItemType === 'project' && (
                    <div>
                      <label className="text-sm font-medium">진행도</label>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={selectedItem.progressPercentage || 0} className="flex-1" />
                        <span className="text-sm text-muted-foreground">{selectedItem.progressPercentage || 0}%</span>
                      </div>
                    </div>
                  )}
                  
                  {/* 중요도 (작업인 경우 추가 표시) */}
                  {selectedItemType === 'task' && selectedItem.importance && (
                    <div>
                      <label className="text-sm font-medium">중요도</label>
                      <div className="mt-2">
                        <Badge 
                          variant={getImportanceBadgeVariant(selectedItem.importance)}
                          className="text-xs"
                        >
                          {selectedItem.importance}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}