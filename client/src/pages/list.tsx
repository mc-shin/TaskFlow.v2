import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertTriangle, User } from "lucide-react";
import type { SafeTaskWithAssignee } from "@shared/schema";

export default function List() {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료": return "bg-green-500";
      case "실행대기": return "bg-blue-500";
      case "이슈함": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "완료": return "default";
      case "실행대기": return "secondary";
      case "이슈함": return "destructive";
      default: return "outline";
    }
  };

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            리스트
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            모든 작업을 리스트 형태로 확인합니다
          </p>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(tasks as SafeTaskWithAssignee[])?.map((task) => (
              <Card 
                key={task.id} 
                className="hover:shadow-lg transition-shadow duration-200"
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* 상태 표시 */}
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`}></div>
                      
                      {/* 작업 정보 */}
                      <div className="flex-1">
                        <h3 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* 오른쪽 정보 */}
                    <div className="flex items-center space-x-4">
                      {/* 담당자 */}
                      {task.assignee && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {task.assignee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            {task.assignee.name}
                          </span>
                        </div>
                      )}
                      
                      {/* 마감일 */}
                      {task.deadline && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatDeadline(task.deadline)}
                          </span>
                        </div>
                      )}
                      
                      {/* 상태 뱃지 */}
                      <Badge variant={getStatusBadgeVariant(task.status)} data-testid={`badge-status-${task.id}`}>
                        {task.status}
                      </Badge>
                      
                      {/* 우선순위 */}
                      {task.priority && (
                        <Badge variant="outline" data-testid={`badge-priority-${task.id}`}>
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}