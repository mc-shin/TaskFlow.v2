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

  // 상태별로 작업을 그룹핑하고 프로젝트 > 목표 > 작업 계층구조 유지
  const kanbanData = useMemo(() => {
    if (!projects) return { "진행전": [], "진행중": [], "완료": [], "지연": [] };

    const statusGroups = {
      "진행전": [] as Array<{ 
        project: ProjectWithDetails, 
        directTasks: SafeTaskWithAssignees[], 
        goals: Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> 
      }>,
      "진행중": [] as Array<{ 
        project: ProjectWithDetails, 
        directTasks: SafeTaskWithAssignees[], 
        goals: Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> 
      }>,
      "완료": [] as Array<{ 
        project: ProjectWithDetails, 
        directTasks: SafeTaskWithAssignees[], 
        goals: Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> 
      }>,
      "지연": [] as Array<{ 
        project: ProjectWithDetails, 
        directTasks: SafeTaskWithAssignees[], 
        goals: Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> 
      }>
    };

    (projects as ProjectWithDetails[]).forEach(project => {
      // 각 상태별로 프로젝트 데이터 구성
      const statusProjectData = {
        "진행전": { project, directTasks: [] as SafeTaskWithAssignees[], goals: [] as Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> },
        "진행중": { project, directTasks: [] as SafeTaskWithAssignees[], goals: [] as Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> },
        "완료": { project, directTasks: [] as SafeTaskWithAssignees[], goals: [] as Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> },
        "지연": { project, directTasks: [] as SafeTaskWithAssignees[], goals: [] as Array<{ goal: GoalWithTasks, tasks: SafeTaskWithAssignees[] }> }
      };

      // 프로젝트 직접 작업들 처리
      if (project.tasks) {
        project.tasks.forEach(task => {
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

          statusProjectData[taskStatus as keyof typeof statusProjectData].directTasks.push(task);
        });
      }

      // 목표별 작업들 처리
      project.goals?.forEach(goal => {
        if (goal.tasks) {
          const goalTasksByStatus = {
            "진행전": [] as SafeTaskWithAssignees[],
            "진행중": [] as SafeTaskWithAssignees[],
            "완료": [] as SafeTaskWithAssignees[],
            "지연": [] as SafeTaskWithAssignees[]
          };

          goal.tasks.forEach(task => {
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

            goalTasksByStatus[taskStatus as keyof typeof goalTasksByStatus].push(task);
          });

          // 각 상태별로 목표 데이터 추가
          Object.entries(goalTasksByStatus).forEach(([status, tasks]) => {
            if (tasks.length > 0) {
              statusProjectData[status as keyof typeof statusProjectData].goals.push({
                goal,
                tasks
              });
            }
          });
        }
      });

      // 프로젝트에 해당 상태의 작업이 있는 경우만 상태 그룹에 추가
      Object.entries(statusProjectData).forEach(([status, data]) => {
        const hasDirectTasks = data.directTasks.length > 0;
        const hasGoalTasks = data.goals.length > 0;
        
        if (hasDirectTasks || hasGoalTasks) {
          statusGroups[status as keyof typeof statusGroups].push(data);
        }
      });
    });

    return statusGroups;
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
          <div className="grid grid-cols-4 gap-6 h-full">
            {["진행전", "진행중", "완료", "지연"].map((status) => {
              const projectGroups = kanbanData[status as keyof typeof kanbanData];
              const totalTasks = projectGroups.reduce((sum, projectGroup) => 
                sum + projectGroup.directTasks.length + 
                projectGroup.goals.reduce((goalSum, goalGroup) => goalSum + goalGroup.tasks.length, 0), 0);
              
              return (
                <div key={status} className="flex flex-col h-full">
                  {/* 컬럼 헤더 */}
                  <div className={`p-4 rounded-t-lg border-b-2 ${getStatusColor(status)}`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">{status}</h2>
                      <Badge variant="secondary" className={getStatusBadgeColor(status)}>
                        {totalTasks}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* 컬럼 내용 */}
                  <div className={`flex-1 p-4 border-l border-r border-b rounded-b-lg min-h-96 overflow-y-auto ${getStatusColor(status)}`}>
                    <div className="space-y-4">
                      {projectGroups.map((projectGroup) => (
                        <div key={`project-${projectGroup.project.id}`} className="space-y-3">
                          {/* 프로젝트 헤더 */}
                          <div 
                            className="flex items-center gap-2 p-2 bg-white/70 rounded-lg border border-blue-200 cursor-pointer hover:bg-white/90 transition-colors"
                            onClick={() => toggleProject(projectGroup.project.id)}
                          >
                            {expandedProjects.has(projectGroup.project.id) ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-blue-600" />
                            )}
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-800">
                              {projectGroup.project.code}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {projectGroup.directTasks.length + projectGroup.goals.reduce((sum, g) => sum + g.tasks.length, 0)}
                            </Badge>
                          </div>
                          
                          {/* 프로젝트 직접 작업들 */}
                          {expandedProjects.has(projectGroup.project.id) && projectGroup.directTasks.length > 0 && (
                            <div className="space-y-2 pl-6">
                              {projectGroup.directTasks.map((task, taskIndex) => (
                                <Card 
                                  key={`${status}-project-${projectGroup.project.id}-task-${task.id}-${taskIndex}`}
                                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white border"
                                  data-testid={`card-task-${task.id}`}
                                >
                                  <CardContent className="p-3">
                                    <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>
                                    
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                        {task.description}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
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
                                          <span className="text-xs text-muted-foreground">
                                            +{(task.assigneeIds?.length || 0) - 3}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <Progress value={task.progress || 0} className="h-2 w-16" />
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                          
                          {/* 목표들과 목표 작업들 */}
                          {expandedProjects.has(projectGroup.project.id) && projectGroup.goals.map((goalGroup) => (
                            <div key={`goal-${goalGroup.goal.id}`} className="space-y-2 pl-4">
                              {/* 목표 헤더 */}
                              <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-green-200">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {goalGroup.goal.title}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {goalGroup.tasks.length}
                                </Badge>
                              </div>
                              
                              {/* 목표 작업들 */}
                              <div className="space-y-2 pl-6">
                                {goalGroup.tasks.map((task, taskIndex) => (
                                  <Card 
                                    key={`${status}-goal-${goalGroup.goal.id}-task-${task.id}-${taskIndex}`}
                                    className="hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white border"
                                    data-testid={`card-task-${task.id}`}
                                  >
                                    <CardContent className="p-3">
                                      <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>
                                      
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                          {task.description}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
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
                                            <span className="text-xs text-muted-foreground">
                                              +{(task.assigneeIds?.length || 0) - 3}
                                            </span>
                                          )}
                                        </div>
                                        
                                        <Progress value={task.progress || 0} className="h-2 w-16" />
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      
                      {projectGroups.length === 0 && (
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
            
            {Object.values(kanbanData).every(groups => groups.length === 0) && (
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