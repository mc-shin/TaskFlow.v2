import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useLocation } from "wouter";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { parse } from "date-fns";

export default function Archive() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  // State for checkbox selections
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  // Checkbox selection functions (hierarchical selection like list page)
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    
    // Helper function to find all child items of a project or goal
    const getChildItems = (parentId: string, parentType: 'project' | 'goal'): string[] => {
      const childIds: string[] = [];
      
      if (parentType === 'project') {
        // Find all goals and tasks under this project
        const project = (archivedProjects as ProjectWithDetails[])?.find(p => p.id === parentId);
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
        (archivedProjects as ProjectWithDetails[])?.forEach(project => {
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
    
    setSelectedItems(newSelected);
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

  // Get archived items from localStorage
  const archivedItems = (() => {
    try {
      const stored = localStorage.getItem('archivedItems');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  // Filter projects to show only archived ones and their archived children
  const archivedProjects = (projects as ProjectWithDetails[])?.filter(project => {
    const isProjectArchived = archivedItems.includes(project.id);
    
    if (isProjectArchived) {
      return true; // Show archived projects
    }
    
    if (project.goals) {
      // Check if any goals or tasks are archived
      const hasArchivedChildren = project.goals.some(goal => 
        archivedItems.includes(goal.id) || 
        (goal.tasks && goal.tasks.some(task => archivedItems.includes(task.id)))
      );
      return hasArchivedChildren;
    }
    
    return false;
  }).map(project => {
    const isProjectArchived = archivedItems.includes(project.id);
    
    if (isProjectArchived) {
      return project; // Show full project if archived
    }
    
    // Show only archived goals and tasks
    const archivedGoals = project.goals?.filter(goal => 
      archivedItems.includes(goal.id) || 
      (goal.tasks && goal.tasks.some(task => archivedItems.includes(task.id)))
    ).map(goal => ({
      ...goal,
      tasks: goal.tasks?.filter(task => archivedItems.includes(task.id)) || []
    })) || [];
    
    return {
      ...project,
      goals: archivedGoals
    };
  }) || [];

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
                              {project.owners.slice(0, 4).map((owner, index) => (
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
                                      {goal.assignees.slice(0, 4).map((assignee, index) => (
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
                                            {task.assignees.slice(0, 4).map((assignee, index) => (
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
    </>
  );
}