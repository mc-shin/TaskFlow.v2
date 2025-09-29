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

  const [_, setLocation] = useLocation();

  // Loading state combining all queries
  const isLoading = loadingProjects || loadingGoals || loadingTasks;

  // Helper functions

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

  // Merge all archived items into a flat structure for table rendering
  const mergedArchivedData = () => {
    const projects = archivedProjects || [];
    const goals = archivedGoals || [];
    const tasks = archivedTasks || [];

    // Create a flat array with all archived items
    const result = [];

    // Add all archived projects
    projects.forEach((project: any) => {
      result.push({
        ...project,
        type: 'project'
      });
    });

    // Add all archived goals
    goals.forEach((goal: any) => {
      result.push({
        ...goal,
        type: 'goal'
      });
    });

    // Add all archived tasks
    tasks.forEach((task: any) => {
      result.push({
        ...task,
        type: 'task'
      });
    });

    return result;
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
    <>
      {/* Header - Same as list page */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">보관함</h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">{totalArchivedCount}개 항목이 보관되어 있습니다</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost"
            onClick={() => setLocation('/workspace/app/list')}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            리스트로 돌아가기
          </Button>
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
              {/* Render all archived items */}
              {mergedArchivedData().map((item: any) => (
                <div key={item.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Name column */}
                    <div className="col-span-4 flex items-center gap-2">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        data-testid={`checkbox-${item.type}-${item.id}`}
                      />
                      {item.type === 'project' && (
                        <>
                          <FolderOpen className="w-4 h-4 text-blue-600" />
                          <span className="font-medium" data-testid={`text-project-name-${item.id}`}>
                            {item.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.code}
                          </Badge>
                        </>
                      )}
                      {item.type === 'goal' && (
                        <>
                          <Target className="w-4 h-4 text-green-600" />
                          <span className="font-medium" data-testid={`text-goal-title-${item.id}`}>
                            {item.title || item.name}
                          </span>
                        </>
                      )}
                      {item.type === 'task' && (
                        <>
                          <Circle className="w-4 h-4 text-orange-600" />
                          <span className="font-medium" data-testid={`text-task-title-${item.id}`}>
                            {item.title || item.name}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Deadline column */}
                    <div className="col-span-1">
                      <span className={getDDayColorClass(item.deadline)}>
                        {formatDeadline(item.deadline)}
                      </span>
                    </div>
                    
                    {/* Assignee column */}
                    <div className="col-span-1">
                      {(item.owners || item.assignees) && (item.owners || item.assignees).length > 0 ? (
                        <div className="flex -space-x-1">
                          {(item.owners || item.assignees).slice(0, 2).map((assignee: SafeUser, index: number) => (
                            <Avatar key={assignee.id} className="h-6 w-6 border border-background">
                              <AvatarFallback className="text-xs">
                                {assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {(item.owners || item.assignees).length > 2 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{(item.owners || item.assignees).length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">담당자 없음</span>
                      )}
                    </div>
                    
                    {/* Labels column */}
                    <div className="col-span-2">
                      {item.labels && item.labels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.labels.slice(0, 2).map((label: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                          {item.labels.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{item.labels.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                    
                    {/* Status column */}
                    <div className="col-span-1">
                      <Badge variant={getStatusBadgeVariant(item.status || '진행전')}>
                        {item.status || '진행전'}
                      </Badge>
                    </div>
                    
                    {/* Progress column */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Progress value={item.progressPercentage || item.progress || 0} className="flex-1" />
                        <span className="text-sm text-muted-foreground w-10">
                          {item.progressPercentage || item.progress || 0}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Priority column */}
                    <div className="col-span-1">
                      {item.priority ? (
                        <Badge variant={getPriorityBadgeVariant(item.priority)}>
                          {mapPriorityToLabel(item.priority)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">중간</span>
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
    </>
  );
}