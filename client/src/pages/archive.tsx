import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";

export default function Archive() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              데이터를 불러오는데 실패했습니다
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/list')}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">보관함</h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">보관된 프로젝트, 목표, 작업을 관리합니다</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">

      {/* Table Header */}
      <div className="bg-muted/30 p-3 rounded-t-lg border">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-5">이름</div>
          <div className="col-span-2">마감일</div>
          <div className="col-span-3">담당자</div>
          <div className="col-span-2">상태</div>
        </div>
      </div>

      {/* Content */}
      <Card className="rounded-t-none">
        <CardContent className="p-0">
          {(!projects || (projects as ProjectWithDetails[]).length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>보관된 항목이 없습니다</p>
              <p className="text-sm mt-1">리스트에서 항목을 보관해주세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {(projects as ProjectWithDetails[]).map((project) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5 flex items-center gap-2">
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
                        <button 
                          className="font-medium hover:text-blue-600 cursor-pointer transition-colors text-left" 
                          onClick={() => setLocation(`/detail/project/${project.id}`)}
                          data-testid={`text-project-name-${project.id}`}
                        >
                          {project.name}
                        </button>
                        <Badge variant="outline" className="text-xs">
                          {project.code}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-sm">
                        {formatDate(project.deadline)}
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        {project.owners && project.owners.length > 0 && (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-blue-600 text-white">
                                {project.owners[0].initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{project.owners[0].name}</span>
                          </>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Badge 
                          variant={project.status === '완료' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Goals */}
                  {expandedProjects.has(project.id) && project.goals?.map((goal) => (
                    <div key={goal.id}>
                      <div className="p-3 hover:bg-muted/50 transition-colors border-l-2 border-blue-200 ml-4">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-5 flex items-center gap-2">
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
                            <button 
                              className="font-medium hover:text-blue-600 cursor-pointer transition-colors text-left" 
                              onClick={() => setLocation(`/detail/goal/${goal.id}`)}
                              data-testid={`text-goal-name-${goal.id}`}
                            >
                              {goal.title}
                            </button>
                          </div>
                          <div className="col-span-2 text-sm">
                            {formatDate(goal.deadline)}
                          </div>
                          <div className="col-span-3 flex items-center gap-2">
                            {goal.assignees && goal.assignees.length > 0 && (
                              <>
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs bg-green-600 text-white">
                                    {goal.assignees[0].initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{goal.assignees[0].name}</span>
                              </>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Badge 
                              variant={goal.status === '완료' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {goal.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Tasks */}
                      {expandedGoals.has(goal.id) && goal.tasks?.map((task) => (
                        <div key={task.id} className="p-3 hover:bg-muted/50 transition-colors border-l-2 border-orange-200 ml-8">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-5 flex items-center gap-2">
                              <Circle className="w-4 h-4 text-orange-600" />
                              <button 
                                className="font-medium hover:text-blue-600 cursor-pointer transition-colors text-left" 
                                onClick={() => setLocation(`/detail/task/${task.id}`)}
                                data-testid={`text-task-name-${task.id}`}
                              >
                                {task.title}
                              </button>
                            </div>
                            <div className="col-span-2 text-sm">
                              {formatDate(task.deadline)}
                            </div>
                            <div className="col-span-3 flex items-center gap-2">
                              {task.assignees && task.assignees.length > 0 && (
                                <>
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs bg-orange-600 text-white">
                                      {task.assignees[0].initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{task.assignees[0].name}</span>
                                </>
                              )}
                            </div>
                            <div className="col-span-2">
                              <Badge 
                                variant={task.status === '완료' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
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