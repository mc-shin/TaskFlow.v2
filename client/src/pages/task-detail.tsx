import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Save, X, Circle, Target, FolderOpen, Calendar, User, Clock, Trash2, Tag, Paperclip, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithDetails, GoalWithTasks, SafeTaskWithAssignees, SafeUser } from "@shared/schema";
import { Comments } from "@/components/comments";

export default function TaskDetail() {
  const [, params] = useRoute("/detail/task/:id");
  const [, setLocation] = useLocation();
  
  // Helper function to get back URL based on where user came from
  const getBackUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    return from === 'kanban' ? '/kanban' : '/list';
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const taskId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<SafeTaskWithAssignees>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ uploadURL: string; name: string; objectPath: string }>>([]);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Find the task and its parent goal/project
  let task: SafeTaskWithAssignees | undefined;
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
    mutationFn: async (updates: Partial<SafeTaskWithAssignees>) => {
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
      case "이슈":
        return "issue" as const;
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
    setDeleteDialogOpen(false);
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
            onClick={() => setLocation(getBackUrl())}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(getBackUrl())}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button 
                onClick={handleProjectClick}
                className="hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="breadcrumb-project"
              >
                <FolderOpen className="h-4 w-4" />
                {parentProject.name}
              </button>
              <span>/</span>
              <button 
                onClick={handleGoalClick}
                className="hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="breadcrumb-goal"
              >
                <Target className="h-4 w-4" />
                {parentGoal.title}
              </button>
              <span>/</span>
              <div className="flex items-center gap-2 text-foreground">
                <Circle className="h-5 w-5 text-orange-600" />
                <h1 className="text-xl font-semibold" data-testid="text-task-title">
                  {task.title}
                </h1>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 min-w-[160px] justify-end">
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
                className="w-[89.77px] h-[40px]"
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
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                    <AlertDialogTitle>app.riido.io 내용:</AlertDialogTitle>
                    <AlertDialogDescription className="text-left">
                      <div className="space-y-2">
                        <div>[-] 작업을 삭제하시겠습니까?</div>
                        <div className="text-sm text-muted-foreground">
                          삭제된 작업은 복구할 수 없습니다.
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-blue-600 hover:bg-blue-700">
                      확인
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
              </>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        <div className="max-w-4xl mx-auto space-y-6">

        {/* Task Details */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
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
                      className="mt-1 h-10"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">라벨</label>
                    {isEditing ? (
                      <div className="mt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <div 
                              className="cursor-pointer hover:bg-muted/20 rounded-md min-w-16 h-10 flex items-center px-2 py-1 gap-1 flex-wrap bg-background border border-input"
                              data-testid={`edit-labels-${task.id}`}
                            >
                              {(editedTask.labels ?? task.labels ?? []).length > 0 ? (
                                (editedTask.labels ?? task.labels ?? []).map((label, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="outline" 
                                    className={`text-xs ${index === 0 ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                                  >
                                    {label}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  라벨 추가
                                </span>
                              )}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="start">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">라벨 편집 (최대 2개)</h4>
                              
                              {/* 입력 필드 */}
                              {(editedTask.labels ?? task.labels ?? []).length < 2 && (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="새 라벨 입력 (최대 5글자)"
                                      className="flex-1 h-8"
                                      maxLength={5}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const target = e.target as HTMLInputElement;
                                        const newLabel = target.value.trim();
                                        const currentLabels = editedTask.labels ?? task.labels ?? [];
                                        if (newLabel && newLabel.length <= 5 && currentLabels.length < 2) {
                                          const updatedLabels = [...currentLabels, newLabel];
                                          setEditedTask(prev => ({ ...prev, labels: updatedLabels }));
                                          target.value = '';
                                        }
                                      }
                                    }}
                                      data-testid={`input-new-label-${task.id}`}
                                    />
                                  </div>
                                  <div className="text-xs text-muted-foreground">최대 5글자</div>
                                </div>
                              )}
                              
                              {/* 기존 라벨 목록 */}
                              {(editedTask.labels ?? task.labels ?? []).length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs text-muted-foreground">현재 라벨</div>
                                  {(editedTask.labels ?? task.labels ?? []).map((label, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                                    >
                                      <Badge variant="outline" className="text-xs">
                                        {label}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const currentLabels = editedTask.labels ?? task.labels ?? [];
                                          const updatedLabels = currentLabels.filter((_, i) => i !== index);
                                          setEditedTask(prev => ({ ...prev, labels: updatedLabels }));
                                        }}
                                        className="h-6 w-6 p-0"
                                        data-testid={`button-remove-label-${task.id}-${index}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {(editedTask.labels ?? task.labels ?? []).length >= 2 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  최대 2개의 라벨을 사용할 수 있습니다.
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <div className="mt-1" data-testid="text-task-labels">
                        {(task.labels && task.labels.length > 0) ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {task.labels.map((label, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className={`text-xs ${index === 0 ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                              >
                                {label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">라벨이 없습니다</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">우선순위</label>
                    {isEditing ? (
                      <Select
                        value={editedTask.priority ?? task.priority ?? '중간'}
                        onValueChange={(value) => setEditedTask(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger className="mt-1 h-10" data-testid="select-task-priority">
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
                  <label className="text-sm font-medium text-muted-foreground">상태</label>
                  {isEditing ? (
                    <Select
                      value={editedTask.status ?? task.status ?? "진행전"}
                      onValueChange={(value) => setEditedTask(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="mt-1 h-10" data-testid="select-task-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="진행전">진행전</SelectItem>
                        <SelectItem value="진행중">진행중</SelectItem>
                        <SelectItem value="완료">완료</SelectItem>
                        <SelectItem value="이슈">이슈</SelectItem>
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
                  <label className="text-sm font-medium text-muted-foreground">마감일</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedTask.deadline ?? task.deadline ?? ''}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, deadline: e.target.value }))}
                      className="mt-1 h-10"
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

              </CardContent>
            </Card>
            
            {/* File Attachments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  파일 첨부
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={52428800} // 50MB
                    onGetUploadParameters={async () => {
                      const response = await fetch('/api/objects/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      const data = await response.json();
                      return { method: 'PUT' as const, url: data.uploadURL, objectPath: data.objectPath };
                    }}
                    onComplete={(result) => {
                      if (result.successful.length > 0) {
                        setAttachedFiles(prev => [...prev, ...result.successful]);
                        toast({
                          title: "파일 업로드 완료",
                          description: `${result.successful.length}개의 파일이 업로드되었습니다.`
                        });
                      }
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors" data-testid="button-upload-file">
                      <Paperclip className="h-4 w-4" />
                      <span>파일을 선택하거나 드래그해서 업로드하세요</span>
                    </div>
                  </ObjectUploader>
                  <p className="text-xs text-muted-foreground">
                    최대 5개 파일, 각각 50MB까지 업로드 가능합니다.
                  </p>
                  
                  {/* 업로드된 파일 목록 */}
                  {attachedFiles.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <h4 className="text-sm font-medium mb-2">첨부된 파일 ({attachedFiles.length}개)</h4>
                      <div className="space-y-2">
                        {attachedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium truncate">{file.name}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(file.objectPath);
                                    if (response.ok) {
                                      const blob = await response.blob();
                                      const link = document.createElement('a');
                                      link.href = URL.createObjectURL(blob);
                                      link.download = file.name;
                                      link.click();
                                      URL.revokeObjectURL(link.href);
                                    }
                                  } catch (error) {
                                    console.error('Download failed:', error);
                                    toast({
                                      title: "다운로드 실패",
                                      description: "파일 다운로드 중 오류가 발생했습니다.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                className="h-8 w-8 p-0"
                                data-testid={`button-download-file-${index}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api${file.objectPath}`, { method: 'DELETE' });
                                    if (response.ok) {
                                      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
                                      toast({
                                        title: "파일 삭제 완료",
                                        description: "파일이 성공적으로 삭제되었습니다.",
                                      });
                                    } else {
                                      throw new Error('Delete failed');
                                    }
                                  } catch (error) {
                                    console.error('Delete failed:', error);
                                    toast({
                                      title: "삭제 실패",
                                      description: "파일 삭제 중 오류가 발생했습니다.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                data-testid={`button-remove-file-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Comments Section */}
            <Comments 
              entityType="task" 
              entityId={taskId || ""} 
              currentUser={(users as SafeUser[])?.[0]}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle>진행도</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">진행도 설정</span>
                    </div>
                    <Select 
                      value={(editedTask.progress ?? task.progress ?? 0).toString()}
                      onValueChange={(value) => {
                        const progressValue = parseInt(value);
                        const currentStatus = editedTask.status ?? task.status;
                        
                        // "이슈" 상태는 진행률 변경으로 덮어쓰지 않음
                        if (currentStatus === '이슈') {
                          setEditedTask(prev => ({ 
                            ...prev, 
                            progress: progressValue
                          }));
                        } else {
                          let finalStatus: string;
                          
                          if (progressValue === 0) {
                            finalStatus = '진행전';
                          } else if (progressValue === 100) {
                            finalStatus = '완료';
                          } else {
                            finalStatus = '진행중';
                          }
                          
                          setEditedTask(prev => ({ 
                            ...prev, 
                            progress: progressValue, 
                            status: finalStatus 
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10" data-testid="select-task-progress">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => i * 10).map((option) => (
                          <SelectItem key={option} value={option.toString()}>
                            {option}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Progress 
                      value={editedTask.progress ?? task.progress ?? 0} 
                      className="h-3"
                      data-testid="progress-bar-edit"
                    />
                    <div className="text-sm text-muted-foreground">
                      {(editedTask.status ?? task.status) === '이슈' 
                        ? '이슈 상태는 진행도와 독립적으로 관리됩니다' 
                        : '진행도에 따라 상태가 자동으로 설정됩니다'}
                    </div>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Assignees */}
            <Card>
              <CardHeader>
                <CardTitle>담당자 ({task.assignees?.length || 0}명)</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">담당자 선택</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Array.isArray(users) ? (users as SafeUser[]).map((user) => {
                        const currentAssigneeIds = editedTask.assigneeIds ?? task.assigneeIds ?? [];
                        const isSelected = currentAssigneeIds.includes(user.id);
                        
                        return (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`task-assignee-${user.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const currentIds = editedTask.assigneeIds ?? task.assigneeIds ?? [];
                                let newIds: string[];
                                
                                if (checked) {
                                  newIds = [...currentIds, user.id];
                                } else {
                                  newIds = currentIds.filter(id => id !== user.id);
                                }
                                
                                setEditedTask(prev => ({ ...prev, assigneeIds: newIds }));
                              }}
                              data-testid={`checkbox-task-assignee-${user.id}`}
                            />
                            <label
                              htmlFor={`task-assignee-${user.id}`}
                              className="flex items-center gap-2 cursor-pointer flex-1 p-2 rounded hover:bg-muted/50"
                            >
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {user.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user.name}</span>
                            </label>
                          </div>
                        );
                      }) : null}
                    </div>
                  </div>
                ) : (
                  task.assignees && task.assignees.length > 0 ? (
                    <div className="space-y-2">
                      {task.assignees.map((assignee, index) => (
                        <div key={assignee.id} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {assignee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium" data-testid={`text-assignee-name-${index}`}>{assignee.name}</p>
                            <p className="text-sm text-muted-foreground">@{assignee.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">담당자가 지정되지 않았습니다.</p>
                  )
                )}
              </CardContent>
            </Card>


            {/* Audit Trail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  변경 이력
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    생성자
                  </label>
                  <p className="mt-1 text-sm" data-testid="text-task-created-by">
                    {(() => {
                      if (!task.createdBy) return "알 수 없음";
                      const user = (users as SafeUser[])?.find((u: SafeUser) => u.id === task.createdBy || u.username === task.createdBy);
                      return user?.name || task.createdBy;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-task-created-at">
                    {task.createdAt ? (() => {
                      const date = new Date(task.createdAt);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hour = String(date.getHours()).padStart(2, '0');
                      const minute = String(date.getMinutes()).padStart(2, '0');
                      return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
                    })() : '알 수 없음'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    최종 편집자
                  </label>
                  <p className="mt-1 text-sm" data-testid="text-task-updated-by">
                    {(() => {
                      if (!task.lastUpdatedBy) return "알 수 없음";
                      const user = (users as SafeUser[])?.find((u: SafeUser) => u.id === task.lastUpdatedBy || u.username === task.lastUpdatedBy);
                      return user?.name || task.lastUpdatedBy;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-task-updated-at">
                    {task.updatedAt ? (() => {
                      const date = new Date(task.updatedAt);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hour = String(date.getHours()).padStart(2, '0');
                      const minute = String(date.getMinutes()).padStart(2, '0');
                      return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
                    })() : '알 수 없음'}
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
        </div>
      </main>
    </>
  );
}