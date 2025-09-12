import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User } from "lucide-react";
import type { SafeTaskWithAssignee } from "@shared/schema";

export default function Kanban() {
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

  const groupTasksByStatus = (tasks: SafeTaskWithAssignee[]) => {
    const groups = {
      "실행대기": [],
      "진행중": [],
      "완료": [],
      "이슈함": []
    };
    
    tasks?.forEach(task => {
      if (groups[task.status as keyof typeof groups]) {
        groups[task.status as keyof typeof groups].push(task);
      }
    });
    
    return groups;
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case "실행대기": return "border-blue-200 bg-blue-50/30";
      case "진행중": return "border-yellow-200 bg-yellow-50/30";
      case "완료": return "border-green-200 bg-green-50/30";
      case "이슈함": return "border-red-200 bg-red-50/30";
      default: return "border-gray-200 bg-gray-50/30";
    }
  };

  const taskGroups = tasks ? groupTasksByStatus(tasks as SafeTaskWithAssignee[]) : {};

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            칸반
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            작업 상태별로 관리합니다
          </p>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-48 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
            {Object.entries(taskGroups).map(([status, statusTasks]) => (
              <div 
                key={status} 
                className={`flex flex-col border rounded-lg p-4 ${getColumnColor(status)}`}
                data-testid={`column-${status}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{status}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {statusTasks.length}
                  </Badge>
                </div>
                
                <div className="space-y-3 flex-1">
                  {statusTasks.map((task) => (
                    <Card 
                      key={task.id} 
                      className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      data-testid={`card-task-${task.id}`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2" data-testid={`text-task-title-${task.id}`}>
                          {task.title}
                        </h4>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {task.assignee && (
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {task.assignee.initials}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            {task.priority && (
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                          
                          {task.deadline && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatDeadline(task.deadline)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}