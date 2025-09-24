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
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

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

  // 각 목표별로 작업을 분류하여 트리 구조 생성
  const kanbanData = useMemo(() => {
    if (!projects) return { projects: [] as any[] };

    // 프로젝트별로 목표와 작업을 분류
    const structuredProjects = (projects as ProjectWithDetails[]).map(project => {
      
      // 프로젝트 직접 작업들
      const projectTasks = project.tasks || [];
      const projectTasksByStatus = {
        "진행 전": [] as SafeTaskWithAssignees[],
        "진행 중": [] as SafeTaskWithAssignees[],
        "완료": [] as SafeTaskWithAssignees[]
      };

      projectTasks.forEach(task => {
        let taskStatus = task.status === "진행전" ? "진행 전" : 
                        task.status === "진행중" ? "진행 중" : 
                        task.status === "완료" ? "완료" : "진행 전";
        projectTasksByStatus[taskStatus as keyof typeof projectTasksByStatus].push(task);
      });

      // 목표별 작업들
      const goalsWithTasks = project.goals?.map(goal => {
        const goalTasks = goal.tasks || [];
        const goalTasksByStatus = {
          "진행 전": [] as SafeTaskWithAssignees[],
          "진행 중": [] as SafeTaskWithAssignees[],
          "완료": [] as SafeTaskWithAssignees[]
        };

        goalTasks.forEach(task => {
          let taskStatus = task.status === "진행전" ? "진행 전" : 
                          task.status === "진행중" ? "진행 중" : 
                          task.status === "완료" ? "완료" : "진행 전";
          goalTasksByStatus[taskStatus as keyof typeof goalTasksByStatus].push(task);
        });

        return {
          ...goal,
          tasksByStatus: goalTasksByStatus,
          totalTasks: goalTasks.length
        };
      }) || [];

      return {
        ...project,
        tasksByStatus: projectTasksByStatus,
        totalTasks: projectTasks.length,
        goals: goalsWithTasks
      };
    });

    return {
      projects: structuredProjects
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
          <div className="flex flex-col h-full space-y-4">
            {/* 프로젝트별 트리 구조 */}
            <div className="space-y-4">
              {kanbanData.projects?.map((project: any) => (
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
                  
                  {/* 프로젝트가 확장된 경우 */}
                  {expandedProjects.has(project.id) && (
                    <div className="ml-6 space-y-4">
                      {/* 프로젝트 직접 작업이 있는 경우 */}
                      {project.totalTasks > 0 && (
                        <div className="space-y-2">
                          {/* 프로젝트 작업 상태 헤더 */}
                          <div className="grid grid-cols-3 gap-2">
                            {["진행 전", "진행 중", "완료"].map((status) => {
                              const count = project.tasksByStatus[status]?.length || 0;
                              return (
                                <div key={status} className={`p-2 rounded ${getStatusHeaderColor(status)}`}>
                                  <div className="flex items-center justify-between text-sm">
                                    <span>{status}</span>
                                    <span>{count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* 프로젝트 작업 컬럼들 */}
                          <div className="grid grid-cols-3 gap-2">
                            {["진행 전", "진행 중", "완료"].map((status) => {
                              const tasks = project.tasksByStatus[status] || [];
                              
                              return (
                                <div key={status} className={`p-3 rounded-lg min-h-32 ${getStatusColor(status)}`}>
                                  <div className="space-y-2">
                                    {tasks.map((task: any) => (
                                      <Card 
                                        key={task.id}
                                        className="hover:shadow-sm transition-shadow duration-200 cursor-pointer bg-white border border-gray-200"
                                        data-testid={`card-task-${task.id}`}
                                      >
                                        <CardContent className="p-2">
                                          <h4 className="font-medium text-xs mb-2 text-gray-900 line-clamp-1">{task.title}</h4>
                                          
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                              <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                                                {task.progress || 0}
                                              </div>
                                              <Avatar className="w-4 h-4">
                                                <AvatarFallback className="text-xs bg-blue-500 text-white font-medium">
                                                  M
                                                </AvatarFallback>
                                              </Avatar>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                              <span>☑</span>
                                              <span>{project.code}</span>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                    
                                    {tasks.length === 0 && (
                                      <div className="text-center text-xs text-gray-400 py-4">
                                        작업 없음
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 목표들 */}
                      {project.goals?.map((goal: any) => (
                        <div key={goal.id} className="space-y-2">
                          {/* 목표 행 */}
                          <div 
                            className="flex items-center gap-2 p-3 w-full bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleGoal(goal.id)}
                            data-testid={`goal-${goal.id}`}
                          >
                            {expandedGoals.has(goal.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                                <span className="text-white text-xs font-bold">M</span>
                              </div>
                              <span className="text-sm font-medium">
                                {goal.title}
                              </span>
                            </div>
                          </div>
                          
                          {/* 목표가 확장된 경우 작업 칸반 */}
                          {expandedGoals.has(goal.id) && goal.totalTasks > 0 && (
                            <div className="ml-6 space-y-2">
                              {/* 목표 작업 상태 헤더 */}
                              <div className="grid grid-cols-3 gap-2">
                                {["진행 전", "진행 중", "완료"].map((status) => {
                                  const count = goal.tasksByStatus[status]?.length || 0;
                                  return (
                                    <div key={status} className={`p-2 rounded ${getStatusHeaderColor(status)}`}>
                                      <div className="flex items-center justify-between text-sm">
                                        <span>{status}</span>
                                        <span>{count}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* 목표 작업 컬럼들 */}
                              <div className="grid grid-cols-3 gap-2">
                                {["진행 전", "진행 중", "완료"].map((status) => {
                                  const tasks = goal.tasksByStatus[status] || [];
                                  
                                  return (
                                    <div key={status} className={`p-3 rounded-lg min-h-32 ${getStatusColor(status)}`}>
                                      <div className="space-y-2">
                                        {tasks.map((task: any) => (
                                          <Card 
                                            key={task.id}
                                            className="hover:shadow-sm transition-shadow duration-200 cursor-pointer bg-white border border-gray-200"
                                            data-testid={`card-task-${task.id}`}
                                          >
                                            <CardContent className="p-2">
                                              <h4 className="font-medium text-xs mb-2 text-gray-900 line-clamp-1">{task.title}</h4>
                                              
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                                                    {task.progress || 0}
                                                  </div>
                                                  <Avatar className="w-4 h-4">
                                                    <AvatarFallback className="text-xs bg-blue-500 text-white font-medium">
                                                      M
                                                    </AvatarFallback>
                                                  </Avatar>
                                                </div>
                                                
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                  <span>☑</span>
                                                  <span>{project.code}</span>
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        ))}
                                        
                                        {tasks.length === 0 && (
                                          <div className="text-center text-xs text-gray-400 py-4">
                                            작업 없음
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 목표에 작업이 없는 경우 */}
                          {expandedGoals.has(goal.id) && goal.totalTasks === 0 && (
                            <div className="ml-6 p-4 text-center text-gray-400 text-sm">
                              이 목표에 작업이 없습니다.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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