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

  // 프로젝트와 작업을 상태별로 그룹핑 (칸반 스타일) - 성능 최적화를 위한 memoization
  const groupedProjects = useMemo(() => {
    if (!projects) return {
      "진행전": [],
      "진행중": [],
      "완료": [],
      "지연": []
    };

    type ProjectGroup = {
      project: ProjectWithDetails;
      tasks: SafeTaskWithAssignees[];
    };
    
    const columns: Record<string, ProjectGroup[]> = {
      "진행전": [],
      "진행중": [],
      "완료": [],
      "지연": []
    };

    // 작업들을 상태별로 분류하여 고유성 보장
    const tasksByStatus: Record<string, Map<string, { task: SafeTaskWithAssignees; project: ProjectWithDetails }>> = {
      "진행전": new Map(),
      "진행중": new Map(),
      "완료": new Map(),
      "지연": new Map()
    };

    projects.forEach(project => {
      // 프로젝트의 모든 작업을 수집
      const allTasks: SafeTaskWithAssignees[] = [];
      
      // 목표의 작업들
      project.goals?.forEach(goal => {
        if (goal.tasks) {
          allTasks.push(...goal.tasks);
        }
      });

      // 직접 프로젝트 작업들
      if (project.tasks) {
        allTasks.push(...project.tasks);
      }

      // 각 작업을 적절한 상태로 분류 (하나의 작업은 하나의 상태에만 속함)
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

        // 작업을 해당 상태에 추가 (고유성 보장)
        tasksByStatus[taskStatus].set(task.id, { task, project });
      });
    });

    // 각 상태별로 프로젝트 그룹 생성
    ["진행전", "진행중", "완료", "지연"].forEach(status => {
      const projectTasksMap = new Map<string, SafeTaskWithAssignees[]>();
      
      // 해당 상태의 작업들을 프로젝트별로 그룹핑
      tasksByStatus[status].forEach(({ task, project }) => {
        if (!projectTasksMap.has(project.id)) {
          projectTasksMap.set(project.id, []);
        }
        projectTasksMap.get(project.id)!.push(task);
      });

      // 프로젝트별로 그룹 생성
      projectTasksMap.forEach((tasks, projectId) => {
        const project = projects?.find(p => p.id === projectId);
        if (project && tasks.length > 0) {
          columns[status].push({
            project,
            tasks
          });
        }
      });
    });

    return columns;
  }, [projects]);

  const getColumnColor = (status: string) => {
    switch (status) {
      case "진행전": return "border-blue-200 bg-blue-50/20";
      case "진행중": return "border-yellow-200 bg-yellow-50/20";
      case "완료": return "border-green-200 bg-green-50/20";
      case "지연": return "border-red-200 bg-red-50/20";
      default: return "border-gray-200 bg-gray-50/20";
    }
  };

  const columns = groupedProjects;

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
            variant="outline"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse h-96">
                <CardContent className="p-6">
                  <div className="h-full bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
            {Object.entries(columns).map(([status, projectGroups]) => (
              <div 
                key={status} 
                className={`flex flex-col border rounded-lg p-4 ${getColumnColor(status)} min-h-96`}
                data-testid={`column-${status}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{status}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {projectGroups.reduce((total, group) => total + group.tasks.length, 0)}
                  </Badge>
                </div>
                
                <div className="space-y-3 flex-1">
                  {projectGroups.map((group, groupIndex) => {
                    const project = group.project;
                    const tasks = group.tasks;
                    const isExpanded = expandedProjects.has(project.id);
                    
                    return (
                      <div key={`${status}-project-${project.id}`} className="space-y-2">
                        {/* Project Header */}
                        <div 
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => toggleProject(project.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <FolderOpen className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{project.code}</span>
                          <span className="text-sm text-muted-foreground truncate">{project.name}</span>
                        </div>
                        
                        {/* Project Tasks (when expanded) */}
                        {isExpanded && tasks.map(task => (
                          <Card 
                            key={`${status}-project-${project.id}-task-${task.id}`}
                            className="ml-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                            data-testid={`card-task-${task.id}`}
                          >
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm mb-2">{task.title}</h4>
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                <span className={getDDayColorClass(task.deadline)}>
                                  {formatDeadline(task.deadline)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {project.code}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                  {task.assigneeIds?.slice(0, 2).map((assigneeId) => {
                                    const user = getUserById(assigneeId);
                                    return user ? (
                                      <Avatar key={user.id} className="w-5 h-5" data-testid={`avatar-${user.id}`}>
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
                                
                                <div className="text-xs text-muted-foreground">
                                  {task.progress || 0}%
                                </div>
                              </div>
                              
                              <Progress value={task.progress || 0} className="h-1 mt-2" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}