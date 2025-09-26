import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Calendar, Clock, User, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectWithOwners, SafeUserWithStats } from "@shared/schema";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("projects");

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    refetchInterval: 10000,
  });

  const { data: usersWithStats, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/with-stats"],
    refetchInterval: 10000,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    refetchInterval: 10000,
  });

  const formatDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `D+${Math.abs(diffDays)}`;
    } else if (diffDays === 0) {
      return "D-Day";
    } else {
      return `D-${diffDays}`;
    }
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "접속 기록 없음";
    
    const loginDate = new Date(lastLogin);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  };

  // 아카이브된 항목 필터링 (리스트 페이지와 동일한 로직)
  const archivedItems = (() => {
    try {
      const stored = localStorage.getItem('archivedItems');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  // 아카이브된 ID들을 빠른 조회를 위해 Set으로 변환
  const archivedIds = new Set<string>();
  archivedItems.forEach((item: any) => {
    if (typeof item === 'string') {
      archivedIds.add(item);
    } else if (item && typeof item === 'object') {
      if (item.id) {
        archivedIds.add(item.id);
      } else if (item.data && item.data.id) {
        archivedIds.add(item.data.id);
      }
    }
  });

  // 아카이브되지 않은 프로젝트들만 필터링
  const activeProjects = (projects as ProjectWithOwners[])?.filter(project => {
    return !archivedIds.has(project.id);
  }) || [];

  // 아카이브되지 않은 작업들만 필터링
  const activeTasks = (tasks as any[])?.filter(task => {
    return !archivedIds.has(task.id);
  }) || [];

  // 상태별 색상 함수
  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-secondary";
      case "진행중": return "bg-primary";
      case "완료": return "bg-green-600";
      case "이슈": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "진행전": return "secondary" as const;
      case "진행중": return "default" as const;
      case "완료": return "outline" as const;
      case "이슈": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  return (
    <>
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">
              관리자
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
              프로젝트와 팀 멤버를 관리합니다
            </p>
          </div>
        </header>
        
        {/* Admin Content */}
        <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-fit grid-cols-2 mb-6">
              <TabsTrigger value="projects" data-testid="tab-projects">
                프로젝트
              </TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members">
                멤버
              </TabsTrigger>
            </TabsList>
            
            {/* 프로젝트 탭 */}
            <TabsContent value="projects" data-testid="content-projects">
              {projectsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-64 bg-muted rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {activeProjects?.map((project: any) => {
                    // 프로젝트의 모든 작업들 수집
                    const projectTasks = project.goals?.flatMap((goal: any) => goal.tasks || []) || [];
                    
                    // 프로젝트 전체 진행률 계산
                    const totalTasks = projectTasks.length;
                    const completedTasks = projectTasks.filter((task: any) => task.status === '완료').length;
                    const projectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    
                    return (
                      <Card 
                        key={project.id}
                        className="relative bg-slate-800 text-white border-slate-700"
                        data-testid={`card-project-${project.id}`}
                      >
                        {/* D-day */}
                        <div className="absolute top-4 left-4">
                          <span className="text-sm font-medium text-slate-300">
                            {project.deadline ? formatDeadline(project.deadline) : 'D-∞'}
                          </span>
                        </div>
                        
                        <CardContent className="p-6 pt-12">
                          {/* 원형 진행률 */}
                          <div className="flex items-center justify-center mb-6">
                            <div className="relative w-24 h-24">
                              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  stroke="hsl(215, 28%, 17%)"
                                  strokeWidth="6"
                                  fill="transparent"
                                />
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  stroke="hsl(217, 91%, 60%)"
                                  strokeWidth="6"
                                  fill="transparent"
                                  strokeDasharray={`${2 * Math.PI * 40}`}
                                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - projectProgress / 100)}`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-xs text-slate-400">진행률</div>
                                  <div className="text-lg font-bold" data-testid={`text-progress-${project.id}`}>
                                    {projectProgress}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 프로젝트 정보 */}
                          <div className="text-center mb-6">
                            <div className="text-blue-400 text-sm font-medium mb-1">
                              {project.name}
                            </div>
                            <div className="text-white text-lg font-semibold mb-2">
                              {project.description || '프로젝트 설명 없음'}
                            </div>
                            <div className="text-slate-300 text-sm">
                              총 작업 개수: {totalTasks}
                            </div>
                          </div>
                          
                          {/* 작업 리스트 */}
                          <div className="space-y-2">
                            {projectTasks.slice(0, 5).map((task: any) => {
                              const getTaskStatusColor = (status: string) => {
                                switch (status) {
                                  case '완료': return 'bg-green-500';
                                  case '진행중': return 'bg-yellow-500';
                                  case '진행전': return 'bg-slate-500';
                                  case '이슈': return 'bg-red-500';
                                  default: return 'bg-slate-500';
                                }
                              };
                              
                              return (
                                <div key={task.id} className="flex items-center gap-2 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${getTaskStatusColor(task.status)}`}></div>
                                  <span className="truncate text-slate-200">{task.title}</span>
                                </div>
                              );
                            })}
                            {projectTasks.length > 5 && (
                              <div className="text-xs text-slate-400 text-center mt-2">
                                +{projectTasks.length - 5}개 더
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            {/* 멤버 탭 */}
            <TabsContent value="members" data-testid="content-members">
              {usersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-48 bg-muted rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(usersWithStats as SafeUserWithStats[])?.map((user: SafeUserWithStats) => (
                    <Card 
                      key={user.id} 
                      className="relative hover:shadow-lg transition-shadow duration-200"
                      data-testid={`card-user-${user.id}`}
                    >
                      {/* 경고 표시 */}
                      {user.hasOverdueTasks && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="destructive" className="gap-1" data-testid={`badge-user-warning-${user.id}`}>
                            <AlertTriangle className="w-3 h-3" />
                            기한 초과
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-3">
                        {/* 사용자 정보 */}
                        <div className="flex items-center justify-center mb-4">
                          <Avatar className="w-16 h-16">
                            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                              {user.initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        
                        <CardTitle className="text-center" data-testid={`text-user-name-${user.id}`}>
                          {user.name}
                        </CardTitle>
                        
                        <div className="text-center text-sm text-muted-foreground">
                          마지막 접속: {formatLastLogin(user.lastLoginAt ? user.lastLoginAt.toISOString() : null)}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        {/* 작업 통계 */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">작업 개수</span>
                            <span className="font-medium" data-testid={`text-user-task-count-${user.id}`}>
                              {user.taskCount || 0}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">완료된 작업</span>
                            <span className="font-medium text-green-500">
                              {user.completedTaskCount || 0}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">진행중 작업</span>
                            <span className="font-medium text-blue-500">
                              {(user.taskCount || 0) - (user.completedTaskCount || 0) - (user.overdueTaskCount || 0) || 0}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">기한 초과 작업</span>
                            <span className="font-medium text-red-500">
                              {user.overdueTaskCount || 0}
                            </span>
                          </div>
                          
                          {/* 진행률 바 */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">진행률</span>
                              <span className="font-medium" data-testid={`text-user-progress-${user.id}`}>
                                {user.progressPercentage || 0}%
                              </span>
                            </div>
                            <Progress 
                              value={user.progressPercentage || 0} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
    </>
  );
}