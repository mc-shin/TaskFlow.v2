import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Plus, ArrowRight } from "lucide-react";
import type { SafeTaskWithAssignee } from "@shared/schema";

export default function Backlog() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    
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

  const categorizeTasksForBacklog = (tasks: SafeTaskWithAssignee[]) => {
    const categories = {
      pending: tasks.filter(task => task.status === "대기" || !task.status || task.status === "백로그"),
      ready: tasks.filter(task => task.status === "실행대기"),
      inProgress: tasks.filter(task => task.status === "진행중"),
      completed: tasks.filter(task => task.status === "완료")
    };
    
    return categories;
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "높음": return "text-red-500";
      case "낮음": return "text-green-500";
      default: return "text-yellow-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료": return "bg-green-500";
      case "실행대기": return "bg-blue-500";
      case "진행중": return "bg-yellow-500";
      case "이슈함": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const categorizedTasks = tasks ? categorizeTasksForBacklog(tasks as SafeTaskWithAssignee[]) : {
    pending: [],
    ready: [],
    inProgress: [],
    completed: []
  };

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            백로그
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            프로젝트 백로그를 관리합니다
          </p>
        </div>
        <Button data-testid="button-add-task">
          <Plus className="w-4 h-4 mr-2" />
          새 작업 추가
        </Button>
      </header>
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* 대기 중인 작업들 */}
            <Card data-testid="section-pending">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>백로그 ({categorizedTasks.pending.length})</span>
                  <Badge variant="outline">{categorizedTasks.pending.length}개 작업</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categorizedTasks.pending.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`task-pending-${task.id}`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`}></div>
                        <div className="flex-1">
                          <h4 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {task.priority && (
                          <Badge 
                            variant="outline" 
                            className={getPriorityColor(task.priority)}
                            data-testid={`badge-priority-${task.id}`}
                          >
                            {task.priority}
                          </Badge>
                        )}
                        
                        {task.assignee && (
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {task.assignee.initials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <Button variant="ghost" size="sm" data-testid={`button-start-${task.id}`}>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 실행 대기 작업들 */}
            <Card data-testid="section-ready">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>실행 대기 ({categorizedTasks.ready.length})</span>
                  <Badge variant="secondary">{categorizedTasks.ready.length}개 작업</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categorizedTasks.ready.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors border-l-4 border-l-blue-500"
                      data-testid={`task-ready-${task.id}`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-1">
                          <h4 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {task.deadline && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDeadline(task.deadline)}
                            </span>
                          </div>
                        )}
                        
                        {task.assignee && (
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {task.assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assignee.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 진행 중인 작업들 */}
            <Card data-testid="section-inprogress">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>진행 중 ({categorizedTasks.inProgress.length})</span>
                  <Badge variant="secondary">{categorizedTasks.inProgress.length}개 작업</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categorizedTasks.inProgress.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors border-l-4 border-l-yellow-500"
                      data-testid={`task-inprogress-${task.id}`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-1">
                          <h4 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {task.deadline && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDeadline(task.deadline)}
                            </span>
                          </div>
                        )}
                        
                        {task.assignee && (
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {task.assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assignee.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 완료된 작업들 */}
            <Card data-testid="section-completed">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>완료됨 ({categorizedTasks.completed.length})</span>
                  <Badge variant="default">{categorizedTasks.completed.length}개 작업</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categorizedTasks.completed.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors border-l-4 border-l-green-500 opacity-75"
                      data-testid={`task-completed-${task.id}`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-1">
                          <h4 className="font-medium line-through" data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-through">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {task.assignee && (
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {task.assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assignee.name}</span>
                          </div>
                        )}
                        
                        <Badge variant="default">완료</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}