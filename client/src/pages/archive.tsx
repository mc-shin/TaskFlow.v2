import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, ArrowLeft, X, Eye, Undo2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { parse } from "date-fns";
import { mapPriorityToLabel, getPriorityBadgeVariant } from "@/lib/priority-utils";

export default function Archive() {
  // Fetch archived data from new database-based endpoints
  const { data: archivedProjects, isLoading: loadingProjects } = useQuery({
    queryKey: ["/api/archive/projects"],
  });

  const { data: archivedGoals, isLoading: loadingGoals } = useQuery({
    queryKey: ["/api/archive/goals"],
  });

  const { data: archivedTasks, isLoading: loadingTasks } = useQuery({
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

  // State for checkbox selections
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // State for item detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'project' | 'goal' | 'task'>('task');

  // Loading state combining all queries
  const isLoading = loadingProjects || loadingGoals || loadingTasks;

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

  // Helper functions
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

  // Function to restore selected items
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
      // Restore each selected item based on its type
      for (const itemId of selectedItems) {
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

  // Function to handle checkbox change
  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
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
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/workspace/app/list")}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로
          </Button>
          <h1 className="text-3xl font-bold" data-testid="text-archive-title">보관함</h1>
          <Badge variant="secondary" data-testid="text-archive-count">
            {totalArchivedCount}개
          </Badge>
        </div>

        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedItems.size}개 선택됨
            </span>
            <Button
              onClick={restoreSelectedItems}
              disabled={unarchiveProjectMutation.isPending || unarchiveGoalMutation.isPending || unarchiveTaskMutation.isPending}
              data-testid="button-restore-selected"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              선택 항목 복원
            </Button>
          </div>
        )}
      </div>

      {/* Archive Content */}
      {totalArchivedCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Circle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">보관된 항목이 없습니다</h3>
            <p className="text-muted-foreground text-center">
              프로젝트, 목표, 작업을 보관하면 이곳에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Archived Projects */}
          {archivedProjects && archivedProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                보관된 프로젝트 ({archivedProjects.length}개)
              </h2>
              <div className="space-y-2">
                {archivedProjects.map((project: ProjectWithDetails) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedItems.has(project.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(project.id, !!checked)}
                          data-testid={`checkbox-project-${project.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium" data-testid={`text-project-title-${project.id}`}>
                              {project.name}
                            </h3>
                            <Badge variant={getStatusBadgeVariant(project.status || '진행전')}>
                              {project.status || '진행전'}
                            </Badge>
                            {project.labels && project.labels.map((label, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>마감일: {formatDeadline(project.deadline)}</span>
                            <span>진행도: {project.progressPercentage || 0}%</span>
                            <span>총 작업: {project.totalTasks || 0}개</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openItemDetail(project, 'project')}
                            data-testid={`button-view-project-${project.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            보기
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unarchiveProjectMutation.mutate(project.id)}
                            disabled={unarchiveProjectMutation.isPending}
                            data-testid={`button-restore-project-${project.id}`}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            복원
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Archived Goals */}
          {archivedGoals && archivedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" />
                보관된 목표 ({archivedGoals.length}개)
              </h2>
              <div className="space-y-2">
                {archivedGoals.map((goal: GoalWithTasks) => (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedItems.has(goal.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(goal.id, !!checked)}
                          data-testid={`checkbox-goal-${goal.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium" data-testid={`text-goal-title-${goal.id}`}>
                              {goal.title}
                            </h3>
                            <Badge variant={getStatusBadgeVariant(goal.status || '진행전')}>
                              {goal.status || '진행전'}
                            </Badge>
                            {goal.labels && goal.labels.map((label, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>마감일: {formatDeadline(goal.deadline)}</span>
                            <span>진행도: {goal.progressPercentage || 0}%</span>
                            <span>총 작업: {goal.totalTasks || 0}개</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openItemDetail(goal, 'goal')}
                            data-testid={`button-view-goal-${goal.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            보기
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unarchiveGoalMutation.mutate(goal.id)}
                            disabled={unarchiveGoalMutation.isPending}
                            data-testid={`button-restore-goal-${goal.id}`}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            복원
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Archived Tasks */}
          {archivedTasks && archivedTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Circle className="h-5 w-5" />
                보관된 작업 ({archivedTasks.length}개)
              </h2>
              <div className="space-y-2">
                {archivedTasks.map((task: SafeTaskWithAssignees) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedItems.has(task.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(task.id, !!checked)}
                          data-testid={`checkbox-task-${task.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                              {task.title}
                            </h3>
                            <Badge variant={getStatusBadgeVariant(task.status)}>
                              {task.status}
                            </Badge>
                            {task.priority && (
                              <Badge variant={getPriorityBadgeVariant(task.priority)}>
                                {mapPriorityToLabel(task.priority)}
                              </Badge>
                            )}
                            {task.labels && task.labels.map((label, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>마감일: {formatDeadline(task.deadline)}</span>
                            <span>진행도: {task.progress || 0}%</span>
                            {task.assignees && task.assignees.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span>담당자:</span>
                                <div className="flex -space-x-1">
                                  {task.assignees.slice(0, 3).map((assignee) => (
                                    <Avatar key={assignee.id} className="h-5 w-5 border border-background">
                                      <AvatarFallback className="text-xs">
                                        {assignee.initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {task.assignees.length > 3 && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      +{task.assignees.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openItemDetail(task, 'task')}
                            data-testid={`button-view-task-${task.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            보기
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unarchiveTaskMutation.mutate(task.id)}
                            disabled={unarchiveTaskMutation.isPending}
                            data-testid={`button-restore-task-${task.id}`}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            복원
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Item Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItemType === 'project' ? '프로젝트' : 
               selectedItemType === 'goal' ? '목표' : '작업'} 상세
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {selectedItemType === 'project' ? selectedItem.name : selectedItem.title}
                </h3>
                {selectedItem.description && (
                  <p className="text-muted-foreground">{selectedItem.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">상태:</span>
                  <Badge variant={getStatusBadgeVariant(selectedItem.status || '진행전')} className="ml-2">
                    {selectedItem.status || '진행전'}
                  </Badge>
                </div>
                {selectedItemType === 'task' && selectedItem.priority && (
                  <div>
                    <span className="font-medium">우선순위:</span>
                    <Badge variant={getPriorityBadgeVariant(selectedItem.priority)} className="ml-2">
                      {mapPriorityToLabel(selectedItem.priority)}
                    </Badge>
                  </div>
                )}
                <div>
                  <span className="font-medium">마감일:</span>
                  <span className="ml-2">{formatDeadline(selectedItem.deadline)}</span>
                </div>
                <div>
                  <span className="font-medium">진행도:</span>
                  <span className="ml-2">
                    {selectedItemType === 'project' ? selectedItem.progressPercentage || 0 :
                     selectedItemType === 'goal' ? selectedItem.progressPercentage || 0 :
                     selectedItem.progress || 0}%
                  </span>
                </div>
                {(selectedItem.totalTasks !== undefined) && (
                  <div>
                    <span className="font-medium">총 작업:</span>
                    <span className="ml-2">{selectedItem.totalTasks}개</span>
                  </div>
                )}
              </div>

              {selectedItem.labels && selectedItem.labels.length > 0 && (
                <div>
                  <span className="font-medium text-sm">라벨:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedItem.labels.map((label: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.assignees && selectedItem.assignees.length > 0 && (
                <div>
                  <span className="font-medium text-sm">담당자:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedItem.assignees.map((assignee: SafeUser) => (
                      <div key={assignee.id} className="flex items-center gap-1 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  닫기
                </Button>
                <Button
                  onClick={() => {
                    if (selectedItemType === 'project') {
                      unarchiveProjectMutation.mutate(selectedItem.id);
                    } else if (selectedItemType === 'goal') {
                      unarchiveGoalMutation.mutate(selectedItem.id);
                    } else {
                      unarchiveTaskMutation.mutate(selectedItem.id);
                    }
                    setDetailModalOpen(false);
                  }}
                  disabled={unarchiveProjectMutation.isPending || unarchiveGoalMutation.isPending || unarchiveTaskMutation.isPending}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  복원하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}