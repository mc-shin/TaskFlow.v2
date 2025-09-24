import { useState, useMemo, useEffect } from "react";
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
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // 프로젝트 선택 시 첫 번째 목표를 자동 선택
  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    const projectsList = projects as ProjectWithDetails[];
    const project = projectsList?.find((p: any) => p.id === projectId);
    if (project?.goals && project.goals.length > 0) {
      setSelectedGoal(project.goals[0].id);
    } else {
      setSelectedGoal(null);
    }
  };

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
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

  // 초기 프로젝트/목표 선택
  useEffect(() => {
    const projectsList = projects as ProjectWithDetails[];
    if (projectsList && projectsList.length > 0 && !selectedProject) {
      const firstProject = projectsList[0];
      setSelectedProject(firstProject.id);
      if (firstProject.goals && firstProject.goals.length > 0) {
        setSelectedGoal(firstProject.goals[0].id);
      }
    }
  }, [projects, selectedProject]);

  // 칸반 데이터 구성 - 선택된 프로젝트/목표에 따라 필터링
  const kanbanData = useMemo(() => {
    if (!projects) return { 
      projects: [] as any[],
      globalTasksByStatus: { "진행전": [], "진행중": [], "완료": [], "이슈": [] },
      currentTasks: { "진행전": [], "진행중": [], "완료": [], "이슈": [] },
      selectedProject: null,
      selectedGoal: null
    };

    // 전역 작업 상태별 분류 (모든 작업)
    const globalTasksByStatus = {
      "진행전": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>,
      "진행중": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>,
      "완료": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>,
      "이슈": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>
    };

    // 현재 선택된 프로젝트/목표의 작업들
    const currentTasks = {
      "진행전": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>,
      "진행중": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>,
      "완료": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>,
      "이슈": [] as Array<SafeTaskWithAssignees & { projectCode: string, goalTitle?: string }>
    };

    const structuredProjects = (projects as ProjectWithDetails[]).map(project => {
      // 프로젝트 직접 작업들
      const projectTasks = project.tasks || [];
      projectTasks.forEach(task => {
        const taskStatus = task.status === "실행대기" ? "진행전" :
                          task.status === "진행중" ? "진행중" : 
                          task.status === "완료" ? "완료" : 
                          task.status === "이슈함" ? "이슈" : "진행전";
        
        const taskWithContext = {
          ...task,
          projectCode: project.code
        };

        globalTasksByStatus[taskStatus as keyof typeof globalTasksByStatus].push(taskWithContext);
        
        // 선택된 프로젝트의 직접 작업이고, 목표가 선택되지 않은 경우
        if (project.id === selectedProject && !selectedGoal) {
          currentTasks[taskStatus as keyof typeof currentTasks].push(taskWithContext);
        }
      });

      // 목표별 작업들
      project.goals?.forEach(goal => {
        const goalTasks = goal.tasks || [];
        goalTasks.forEach(task => {
          const taskStatus = task.status === "실행대기" ? "진행전" :
                            task.status === "진행중" ? "진행중" : 
                            task.status === "완료" ? "완료" : 
                            task.status === "이슈함" ? "이슈" : "진행전";
          
          const taskWithContext = {
            ...task,
            projectCode: project.code,
            goalTitle: goal.title
          };

          globalTasksByStatus[taskStatus as keyof typeof globalTasksByStatus].push(taskWithContext);
          
          // 선택된 목표의 작업인 경우
          if (goal.id === selectedGoal) {
            currentTasks[taskStatus as keyof typeof currentTasks].push(taskWithContext);
          }
        });
      });

      return project;
    });

    const selectedProjectData = structuredProjects.find(p => p.id === selectedProject);
    const selectedGoalData = selectedProjectData?.goals?.find(g => g.id === selectedGoal);

    return {
      projects: structuredProjects,
      globalTasksByStatus,
      currentTasks,
      selectedProject: selectedProjectData,
      selectedGoal: selectedGoalData
    };
  }, [projects, selectedProject, selectedGoal]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-sidebar/5 border-sidebar-border";
      case "진행중": return "bg-sidebar-accent/50 border-sidebar-border";
      case "완료": return "bg-sidebar-primary/10 border-sidebar-primary/30";
      case "이슈": return "bg-red-50 border-red-200";
      default: return "bg-sidebar/5 border-sidebar-border";
    }
  };

  const getStatusHeaderColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-sidebar border border-sidebar-border text-sidebar-foreground";
      case "진행중": return "bg-sidebar-accent border border-sidebar-border text-sidebar-accent-foreground";
      case "완료": return "bg-sidebar-primary border border-sidebar-primary text-sidebar-primary-foreground";
      case "이슈": return "bg-red-500 border border-red-600 text-white";
      default: return "bg-sidebar border border-sidebar-border text-sidebar-foreground";
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
            {/* 전역 상태 헤더 */}
            <div className="grid grid-cols-4 gap-4">
              {["진행전", "진행중", "완료", "이슈"].map((status) => {
                const totalTasks = kanbanData.globalTasksByStatus[status as keyof typeof kanbanData.globalTasksByStatus]?.length || 0;
                
                return (
                  <div key={status} className={`p-4 rounded-lg ${getStatusHeaderColor(status)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{status}</span>
                      <span className="font-semibold">{totalTasks}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 프로젝트 선택 행 */}
            {kanbanData.projects && kanbanData.projects.length > 0 && (
              <div className="w-full bg-sidebar/10 border border-sidebar-border rounded-lg">
                <div className="flex items-center gap-2 p-4">
                  <ChevronDown className="w-5 h-5 text-sidebar-foreground" />
                  <div className="w-5 h-5 bg-sidebar-primary rounded flex items-center justify-center">
                    <span className="text-sidebar-primary-foreground text-xs font-bold">P</span>
                  </div>
                  <span className="text-sm font-medium text-sidebar-foreground">프로젝트</span>
                  <select 
                    value={selectedProject || ''}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="ml-4 px-3 py-1 rounded border border-sidebar-border bg-white text-sm"
                    data-testid="select-project"
                  >
                    {kanbanData.projects.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.code} {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 목표 선택 행 */}
            {kanbanData.selectedProject?.goals && kanbanData.selectedProject.goals.length > 0 && (
              <div className="w-full bg-sidebar-accent/30 border border-sidebar-border rounded-lg">
                <div className="flex items-center gap-2 p-4">
                  <ChevronDown className="w-5 h-5 text-sidebar-accent-foreground" />
                  <div className="w-5 h-5 bg-sidebar-accent rounded flex items-center justify-center">
                    <span className="text-sidebar-accent-foreground text-xs font-bold">G</span>
                  </div>
                  <span className="text-sm font-medium text-sidebar-foreground">목표</span>
                  <select 
                    value={selectedGoal || ''}
                    onChange={(e) => handleGoalSelect(e.target.value)}
                    className="ml-4 px-3 py-1 rounded border border-sidebar-border bg-white text-sm"
                    data-testid="select-goal"
                  >
                    <option value="">프로젝트 직접 작업</option>
                    {kanbanData.selectedProject.goals.map((goal: any) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 작업 칸반 - 4개 상태 컬럼 */}
            <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
              {["진행전", "진행중", "완료", "이슈"].map((status) => {
                const tasks = kanbanData.currentTasks[status as keyof typeof kanbanData.currentTasks] || [];
                
                return (
                  <div key={status} className="flex flex-col">
                    {/* 상태별 작업 컬럼 */}
                    <div className={`flex-1 p-4 rounded-lg ${getStatusColor(status)} min-h-96`}>
                      <div className="space-y-3">
                        {tasks.map((task: any) => (
                          <Card 
                            key={task.id}
                            className="hover:shadow-sm transition-shadow duration-200 cursor-pointer bg-white border border-sidebar-border"
                            data-testid={`card-task-${task.id}`}
                          >
                            <CardContent className="p-3">
                              <div className="mb-2">
                                <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                                  {task.title}
                                </h4>
                                {task.goalTitle && (
                                  <p className="text-xs text-sidebar-foreground/70 mb-1">
                                    목표: {task.goalTitle}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 bg-sidebar-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-sidebar-primary">
                                    {task.progress || 0}
                                  </div>
                                  <Avatar className="w-5 h-5">
                                    <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground font-medium">
                                      T
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs text-sidebar-foreground/70">
                                  <span>☑</span>
                                  <span>{task.projectCode}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {tasks.length === 0 && (
                          <div className="text-center text-xs text-sidebar-foreground/50 py-8">
                            작업 없음
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