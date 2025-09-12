import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { SafeTaskWithAssignee } from "@shared/schema";

export default function Priority() {
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

  const sortTasksByPriority = (tasks: SafeTaskWithAssignee[]) => {
    const priorityOrder = { "높음": 3, "보통": 2, "낮음": 1 };
    
    return [...tasks].sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      return bPriority - aPriority;
    });
  };

  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case "높음": return <ArrowUp className="w-4 h-4 text-red-500" />;
      case "낮음": return <ArrowDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "높음": return "border-l-4 border-l-red-500";
      case "낮음": return "border-l-4 border-l-green-500";
      default: return "border-l-4 border-l-yellow-500";
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

  const sortedTasks = tasks ? sortTasksByPriority(tasks as SafeTaskWithAssignee[]) : [];

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            우선순위
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            우선순위별로 작업을 관리합니다
          </p>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTasks.map((task) => (
              <Card 
                key={task.id} 
                className={`hover:shadow-lg transition-shadow duration-200 ${getPriorityColor(task.priority)}`}
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* 우선순위 아이콘 */}
                      <div className="flex items-center space-x-2">
                        {getPriorityIcon(task.priority)}
                        <Badge 
                          variant={task.priority === "높음" ? "destructive" : task.priority === "낮음" ? "default" : "secondary"}
                          data-testid={`badge-priority-${task.id}`}
                        >
                          {task.priority || "보통"}
                        </Badge>
                      </div>
                      
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
                      <Badge 
                        variant={task.status === "완료" ? "default" : task.status === "이슈함" ? "destructive" : "secondary"}
                        data-testid={`badge-status-${task.id}`}
                      >
                        {task.status}
                      </Badge>
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