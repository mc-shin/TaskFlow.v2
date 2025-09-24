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
import type { ProjectWithDetails, SafeTaskWithAssignees, SafeUser } from "@shared/schema";

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

  // 프로젝트별로 작업을 상태별로 그룹핑 (가로 행 구조)
  const projectKanbanData = useMemo(() => {
    if (!projects) return [];

    return (projects as ProjectWithDetails[]).map((project: ProjectWithDetails) => {
      // 프로젝트의 모든 작업을 수집
      const allTasks: SafeTaskWithAssignees[] = [];
      
      // 목표의 작업들
      project.goals?.forEach((goal) => {
        if (goal.tasks) {
          allTasks.push(...goal.tasks);
        }
      });

      // 직접 프로젝트 작업들
      if (project.tasks) {
        allTasks.push(...project.tasks);
      }

      // 작업들을 상태별로 분류
      const tasksByStatus = {
        "진행전": [] as SafeTaskWithAssignees[],
        "진행중": [] as SafeTaskWithAssignees[],
        "완료": [] as SafeTaskWithAssignees[],
        "지연": [] as SafeTaskWithAssignees[]
      };

      allTasks.forEach(task => {
        let taskStatus = task.status === "진행전" ? "진행전" : 
                        task.status === "진행중" ? "진행중" : 
                        task.status === "완료" ? "완료" : "진행전";

        // 지연 상태 확인 (마감일이 지났고 완료되지 않은 작업)
        if (task.status !== "완료" && task.deadline) {
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
        project,
        tasksByStatus
      };
    });
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행전": return "border-blue-200 bg-blue-50";
      case "진행중": return "border-yellow-200 bg-yellow-50";
      case "완료": return "border-green-200 bg-green-50";
      case "지연": return "border-red-200 bg-red-50";
      default: return "border-gray-200 bg-gray-50";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-blue-100 text-blue-800";
      case "진행중": return "bg-yellow-100 text-yellow-800";
      case "완료": return "bg-green-100 text-green-800";
      case "지연": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
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
            size="sm"
            onClick={() => setLocation('/archive')}
            data-testid="button-archive"
          >
            <Archive className="w-4 h-4 mr-2" />
            보관함
          </Button>
          <Button 
            variant="default"
            size="sm"
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
          <div className="space-y-6">
            {/* 상태별 헤더 */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="flex items-center justify-center">
                <h3 className="font-semibold text-sm text-muted-foreground">프로젝트</h3>
              </div>
              {["진행전", "진행중", "완료", "지연"].map(status => (
                <div key={status} className={`flex items-center justify-center p-3 rounded-lg border ${getStatusColor(status)}`}>
                  <Badge className={`text-xs ${getStatusBadgeColor(status)}`}>
                    {status}
                  </Badge>
                </div>
              ))}
            </div>

            {/* 프로젝트별 칸반 행 */}
            {projectKanbanData.map(({ project, tasksByStatus }) => (
              <Card key={project.id} className="border rounded-lg">
                <CardContent className="p-4">
                  <div className="grid grid-cols-5 gap-4 min-h-32">
                    {/* 프로젝트 정보 */}
                    <div className="flex flex-col justify-center p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">{project.code}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.name}
                      </p>
                    </div>

                    {/* 상태별 작업 컬럼들 */}
                    {["진행전", "진행중", "완료", "지연"].map((status) => (
                      <div key={`${project.id}-${status}`} className={`p-3 rounded-lg border-2 border-dashed ${getStatusColor(status)} min-h-24`}>
                        <div className="space-y-2">
                          {tasksByStatus[status as keyof typeof tasksByStatus].map((task, taskIndex) => (
                            <Card 
                              key={`project-${project.id}-${status}-task-${task.id}-${taskIndex}`}
                              className="hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white/80 backdrop-blur-sm"
                              data-testid={`card-task-${task.id}`}
                            >
                              <CardContent className="p-2">
                                <h4 className="font-medium text-xs mb-1 line-clamp-2">{task.title}</h4>
                                
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span className={getDDayColorClass(task.deadline)}>
                                    {formatDeadline(task.deadline)}
                                  </span>
                                  <span>{task.progress || 0}%</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1">
                                    {task.assigneeIds?.slice(0, 2).map((assigneeId: string) => {
                                      const user = getUserById(assigneeId);
                                      return user ? (
                                        <Avatar key={user.id} className="w-4 h-4" data-testid={`avatar-${user.id}`}>
                                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                            {user.initials}
                                          </AvatarFallback>
                                        </Avatar>
                                      ) : null;
                                    })}
                                    {(task.assigneeIds?.length || 0) > 2 && (
                                      <span className="text-xs text-muted-foreground">
                                        +{(task.assigneeIds?.length || 0) - 2}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <Progress value={task.progress || 0} className="h-1 w-8" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {tasksByStatus[status as keyof typeof tasksByStatus].length === 0 && (
                            <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                              작업 없음
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {projectKanbanData.length === 0 && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>표시할 프로젝트가 없습니다.</p>
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