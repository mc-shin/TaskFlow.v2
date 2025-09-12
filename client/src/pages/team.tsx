import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Calendar, Clock, User, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectWithOwner, SafeUserWithStats } from "@shared/schema";

export default function Team() {
  const [activeTab, setActiveTab] = useState("projects");

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: usersWithStats, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/with-stats"],
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

  return (
    <>
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">
              팀
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
              프로젝트와 팀 멤버를 관리합니다
            </p>
          </div>
        </header>
        
        {/* Team Content */}
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
                  {(projects as ProjectWithOwner[])?.map((project: ProjectWithOwner) => (
                    <Card 
                      key={project.id} 
                      className="relative hover:shadow-lg transition-shadow duration-200"
                      data-testid={`card-project-${project.id}`}
                    >
                      {/* 경고 표시 */}
                      {project.hasOverdueTasks && project.overdueTaskCount && project.overdueTaskCount > 0 && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="destructive" className="gap-1" data-testid={`badge-warning-${project.id}`}>
                            기한 초과 {project.overdueTaskCount}
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground font-medium">
                            {project.deadline && formatDeadline(project.deadline)}
                          </span>
                          {project.owner && (
                            <div className="flex items-center gap-1">
                              <Avatar className="w-5 h-5">
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {project.owner.initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>
                        
                        {/* 진행률 원형 차트 */}
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
                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - (project.progressPercentage || 0) / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground">진행률</div>
                                <div className="text-lg font-bold" data-testid={`text-progress-${project.id}`}>
                                  {project.progressPercentage || 0}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <CardTitle className="text-sm font-medium text-center" data-testid={`text-project-title-${project.id}`}>
                          <div className="text-primary font-bold">{project.code}</div>
                          <div className="text-foreground">{project.name}</div>
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="text-center mb-4">
                          <span className="text-sm text-muted-foreground">
                            총 작업 개수: <span className="font-medium">{project.totalTasks || 0}</span>
                          </span>
                        </div>
                        
                        {/* 작업 목록 */}
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {project.tasks?.slice(0, 6).map((task, index) => (
                            <div key={task.id} className="flex items-center text-xs">
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                task.status === "완료" ? "bg-green-500" :
                                task.status === "실행대기" ? "bg-blue-500" :
                                task.status === "이슈함" ? "bg-red-500" : "bg-yellow-500"
                              }`}></div>
                              <span className="text-muted-foreground truncate" data-testid={`text-task-${task.id}`}>
                                {task.title}
                              </span>
                            </div>
                          ))}
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
                          마지막 접속: {formatLastLogin(user.lastLoginAt)}
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
                          
                          {user.overdueTaskCount && user.overdueTaskCount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">기한 초과 작업</span>
                              <span className="font-medium text-red-500">
                                {user.overdueTaskCount}
                              </span>
                            </div>
                          )}
                          
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