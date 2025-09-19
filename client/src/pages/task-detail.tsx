import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Save, X, Circle, Target, FolderOpen, Calendar, User, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithDetails, GoalWithTasks, SafeTaskWithAssignee, SafeUser } from "@shared/schema";

export default function TaskDetail() {
  const [, params] = useRoute("/detail/task/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const taskId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<SafeTaskWithAssignee>>({});

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Find the task and its parent goal/project
  let task: SafeTaskWithAssignee | undefined;
  let parentGoal: GoalWithTasks | undefined;
  let parentProject: ProjectWithDetails | undefined;
  
  for (const project of (projects as ProjectWithDetails[]) || []) {
    for (const goal of project.goals || []) {
      const foundTask = goal.tasks?.find(t => t.id === taskId);
      if (foundTask) {
        task = foundTask;
        parentGoal = goal;
        parentProject = project;
        break;
      }
    }
    if (task) break;
  }

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<SafeTaskWithAssignee>) => {
      return await apiRequest("PUT", `/api/tasks/${taskId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditing(false);
      setEditedTask({});
      toast({
        title: "작업 수정 완료",
        description: "작업이 성공적으로 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "작업 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "작업 삭제 완료",
        description: "작업이 성공적으로 삭제되었습니다.",
      });
      setLocation("/list");
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "작업 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (Object.keys(editedTask).length > 0) {
      updateTaskMutation.mutate(editedTask);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTask({});
  };

  const handleProjectClick = () => {
    if (parentProject) {
      setLocation(`/detail/project/${parentProject.id}`);
    }
  };

  const handleGoalClick = () => {
    if (parentGoal) {
      setLocation(`/detail/goal/${parentGoal.id}`);
    }
  };

  const calculateDDay = (deadline: string | null): string => {
    if (!deadline) return '';
    
    const today = new Date();
    const deadlineDate = new Date(deadline);
    
    // Set time to midnight for accurate day calculation
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'D-Day';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "진행전":
        return "secondary" as const;
      case "진행중":
        return "default" as const;
      case "완료":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "높음": return "text-red-600";
      case "중간": return "text-yellow-600";
      case "낮음": return "text-green-600";
      default: return "text-muted-foreground";
    }
  };

  const handleDelete = () => {
    deleteTaskMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded"></div>
          <div className="h-64 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  if (!task || !parentGoal || !parentProject) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">작업을 찾을 수 없습니다</h1>
          <Button 
            className="mt-4"
            onClick={() => setLocation("/list")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/list")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
            <div className="flex items-center gap-2">
              <Circle className="h-6 w-6 text-orange-600" />
              <h1 className="text-2xl font-bold" data-testid="text-task-title">
                {task.title}
              </h1>
              <Badge variant={getStatusBadgeVariant(task.status)}>
                {task.status}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  onClick={handleSave}
                  disabled={updateTaskMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleCancel}
                  data-testid="button-cancel"
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      disabled={deleteTaskMutation.isPending}
                      data-testid="button-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>작업 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 이 작업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">취소</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDelete}
                        disabled={deleteTaskMutation.isPending}
                        data-testid="button-confirm-delete"
                      >
                        {deleteTaskMutation.isPending ? "삭제 중..." : "삭제"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button 
            onClick={handleProjectClick}
            className="hover:text-foreground transition-colors"
            data-testid="breadcrumb-project"
          >
            <div className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4" />
              {parentProject.name}
            </div>
          </button>
          <span>/</span>
          <button 
            onClick={handleGoalClick}
            className="hover:text-foreground transition-colors"
            data-testid="breadcrumb-goal"
          >
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {parentGoal.title}
            </div>
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">{task.title}</span>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>작업 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">작업 이름</label>
                  {isEditing ? (
                    <Input
                      value={editedTask.title ?? task.title}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1"
                      data-testid="input-task-title"
                    />
                  ) : (
                    <p className="mt-1 font-medium" data-testid="text-task-name">{task.title}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">설명</label>
                  {isEditing ? (
                    <Textarea
                      value={editedTask.description ?? task.description ?? ''}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      rows={3}
                      data-testid="textarea-task-description"
                    />
                  ) : (
                    <p className="mt-1" data-testid="text-task-description">
                      {task.description || "설명이 없습니다."}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">상태</label>
                    {isEditing ? (
                      <Select
                        value={editedTask.status ?? task.status}
                        onValueChange={(value) => setEditedTask(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-task-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="진행전">진행전</SelectItem>
                          <SelectItem value="진행중">진행중</SelectItem>
                          <SelectItem value="완료">완료</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1" data-testid="text-task-status">
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {task.status}
                        </Badge>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">우선순위</label>
                    {isEditing ? (
                      <Select
                        value={editedTask.priority ?? task.priority ?? '중간'}
                        onValueChange={(value) => setEditedTask(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-task-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="높음">높음</SelectItem>
                          <SelectItem value="중간">중간</SelectItem>
                          <SelectItem value="낮음">낮음</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className={`mt-1 font-medium ${getPriorityColor(task.priority)}`} data-testid="text-task-priority">
                        {task.priority || '중간'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">마감일</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedTask.deadline ?? task.deadline ?? ''}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, deadline: e.target.value }))}
                      className="mt-1"
                      data-testid="input-task-deadline"
                    />
                  ) : (
                    <div className="mt-1" data-testid="text-task-deadline">
                      {task.deadline ? (
                        <div className="flex items-center gap-2">
                          <span>{new Date(task.deadline).toLocaleDateString('ko-KR')}</span>
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            calculateDDay(task.deadline).includes('D+')
                              ? 'bg-red-100 text-red-700'
                              : calculateDDay(task.deadline) === 'D-Day'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {calculateDDay(task.deadline)}
                          </span>
                        </div>
                      ) : (
                        "설정되지 않음"
                      )}
                    </div>
                  )}
                </div>

                {task.label && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">라벨</label>
                    <p className="mt-1" data-testid="text-task-label">
                      <Badge variant="secondary">{task.label}</Badge>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle>진행도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold" data-testid="text-progress-percentage">
                      {task.progress ?? 0}%
                    </span>
                  </div>
                  <Progress 
                    value={task.progress ?? 0} 
                    className="h-3"
                    data-testid="progress-bar"
                  />
                  <div className="text-sm text-muted-foreground">
                    현재 작업 상태: {task.status}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignee */}
            <Card>
              <CardHeader>
                <CardTitle>담당자</CardTitle>
              </CardHeader>
              <CardContent>
                {task.assignee ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {task.assignee.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid="text-assignee-name">{task.assignee.name}</p>
                      <p className="text-sm text-muted-foreground">@{task.assignee.username}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">담당자가 지정되지 않았습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* Parent Info */}
            <Card>
              <CardHeader>
                <CardTitle>소속</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={handleProjectClick}
                  className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-parent-project"
                >
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">{parentProject.name}</p>
                    <p className="text-sm text-muted-foreground">{parentProject.code}</p>
                  </div>
                </button>

                <button
                  onClick={handleGoalClick}
                  className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-parent-goal"
                >
                  <Target className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{parentGoal.title}</p>
                    <p className="text-sm text-muted-foreground">목표</p>
                  </div>
                </button>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle>추가 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">생성일</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-created-date">
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">수정일</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-updated-date">
                    {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}