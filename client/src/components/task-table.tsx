import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMemo } from "react";
import type { TaskWithAssignees } from "@shared/schema";

interface TaskTableProps {
  onEditTask: (task: TaskWithAssignees) => void;
}

export function TaskTable({ onEditTask }: TaskTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleViewMore = () => {
    setLocation("/workspace/app/my-tasks");
  };

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    refetchInterval: 10000,
  });

  // Filter tasks to show only current user's tasks
  const myTasks = useMemo(() => {
    const currentUserId = localStorage.getItem("userId");
    if (!currentUserId || !tasks) return [];
    
    return (tasks as TaskWithAssignees[]).filter(task => 
      task.assignees && task.assignees.some(assignee => assignee.id === currentUserId)
    );
  }, [tasks]);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "작업 삭제 완료",
        description: "작업이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "작업 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTask = (taskId: string) => {
    if (confirm("정말로 이 작업을 삭제하시겠습니까?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "진행전":
        return "secondary" as const;
      case "진행중":
        return "default" as const;
      case "완료":
        return "success" as const; // 리스트 페이지와 동일한 success variant 사용
      case "이슈":
        return "issue" as const;
      default:
        return "outline" as const;
    }
  };

  const getStatusBadge = (status: string) => {
    return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행전": return "bg-gray-500";
      case "진행중": return "bg-blue-500";
      case "완료": return "bg-green-500";
      case "이슈": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const formatDeadlineWithDday = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const dateStr = new Date(deadline).toLocaleDateString('ko-KR');
    
    if (diffDays < 0) {
      return `${dateStr} (D+${Math.abs(diffDays)})`;
    } else if (diffDays === 0) {
      return `${dateStr} (D-Day)`;
    } else {
      return `${dateStr} (D-${diffDays})`;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="task-table-loading">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">내 작업</h3>
            <Button disabled>
              <MoreHorizontal className="h-4 w-4 mr-2" />
              더보기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="task-table">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" data-testid="text-task-title">내 작업</h3>
          <Button 
            onClick={handleViewMore}
            data-testid="button-view-more"
          >
            <MoreHorizontal className="h-4 w-4 mr-2" />
            더보기
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">작업</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">마감기한</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">상태</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">담당자</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">작업</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.map((task: TaskWithAssignees) => (
                <tr 
                  key={task.id}
                  className="task-row border-b border-border hover:bg-accent/50 transition-colors"
                  data-testid={`row-task-${task.id}`}
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 ${getStatusColor(task.status)} rounded-full`}></div>
                      <span className="font-medium" data-testid={`text-task-title-${task.id}`}>
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground" data-testid={`text-task-deadline-${task.id}`}>
                    {task.deadline ? formatDeadlineWithDday(task.deadline) : '-'}
                  </td>
                  <td className="p-4" data-testid={`badge-task-status-${task.id}`}>
                    {getStatusBadge(task.status)}
                  </td>
                  <td className="p-4">
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {task.assignees[0].initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm" data-testid={`text-assignee-${task.id}`}>
                          {task.assignees[0].name || ''}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onEditTask(task)}
                        data-testid={`button-edit-${task.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={deleteTaskMutation.isPending}
                        data-testid={`button-delete-${task.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {myTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground" data-testid="text-empty-tasks">
                    나에게 할당된 작업이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
