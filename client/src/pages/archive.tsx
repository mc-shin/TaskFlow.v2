import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, ArrowLeft, Undo2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { parse } from "date-fns";
import { mapPriorityToLabel, getPriorityBadgeVariant } from "@/lib/priority-utils";

export default function Archive() {
  // Fetch archived data from database-based endpoints
  const { data: archivedProjects, isLoading: loadingProjects } = useQuery<ProjectWithDetails[]>({
    queryKey: ["/api/archive/projects"],
  });

  const { data: archivedGoals, isLoading: loadingGoals } = useQuery<GoalWithTasks[]>({
    queryKey: ["/api/archive/goals"],
  });

  const { data: archivedTasks, isLoading: loadingTasks } = useQuery<SafeTaskWithAssignees[]>({
    queryKey: ["/api/archive/tasks"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutations for restoring items using unarchive endpoints
  const unarchiveProjectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/projects/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archive/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "프로젝트 복원 완료",
        description: "프로젝트가 성공적으로 복원되었습니다.",
      });
    },
  });

  const unarchiveGoalMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/goals/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archive/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "목표 복원 완료",
        description: "목표가 성공적으로 복원되었습니다.",
      });
    },
  });

  const unarchiveTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/tasks/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archive/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "작업 복원 완료",
        description: "작업이 성공적으로 복원되었습니다.",
      });
    },
  });

  // State management
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const [_, setLocation] = useLocation();

  // Loading state combining all queries
  const isLoading = loadingProjects || loadingGoals || loadingTasks;

  // Helper functions
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

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '-';
    
    const deadlineDate = parse(deadline, 'yyyy-MM-dd', new Date());
    
    if (isNaN(deadlineDate.getTime())) {
      return '-';
    }
    
    const month = deadlineDate.getMonth() + 1;
    const day = deadlineDate.getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "진행전":
        return "secondary" as const;
      case "진행중":
        return "default" as const;
      case "완료":
        return "success" as const;
      case "이슈":
        return "issue" as const;
      default:
        return "outline" as const;
    }
  };

  const getUserById = (userId: string): SafeUser | undefined => {
    return (users as SafeUser[])?.find(user => user.id === userId);
  };

  // Restore selected items
  const restoreSelectedItems = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "선택된 항목이 없습니다",
        description: "복원할 항목을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const itemId of Array.from(selectedItems)) {
        // Check if it's a project
        const project = archivedProjects?.find((p: any) => p.id === itemId);
        if (project) {
          await unarchiveProjectMutation.mutateAsync(itemId);
          continue;
        }

        // Check if it's a goal
        const goal = archivedGoals?.find((g: any) => g.id === itemId);
        if (goal) {
          await unarchiveGoalMutation.mutateAsync(itemId);
          continue;
        }

        // Check if it's a task
        const task = archivedTasks?.find((t: any) => t.id === itemId);
        if (task) {
          await unarchiveTaskMutation.mutateAsync(itemId);
          continue;
        }
      }

      setSelectedItems(new Set());
      toast({
        title: "복원 완료",
        description: `${selectedItems.size}개 항목이 성공적으로 복원되었습니다.`,
      });
    } catch (error) {
      console.error('Error restoring items:', error);
      toast({
        title: "복원 실패",
        description: "항목 복원 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Merge all archived items into projects structure for hierarchical display
  const mergedArchivedData = () => {
    const projects = archivedProjects || [];
    const goals = archivedGoals || [];
    const tasks = archivedTasks || [];

    // Add orphaned goals and tasks to projects
    return projects.map((project: any) => ({
      ...project,
      goals: [
        ...(project.goals || []),
        ...goals.filter((goal: any) => goal.projectId === project.id)
      ].map((goal: any) => ({
        ...goal,
        tasks: [
          ...(goal.tasks || []),
          ...tasks.filter((task: any) => task.goalId === goal.id)
        ]
      }))
    }));
  };

  // Calculate total archived items count
  const totalArchivedCount = (archivedProjects?.length || 0) + (archivedGoals?.length || 0) + (archivedTasks?.length || 0);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">보관함을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - matching list page exactly */}
      <header className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">보관함</h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">보관된 프로젝트, 목표, 작업을 관리합니다</p>
          </div>
          <div className="flex items-center space-x-4">
            {selectedItems.size > 0 && (
              <Button
                onClick={restoreSelectedItems}
                disabled={unarchiveProjectMutation.isPending || unarchiveGoalMutation.isPending || unarchiveTaskMutation.isPending}
                data-testid="button-restore-selected"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                선택 항목 복원
              </Button>
            )}
            <Button 
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setLocation('/workspace/app/list')}
              data-testid="button-list-page"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              리스트로 돌아가기
            </Button>
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
          <div className="col-span-1">우선순위</div>
        </div>
      </div>

      {/* Content */}
      <Card className="rounded-t-none">
        <CardContent className="p-0">
          {totalArchivedCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Circle className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">보관된 항목이 없습니다</h3>
              <p className="text-muted-foreground">
                프로젝트, 목표, 작업을 보관하면 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Archived Projects */}
              {mergedArchivedData().map((project: any) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div className="p-3 hover:bg-muted/50 transition-colors">
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
                        <span className="font-medium" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {project.code}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unarchiveProjectMutation.mutate(project.id)}
                          disabled={unarchiveProjectMutation.isPending}
                          className="ml-2"
                          data-testid={`button-restore-project-${project.id}`}
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          복원
                        </Button>
                      </div>
                      <div className="col-span-1">
                        <span className={getDDayColorClass(project.deadline)}>
                          {formatDeadline(project.deadline)}
                        </span>
                      </div>
                      <div className="col-span-1">
                        {project.owners && project.owners.length > 0 ? (
                          <div className="flex -space-x-1">
                            {project.owners.slice(0, 2).map((owner: SafeUser, index: number) => (
                              <Avatar key={owner.id} className="h-6 w-6 border border-background">
                                <AvatarFallback className="text-xs">
                                  {owner.initials}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {project.owners.length > 2 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{project.owners.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">담당자 없음</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        {project.labels && project.labels.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {project.labels.slice(0, 2).map((label: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                            {project.labels.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{project.labels.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <Badge variant={getStatusBadgeVariant(project.status || '진행전')}>
                          {project.status || '진행전'}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Progress value={project.progressPercentage || 0} className="flex-1" />
                          <span className="text-sm text-muted-foreground w-10">
                            {project.progressPercentage || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <span className="text-sm text-muted-foreground">중간</span>
                      </div>
                    </div>
                  </div>

                  {/* Goals */}
                  {expandedProjects.has(project.id) && project.goals && project.goals.length > 0 && (
                    <div className="bg-muted/20">
                      {project.goals.map((goal: any) => (
                        <div key={goal.id}>
                          {/* Goal Row */}
                          <div className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-4 flex items-center gap-2 pl-8">
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
                                <span className="font-medium" data-testid={`text-goal-title-${goal.id}`}>
                                  {goal.title}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => unarchiveGoalMutation.mutate(goal.id)}
                                  disabled={unarchiveGoalMutation.isPending}
                                  className="ml-2"
                                  data-testid={`button-restore-goal-${goal.id}`}
                                >
                                  <Undo2 className="h-4 w-4 mr-1" />
                                  복원
                                </Button>
                              </div>
                              <div className="col-span-1">
                                <span className={getDDayColorClass(goal.deadline)}>
                                  {formatDeadline(goal.deadline)}
                                </span>
                              </div>
                              <div className="col-span-1">
                                {goal.assignees && goal.assignees.length > 0 ? (
                                  <div className="flex -space-x-1">
                                    {goal.assignees.slice(0, 2).map((assignee: SafeUser, index: number) => (
                                      <Avatar key={assignee.id} className="h-6 w-6 border border-background">
                                        <AvatarFallback className="text-xs">
                                          {assignee.initials}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {goal.assignees.length > 2 && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        +{goal.assignees.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">담당자 없음</span>
                                )}
                              </div>
                              <div className="col-span-2">
                                {goal.labels && goal.labels.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {goal.labels.slice(0, 2).map((label: string, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {label}
                                      </Badge>
                                    ))}
                                    {goal.labels.length > 2 && (
                                      <span className="text-xs text-muted-foreground">
                                        +{goal.labels.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </div>
                              <div className="col-span-1">
                                <Badge variant={getStatusBadgeVariant(goal.status || '진행전')}>
                                  {goal.status || '진행전'}
                                </Badge>
                              </div>
                              <div className="col-span-2">
                                <div className="flex items-center gap-2">
                                  <Progress value={goal.progressPercentage || 0} className="flex-1" />
                                  <span className="text-sm text-muted-foreground w-10">
                                    {goal.progressPercentage || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-1">
                                <span className="text-sm text-muted-foreground">중간</span>
                              </div>
                            </div>
                          </div>

                          {/* Tasks */}
                          {expandedGoals.has(goal.id) && goal.tasks && goal.tasks.length > 0 && (
                            <div className="bg-muted/30">
                              {goal.tasks.map((task: any) => (
                                <div key={task.id} className="p-3 hover:bg-muted/50 transition-colors">
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 flex items-center gap-2 pl-16">
                                      <Checkbox
                                        checked={selectedItems.has(task.id)}
                                        onCheckedChange={() => toggleItemSelection(task.id)}
                                        data-testid={`checkbox-task-${task.id}`}
                                      />
                                      <Circle className="w-4 h-4 text-orange-600" />
                                      <span className="font-medium" data-testid={`text-task-title-${task.id}`}>
                                        {task.title}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => unarchiveTaskMutation.mutate(task.id)}
                                        disabled={unarchiveTaskMutation.isPending}
                                        className="ml-2"
                                        data-testid={`button-restore-task-${task.id}`}
                                      >
                                        <Undo2 className="h-4 w-4 mr-1" />
                                        복원
                                      </Button>
                                    </div>
                                    <div className="col-span-1">
                                      <span className={getDDayColorClass(task.deadline)}>
                                        {formatDeadline(task.deadline)}
                                      </span>
                                    </div>
                                    <div className="col-span-1">
                                      {task.assignees && task.assignees.length > 0 ? (
                                        <div className="flex -space-x-1">
                                          {task.assignees.slice(0, 2).map((assignee: SafeUser, index: number) => (
                                            <Avatar key={assignee.id} className="h-6 w-6 border border-background">
                                              <AvatarFallback className="text-xs">
                                                {assignee.initials}
                                              </AvatarFallback>
                                            </Avatar>
                                          ))}
                                          {task.assignees.length > 2 && (
                                            <span className="text-xs text-muted-foreground ml-1">
                                              +{task.assignees.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">담당자 없음</span>
                                      )}
                                    </div>
                                    <div className="col-span-2">
                                      {task.labels && task.labels.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {task.labels.slice(0, 2).map((label: string, index: number) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                              {label}
                                            </Badge>
                                          ))}
                                          {task.labels.length > 2 && (
                                            <span className="text-xs text-muted-foreground">
                                              +{task.labels.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                      )}
                                    </div>
                                    <div className="col-span-1">
                                      <Badge variant={getStatusBadgeVariant(task.status)}>
                                        {task.status}
                                      </Badge>
                                    </div>
                                    <div className="col-span-2">
                                      <div className="flex items-center gap-2">
                                        <Progress value={task.progress || 0} className="flex-1" />
                                        <span className="text-sm text-muted-foreground w-10">
                                          {task.progress || 0}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      {task.priority && (
                                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                                          {mapPriorityToLabel(task.priority)}
                                        </Badge>
                                      )}
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

              {/* Orphaned Goals (goals without parent projects) */}
              {archivedGoals?.filter((goal: any) => !archivedProjects?.some((project: any) => project.id === goal.projectId)).map((goal: any) => (
                <div key={goal.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4 flex items-center gap-2">
                      <Checkbox
                        checked={selectedItems.has(goal.id)}
                        onCheckedChange={() => toggleItemSelection(goal.id)}
                        data-testid={`checkbox-goal-${goal.id}`}
                      />
                      <Target className="w-4 h-4 text-green-600" />
                      <span className="font-medium" data-testid={`text-goal-title-${goal.id}`}>
                        {goal.title}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveGoalMutation.mutate(goal.id)}
                        disabled={unarchiveGoalMutation.isPending}
                        className="ml-2"
                        data-testid={`button-restore-goal-${goal.id}`}
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        복원
                      </Button>
                    </div>
                    <div className="col-span-1">
                      <span className={getDDayColorClass(goal.deadline)}>
                        {formatDeadline(goal.deadline)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {goal.assignees && goal.assignees.length > 0 ? (
                        <div className="flex -space-x-1">
                          {goal.assignees.slice(0, 2).map((assignee: SafeUser, index: number) => (
                            <Avatar key={assignee.id} className="h-6 w-6 border border-background">
                              <AvatarFallback className="text-xs">
                                {assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {goal.assignees.length > 2 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{goal.assignees.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">담당자 없음</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {goal.labels && goal.labels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {goal.labels.slice(0, 2).map((label: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                          {goal.labels.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{goal.labels.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <Badge variant={getStatusBadgeVariant(goal.status || '진행전')}>
                        {goal.status || '진행전'}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Progress value={goal.progressPercentage || 0} className="flex-1" />
                        <span className="text-sm text-muted-foreground w-10">
                          {goal.progressPercentage || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm text-muted-foreground">중간</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Orphaned Tasks (tasks without parent goals) */}
              {archivedTasks?.filter((task: any) => !archivedGoals?.some((goal: any) => goal.id === task.goalId)).map((task: any) => (
                <div key={task.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4 flex items-center gap-2">
                      <Checkbox
                        checked={selectedItems.has(task.id)}
                        onCheckedChange={() => toggleItemSelection(task.id)}
                        data-testid={`checkbox-task-${task.id}`}
                      />
                      <Circle className="w-4 h-4 text-orange-600" />
                      <span className="font-medium" data-testid={`text-task-title-${task.id}`}>
                        {task.title}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveTaskMutation.mutate(task.id)}
                        disabled={unarchiveTaskMutation.isPending}
                        className="ml-2"
                        data-testid={`button-restore-task-${task.id}`}
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        복원
                      </Button>
                    </div>
                    <div className="col-span-1">
                      <span className={getDDayColorClass(task.deadline)}>
                        {formatDeadline(task.deadline)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 2).map((assignee: SafeUser, index: number) => (
                            <Avatar key={assignee.id} className="h-6 w-6 border border-background">
                              <AvatarFallback className="text-xs">
                                {assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignees.length > 2 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{task.assignees.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">담당자 없음</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {task.labels && task.labels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.labels.slice(0, 2).map((label: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                          {task.labels.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{task.labels.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Progress value={task.progress || 0} className="flex-1" />
                        <span className="text-sm text-muted-foreground w-10">
                          {task.progress || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      {task.priority && (
                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                          {mapPriorityToLabel(task.priority)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      </main>
    </div>
  );
}