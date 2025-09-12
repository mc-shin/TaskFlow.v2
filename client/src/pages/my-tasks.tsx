import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TaskModal } from "@/components/task-modal";
import type { TaskWithAssignee } from "@shared/schema";

export default function MyTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

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

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const getStatusBadge = (status: string, deadline?: string) => {
    if (!deadline) return <Badge variant="secondary">기한 없음</Badge>;
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Badge variant="destructive">D+{Math.abs(diffDays)}</Badge>;
    } else if (diffDays === 0) {
      return <Badge className="bg-yellow-500 text-white">D-Day</Badge>;
    } else if (diffDays <= 3) {
      return <Badge className="bg-orange-500 text-white">D-{diffDays}</Badge>;
    } else {
      return <Badge className="bg-green-500 text-white">D-{diffDays}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "실행대기": return "bg-green-500";
      case "이슈함": return "bg-blue-500";
      case "사업팀": return "bg-yellow-500";
      case "인력팀": return "bg-purple-500";
      case "완료": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  // 필터링된 작업 목록
  const filteredTasks = tasks?.filter((task: TaskWithAssignee) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <>
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">
              내 작업
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
              모든 작업을 관리하고 추적하세요
            </p>
          </div>
        </header>

        {/* Loading Content */}
        <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
          <Card data-testid="my-tasks-loading">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            내 작업
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            모든 작업을 관리하고 추적하세요
          </p>
        </div>
        <Button 
          onClick={handleCreateTask}
          data-testid="button-create-task"
        >
          <Plus className="h-4 w-4 mr-2" />
          새 작업
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {/* 필터 섹션 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-4">
              {/* 검색 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="작업 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              
              {/* 상태 필터 */}
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="상태 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="실행대기">실행대기</SelectItem>
                    <SelectItem value="이슈함">이슈함</SelectItem>
                    <SelectItem value="사업팀">사업팀</SelectItem>
                    <SelectItem value="인력팀">인력팀</SelectItem>
                    <SelectItem value="완료">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 작업 목록 */}
        <Card data-testid="my-tasks-table">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" data-testid="text-tasks-title">
                작업 목록 ({filteredTasks?.length || 0}개)
              </h3>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">작업</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">설명</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">소요시간</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">마감기한</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">상태</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">담당자</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks?.map((task: TaskWithAssignee) => (
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
                      <td className="p-4 text-muted-foreground max-w-xs" data-testid={`text-task-description-${task.id}`}>
                        <div className="truncate">
                          {task.description || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground" data-testid={`text-task-duration-${task.id}`}>
                        {task.duration || 0}시간
                      </td>
                      <td className="p-4 text-muted-foreground" data-testid={`text-task-deadline-${task.id}`}>
                        {task.deadline ? new Date(task.deadline).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="p-4" data-testid={`badge-task-status-${task.id}`}>
                        {getStatusBadge(task.status, task.deadline)}
                      </td>
                      <td className="p-4">
                        {task.assignee && (
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {task.assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm" data-testid={`text-assignee-${task.id}`}>
                              {task.assignee.name}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditTask(task)}
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
                  
                  {(!filteredTasks || filteredTasks.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground" data-testid="text-empty-tasks">
                        {searchTerm || statusFilter !== "all" 
                          ? "검색 조건에 맞는 작업이 없습니다." 
                          : "작업이 없습니다. 새 작업을 생성해보세요."
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Task Modal */}
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        editingTask={editingTask}
      />
    </>
  );
}