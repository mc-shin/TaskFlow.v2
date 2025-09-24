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

  // 이미지와 정확히 같은 구조: 3개 상태 컬럼 (진행 전, 진행 중, 완료)
  const kanbanData = useMemo(() => {
    if (!projects) return { 
      projects: [] as ProjectWithDetails[],
      tasksByStatus: { "진행 전": [], "진행 중": [], "완료": [] }
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

    // 작업들을 3개 상태로만 분류 (지연은 제외)
    const tasksByStatus = {
      "진행 전": [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>,
      "진행 중": [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>,
      "완료": [] as Array<SafeTaskWithAssignees & { projectId: string, goalId?: string | null, projectCode: string, goalTitle?: string }>
    };

    allTasks.forEach(task => {
      let taskStatus = task.status === "진행전" ? "진행 전" : 
                      task.status === "진행중" ? "진행 중" : 
                      task.status === "완료" ? "완료" : "진행 전";

      // 지연된 작업도 원래 상태에 따라 분류 (별도 지연 컬럼 없음)
      tasksByStatus[taskStatus as keyof typeof tasksByStatus].push(task);
    });

    return {
      projects: projects as ProjectWithDetails[],
      tasksByStatus
    };
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행 전": return "bg-gray-50 border-gray-200";
      case "진행 중": return "bg-orange-50 border-orange-200";
      case "완료": return "bg-blue-50 border-blue-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusHeaderColor = (status: string) => {
    switch (status) {
      case "진행 전": return "bg-white border border-gray-200 text-gray-700";
      case "진행 중": return "bg-white border border-orange-200 text-orange-700";
      case "완료": return "bg-white border border-blue-200 text-blue-700";
      default: return "bg-white border border-gray-200 text-gray-700";
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
          <div className="flex flex-col h-full space-y-6">
            {/* 상태 헤더 - 3개 컬럼 */}
            <div className="grid grid-cols-3 gap-4">
              {["진행 전", "진행 중", "완료"].map((status) => {
                const totalTasks = kanbanData.tasksByStatus[status as keyof typeof kanbanData.tasksByStatus].length;
                
                return (
                  <div key={status} className={`p-4 rounded-lg ${getStatusHeaderColor(status)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{status}</span>
                      <span className="font-semibold">{totalTasks}</span>
                      {status === "완료" && <ChevronDown className="w-4 h-4 ml-2" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 프로젝트/목표 섹션 */}
            <div className="space-y-2">
              {kanbanData.projects?.map((project) => (
                <div key={project.id} className="space-y-2">
                  {/* 프로젝트 행 */}
                  <div 
                    className="flex items-center gap-2 p-3 w-full bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleProject(project.id)}
                    data-testid={`project-${project.id}`}
                  >
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      <span className="text-sm font-medium">
                        {project.code} {project.name}
                      </span>
                    </div>
                  </div>
                  
                  {/* 목표 행들 (확장된 경우만) */}
                  {expandedProjects.has(project.id) && project.goals?.map((goal) => (
                    <div 
                      key={goal.id} 
                      className="flex items-center gap-2 p-3 w-full bg-white border border-gray-200 rounded-lg ml-6"
                      data-testid={`goal-${goal.id}`}
                    >
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">M</span>
                        </div>
                        <span className="text-sm font-medium">
                          {goal.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 작업 컬럼들 - 3개 컬럼 */}
            <div className="grid grid-cols-3 gap-4 flex-1">
              {["진행 전", "진행 중", "완료"].map((status) => {
                const tasks = kanbanData.tasksByStatus[status as keyof typeof kanbanData.tasksByStatus];
                
                return (
                  <div key={status} className="flex flex-col">
                    <div className={`flex-1 p-4 rounded-lg min-h-96 overflow-y-auto ${getStatusColor(status)}`}>
                      <div className="space-y-3">
                        {tasks.map((task, taskIndex) => (
                          <Card 
                            key={`${status}-task-${task.id}-${taskIndex}`}
                            className="hover:shadow-sm transition-shadow duration-200 cursor-pointer bg-white border border-gray-200"
                            data-testid={`card-task-${task.id}`}
                          >
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm mb-3 text-gray-900 line-clamp-2">{task.title}</h4>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                                    {task.progress || 0}
                                  </div>
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs bg-blue-500 text-white font-medium">
                                      M
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span>☑</span>
                                  <span>{task.projectCode}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {tasks.length === 0 && (
                          <div className="flex items-center justify-center h-32 text-gray-400">
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

            {(!kanbanData.projects || kanbanData.projects.length === 0) && (
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