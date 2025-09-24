import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, FolderOpen, Archive, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { parse } from "date-fns";
import type { ProjectWithDetails, SafeTaskWithAssignees, GoalWithTasks, SafeUser } from "@shared/schema";

export default function Kanban() {
  const [_, setLocation] = useLocation();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

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

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '-';
    
    const deadlineDate = parse(deadline, 'yyyy-MM-dd', new Date());
    
    if (isNaN(deadlineDate.getTime())) {
      return '-';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let dDayPart = '';
    if (diffDays < 0) {
      dDayPart = `D+${Math.abs(diffDays)}`;
    } else if (diffDays === 0) {
      dDayPart = 'D-Day';
    } else {
      dDayPart = `D-${diffDays}`;
    }
    
    const month = deadlineDate.getMonth() + 1;
    const day = deadlineDate.getDate();
    
    return `${month}/${day} ${dDayPart}`;
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
      return "text-red-600";
    } else if (diffDays === 0) {
      return "text-orange-600";
    } else {
      return "text-blue-600";
    }
  };

  // 사용자 조회 성능 최적화를 위한 Map 캐시
  const usersMap = useMemo(() => {
    const map = new Map<string, SafeUser>();
    (users as SafeUser[])?.forEach(user => {
      map.set(user.id, user);
    });
    return map;
  }, [users]);

  const getUserById = (userId: string): SafeUser | undefined => {
    return usersMap.get(userId);
  };

  // 새로운 구조: 프로젝트와 목표는 한 줄로, 작업들만 상태별 컬럼에 배치
  const kanbanData = useMemo(() => {
    if (!projects) return { 
      projects: [] as ProjectWithDetails[],
      tasksByStatus: { "진행전": [], "진행중": [], "완료": [], "지연": [] }
    };

    const allTasks = [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>;
    
    // 모든 작업을 수집하면서 프로젝트/목표 정보 포함
    (projects as ProjectWithDetails[]).forEach(project => {
      // 프로젝트 직접 작업들
      if (project.tasks) {
        project.tasks.forEach(task => {
          allTasks.push({
            ...task,
            projectId: project.id,
            projectCode: project.code
          });
        });
      }

      // 목표별 작업들
      project.goals?.forEach(goal => {
        if (goal.tasks) {
          goal.tasks.forEach(task => {
            allTasks.push({
              ...task,
              projectId: project.id,
              goalId: goal.id,
              projectCode: project.code,
              goalTitle: goal.title
            });
          });
        }
      });
    });

    // 작업들을 상태별로 분류
    const tasksByStatus = {
      "진행전": [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>,
      "진행중": [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>,
      "완료": [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>,
      "지연": [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>
    };

    allTasks.forEach(task => {
      let taskStatus = task.status === "진행전" ? "진행전" : 
                      task.status === "진행중" ? "진행중" : 
                      task.status === "완료" ? "완료" : 
                      task.status === "지연" ? "지연" : "진행전";

      // 지연 상태 확인 (기존에 지연 상태가 아닌 경우만)
      if (task.status !== "완료" && task.status !== "지연" && task.deadline) {
        const deadlineDate = parse(task.deadline, 'yyyy-MM-dd', new Date());
        if (!isNaN(deadlineDate.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          deadlineDate.setHours(0, 0, 0, 0);
          
          if (deadlineDate.getTime() < today.getTime()) {
            taskStatus = "지연";
          }
        }
      }

      tasksByStatus[taskStatus as keyof typeof tasksByStatus].push(task);
    });

    return {
      projects: projects as ProjectWithDetails[],
      tasksByStatus
    };
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-sidebar-accent/20 border-sidebar-border";
      case "진행중": return "bg-sidebar-accent/20 border-sidebar-border";
      case "완료": return "bg-sidebar-primary/20 border-sidebar-border";
      case "지연": return "bg-destructive/20 border-border";
      default: return "bg-sidebar/20 border-sidebar-border";
    }
  };

  const getStatusHeaderColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground";
      case "진행중": return "bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground";
      case "완료": return "bg-sidebar-primary border-sidebar-border text-sidebar-primary-foreground";
      case "지연": return "bg-destructive border-border text-destructive-foreground";
      default: return "bg-sidebar border-sidebar-border text-sidebar-foreground";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-sidebar-accent text-sidebar-accent-foreground";
      case "진행중": return "bg-sidebar-accent text-sidebar-accent-foreground";
      case "완료": return "bg-sidebar-primary text-sidebar-primary-foreground";
      case "지연": return "bg-destructive text-destructive-foreground";
      default: return "bg-sidebar-accent text-sidebar-accent-foreground";
    }
  };

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            칸반
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            프로젝트와 작업을 상태별로 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setLocation('/archive')}
            data-testid="button-archive"
          >
            <Archive className="w-4 h-4 mr-2" />
            보관함
          </Button>
          <Button 
            onClick={() => setLocation('/projects/new')}
            data-testid="button-new-project"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse h-48">
                <CardContent className="p-6">
                  <div className="h-full bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* 상태 헤더 */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {["진행전", "진행중", "완료", "지연"].map((status) => {
                const totalTasks = kanbanData.tasksByStatus[status as keyof typeof kanbanData.tasksByStatus].length;
                
                return (
                  <div key={status} className={`p-4 rounded-lg ${getStatusHeaderColor(status)}`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">{status}</h2>
                      <Badge variant="secondary" className={getStatusBadgeColor(status)}>
                        {totalTasks}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 프로젝트와 목표 섹션 */}
            <div className="space-y-4 mb-6">
              {kanbanData.projects.map((project) => (
                <div key={project.id} className="space-y-2">
                  {/* 프로젝트 행 */}
                  <div 
                    className="flex items-center gap-2 p-3 w-full bg-sidebar/10 rounded-lg border border-sidebar-border cursor-pointer hover:bg-sidebar/20 transition-colors"
                    onClick={() => toggleProject(project.id)}
                    data-testid={`project-${project.id}`}
                  >
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="w-4 h-4 text-sidebar-primary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-sidebar-primary" />
                    )}
                    <FolderOpen className="w-4 h-4 text-sidebar-primary" />
                    <span className="text-sm font-semibold text-sidebar-foreground flex-1">
                      프로젝트
                    </span>
                    <span className="text-sm text-sidebar-foreground">
                      {project.code}
                    </span>
                  </div>
                  
                  {/* 목표 행들 (확장된 경우만) */}
                  {expandedProjects.has(project.id) && project.goals?.map((goal) => (
                    <div 
                      key={goal.id} 
                      className="flex items-center gap-2 p-3 w-full bg-sidebar-accent/30 rounded-lg border border-sidebar-border ml-6"
                      data-testid={`goal-${goal.id}`}
                    >
                      <div className="w-3 h-3 rounded-full bg-sidebar-primary" />
                      <span className="text-sm font-medium text-sidebar-foreground flex-1">
                        목표
                      </span>
                      <span className="text-sm text-sidebar-foreground">
                        {goal.title}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 작업 컬럼들 */}
            <div className="grid grid-cols-4 gap-6 flex-1">
              {["진행전", "진행중", "완료", "지연"].map((status) => {
                const tasks = kanbanData.tasksByStatus[status as keyof typeof kanbanData.tasksByStatus];
                
                return (
                  <div key={status} className="flex flex-col">
                    {/* 컬럼 내용 */}
                    <div className={`flex-1 p-4 border rounded-lg min-h-96 overflow-y-auto ${getStatusColor(status)}`}>
                      <div className="space-y-3">
                        {tasks.map((task, taskIndex) => (
                          <Card 
                            key={`${status}-task-${task.id}-${taskIndex}`}
                            className="hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white border text-gray-900 dark:text-gray-100"
                            data-testid={`card-task-${task.id}`}
                          >
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm mb-2 line-clamp-2 text-gray-900 dark:text-gray-100">{task.title}</h4>
                              
                              {task.description && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                              
                              {/* 프로젝트/목표 정보 */}
                              <div className="text-xs text-muted-foreground mb-2">
                                <span>{task.projectCode}</span>
                                {task.goalTitle && (
                                  <span> • {task.goalTitle}</span>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                                <span className={getDDayColorClass(task.deadline)}>
                                  {formatDeadline(task.deadline)}
                                </span>
                                <span>{task.progress || 0}%</span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                  {task.assigneeIds?.slice(0, 3).map((assigneeId: string) => {
                                    const user = getUserById(assigneeId);
                                    return user ? (
                                      <Avatar key={user.id} className="w-5 h-5" data-testid={`avatar-${user.id}`}>
                                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                          {user.initials}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : null;
                                  })}
                                  {(task.assigneeIds?.length || 0) > 3 && (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      +{(task.assigneeIds?.length || 0) - 3}
                                    </span>
                                  )}
                                </div>
                                
                                <Progress value={task.progress || 0} className="h-2 w-16" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {tasks.length === 0 && (
                          <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <div className="text-center">
                              <div className="text-sm">작업 없음</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {kanbanData.projects.length === 0 && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>표시할 작업이 없습니다.</p>
                  <p className="text-sm">새 프로젝트를 생성하거나 작업을 추가해보세요.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}