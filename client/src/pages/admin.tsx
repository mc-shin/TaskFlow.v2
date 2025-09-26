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
                작업
              </TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members">
                멤버
              </TabsTrigger>
            </TabsList>
            
            {/* 작업 탭 */}
            <TabsContent value="projects" data-testid="content-projects">
              {tasksLoading ? (
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
                  {activeTasks?.map((task: any) => (
                    <Card 
                      key={task.id} 
                      className="relative hover:shadow-lg transition-shadow duration-200"
                      data-testid={`card-task-${task.id}`}
                    >
                      {/* 상태 색상 인디케이터 */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(task.status)} rounded-l-lg`}></div>
                      
                      {/* 기한 초과 경고 */}
                      {task.deadline && formatDeadline(task.deadline)?.includes('D+') && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="destructive" className="gap-1" data-testid={`badge-warning-${task.id}`}>
                            기한 초과
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={getStatusBadgeVariant(task.status)}
                            className="text-xs"
                          >
                            {task.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-medium">
                            {task.deadline ? formatDeadline(task.deadline) : '기한 없음'}
                          </span>
                        </div>
                        
                        {/* 진행률 */}
                        <div className="flex items-center justify-center mb-4">
                          <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke="hsl(217, 32%, 17%)"
                                strokeWidth="8"
                                fill="transparent"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke="hsl(217, 91%, 60%)"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - (task.progress || 0) / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground">진행률</div>
                                <div className="text-lg font-bold" data-testid={`text-progress-${task.id}`}>
                                  {task.progress || 0}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <CardTitle className="text-sm font-medium text-center" data-testid={`text-task-title-${task.id}`}>
                          <div className="text-foreground truncate">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">{task.description}</div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {/* 우선순위 및 라벨 */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {task.priority && (
                              <Badge variant="outline" className="text-xs">
                                우선순위: {task.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* 라벨 */}
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {task.labels.slice(0, 2).map((label: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* 담당자 정보 */}
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground">
                            담당자: {task.assigneeIds && task.assigneeIds.length > 0 ? 
                              `${task.assigneeIds.length}명` : '미배정'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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