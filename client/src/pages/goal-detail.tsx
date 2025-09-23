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
import { ArrowLeft, Edit, Save, X, Target, Circle, FolderOpen, Plus, Trash2, Tag, Paperclip, Download, Clock, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { TaskModal } from "@/components/task-modal";

export default function GoalDetail() {
  const [, params] = useRoute("/detail/goal/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const goalId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<GoalWithTasks>>({});
  const [taskModalState, setTaskModalState] = useState<{ isOpen: boolean; goalId: string; goalTitle: string }>({ 
    isOpen: false, 
    goalId: '', 
    goalTitle: '' 
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id?: string; uploadURL: string; name: string; objectPath?: string }>>([]);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Find the goal and its parent project
  let goal: GoalWithTasks | undefined;
  let parentProject: ProjectWithDetails | undefined;
  
  for (const project of (projects as ProjectWithDetails[]) || []) {
    const foundGoal = project.goals?.find(g => g.id === goalId);
    if (foundGoal) {
      goal = foundGoal;
      parentProject = project;
      break;
    }
  }

  const updateGoalMutation = useMutation({
    mutationFn: async (updates: Partial<GoalWithTasks>) => {
      return await apiRequest("PUT", `/api/goals/${goalId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditing(false);
      setEditedGoal({});
      toast({
        title: "목표 수정 완료",
        description: "목표가 성공적으로 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "목표 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/goals/${goalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "목표 삭제 완료",
        description: "목표가 성공적으로 삭제되었습니다.",
      });
      setLocation("/list");
    },
    onError: (error: any) => {
      const errorMsg = error?.message || "목표 삭제 중 오류가 발생했습니다.";
      toast({
        title: "삭제 실패",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (Object.keys(editedGoal).length > 0) {
      updateGoalMutation.mutate(editedGoal);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedGoal({});
  };

  const handleTaskClick = (taskId: string) => {
    setLocation(`/detail/task/${taskId}`);
  };

  const handleProjectClick = () => {
    if (parentProject) {
      setLocation(`/detail/project/${parentProject.id}`);
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

  const handleAddTask = () => {
    setTaskModalState({
      isOpen: true,
      goalId: goal?.id || '',
      goalTitle: goal?.title || ''
    });
  };

  const handleDelete = () => {
    deleteGoalMutation.mutate();
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

  if (!goal || !parentProject) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">목표를 찾을 수 없습니다</h1>
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

  // Get assignees from goal.assignees or derive from assigneeIds
  const assignees = goal.assignees || (goal.assigneeIds ? goal.assigneeIds.map(id => (users as SafeUser[])?.find(u => u.id === id)).filter(Boolean) as SafeUser[] : []);

  // Calculate task statistics from goal tasks
  const goalTasksStats = goal?.tasks || [];
  const completedTasksStats = goalTasksStats.filter(task => task.status === '완료');
  const inProgressTasksStats = goalTasksStats.filter(task => task.status === '진행중');
  const pendingTasksStats = goalTasksStats.filter(task => task.status === '진행전');

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
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
              <div className="flex items-center gap-2 text-foreground">
                <Target className="h-5 w-5 text-green-600" />
                <h1 className="text-xl font-semibold" data-testid="text-goal-title">
                  {goal.title}
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
                disabled={updateGoalMutation.isPending}
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
                    disabled={deleteGoalMutation.isPending}
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
                        <div>[-] 목표를 삭제하시겠습니까?</div>
                        <div className="text-sm text-muted-foreground">
                          해당 목표의 모든 작업이 함께 삭제됩니다.
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

        {/* Goal Details */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>목표 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">목표 이름</label>
                  {isEditing ? (
                    <Input
                      value={editedGoal.title ?? goal.title}
                      onChange={(e) => setEditedGoal(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 h-10"
                      data-testid="input-goal-title"
                    />
                  ) : (
                    <p className="mt-1 font-medium" data-testid="text-goal-name">{goal.title}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">설명</label>
                  {isEditing ? (
                    <Textarea
                      value={editedGoal.description ?? goal.description ?? ''}
                      onChange={(e) => setEditedGoal(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      rows={3}
                      data-testid="textarea-goal-description"
                    />
                  ) : (
                    <p className="mt-1" data-testid="text-goal-description">
                      {goal.description || "설명이 없습니다."}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">라벨</label>
                  {isEditing ? (
                    <div className="mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <div 
                            className="cursor-pointer hover:bg-muted/20 rounded-md min-w-16 h-10 flex items-center px-2 py-1 gap-1 flex-wrap bg-background border border-input"
                            data-testid={`edit-labels-${goal.id}`}
                          >
                            {(editedGoal.labels ?? goal.labels ?? []).length > 0 ? (
                              (editedGoal.labels ?? goal.labels ?? []).map((label, index) => (
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
                            {(editedGoal.labels ?? goal.labels ?? []).length < 2 && (
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
                                      const currentLabels = editedGoal.labels ?? goal.labels ?? [];
                                      if (newLabel && newLabel.length <= 5 && currentLabels.length < 2) {
                                        const updatedLabels = [...currentLabels, newLabel];
                                        setEditedGoal(prev => ({ ...prev, labels: updatedLabels }));
                                        target.value = '';
                                      }
                                    }
                                  }}
                                    data-testid={`input-new-label-${goal.id}`}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground">최대 5글자</div>
                              </div>
                            )}
                            
                            {/* 기존 라벨 목록 */}
                            {(editedGoal.labels ?? goal.labels ?? []).length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">현재 라벨</div>
                                {(editedGoal.labels ?? goal.labels ?? []).map((label, index) => (
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
                                        const currentLabels = editedGoal.labels ?? goal.labels ?? [];
                                        const updatedLabels = currentLabels.filter((_, i) => i !== index);
                                        setEditedGoal(prev => ({ ...prev, labels: updatedLabels }));
                                      }}
                                      className="h-6 w-6 p-0"
                                      data-testid={`button-remove-label-${goal.id}-${index}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {(editedGoal.labels ?? goal.labels ?? []).length >= 2 && (
                              <div className="text-xs text-muted-foreground text-center">
                                최대 2개의 라벨을 사용할 수 있습니다.
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : (
                    <div className="mt-1" data-testid="text-goal-labels">
                      {(goal.labels && goal.labels.length > 0) ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {goal.labels.map((label, index) => (
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
                  <label className="text-sm font-medium text-muted-foreground">상태</label>
                  <p className="mt-1" data-testid="text-goal-status">
                    <Badge variant={goal.status === '완료' ? 'default' : 'secondary'}>
                      {goal.status}
                    </Badge>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">마감일</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedGoal.deadline ?? goal.deadline ?? ''}
                      onChange={(e) => setEditedGoal(prev => ({ ...prev, deadline: e.target.value }))}
                      className="mt-1 h-10"
                      data-testid="input-goal-deadline"
                    />
                  ) : (
                    <div className="mt-1" data-testid="text-goal-deadline">
                      {goal.deadline ? (
                        <div className="flex items-center gap-2">
                          <span>{new Date(goal.deadline).toLocaleDateString('ko-KR')}</span>
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            calculateDDay(goal.deadline).includes('D+')
                              ? 'bg-red-100 text-red-700'
                              : calculateDDay(goal.deadline) === 'D-Day'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {calculateDDay(goal.deadline)}
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
                                    const objectPath = file.objectPath || file.uploadURL;
                                    const response = await fetch(`/api/objects/${objectPath}`);
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
                                onClick={() => {
                                  setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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

            {/* Tasks - Hidden when editing */}
            {!isEditing && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>작업 ({goal.tasks?.length || 0}개)</CardTitle>
                    <Button 
                      onClick={handleAddTask}
                      size="sm"
                      data-testid="button-add-task"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      작업 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto" data-testid="tasks-content-container">
                  {goal.tasks && goal.tasks.length > 0 ? (
                    <div className="space-y-3">
                      {goal.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleTaskClick(task.id)}
                          data-testid={`card-task-${task.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Circle className="h-4 w-4 text-orange-600" />
                              <div>
                                <h4 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                                  {task.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    variant={task.status === '완료' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {task.status}
                                  </Badge>
                                  {task.assignees && task.assignees.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Avatar className="h-4 w-4">
                                        <AvatarFallback className="text-xs">
                                          {task.assignees[0].initials}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground">
                                        {task.assignees[0].name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {task.progress ?? 0}%
                              </div>
                              <Progress 
                                value={task.progress ?? 0} 
                                className="w-20 h-2 mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">작업이 없습니다.</p>
                      <Button onClick={handleAddTask} data-testid="button-add-first-task">
                        <Plus className="h-4 w-4 mr-2" />
                        첫 번째 작업 추가
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
                      {goal.progressPercentage || 0}%
                    </span>
                  </div>
                  <Progress 
                    value={goal.progressPercentage || 0} 
                    className="h-3"
                    data-testid="progress-bar"
                  />
                  <div className="text-sm text-muted-foreground">
                    전체 작업 {goal.totalTasks || 0}개 중 {goal.completedTasks || 0}개 완료
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignees */}
            <Card>
              <CardHeader>
                <CardTitle>담당자 ({goal.assignees?.length || 0}명)</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">담당자 선택</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Array.isArray(users) ? (users as SafeUser[]).map((user) => {
                        const currentAssigneeIds = editedGoal.assigneeIds ?? goal.assigneeIds ?? [];
                        const isSelected = currentAssigneeIds.includes(user.id);
                        
                        return (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`assignee-${user.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const currentIds = editedGoal.assigneeIds ?? goal.assigneeIds ?? [];
                                let newIds: string[];
                                
                                if (checked) {
                                  newIds = [...currentIds, user.id];
                                } else {
                                  newIds = currentIds.filter(id => id !== user.id);
                                }
                                
                                setEditedGoal(prev => ({ ...prev, assigneeIds: newIds }));
                              }}
                              data-testid={`checkbox-assignee-${user.id}`}
                            />
                            <label
                              htmlFor={`assignee-${user.id}`}
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
                  assignees && assignees.length > 0 ? (
                    <div className="space-y-2">
                      {assignees.map((assignee, index) => (
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

            {/* Parent Project */}
            <Card>
              <CardHeader>
                <CardTitle>소속 프로젝트</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">전체 작업</span>
                  <span className="font-medium" data-testid="text-total-tasks">
                    {goal.totalTasks || 0}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">완료된 작업</span>
                  <span className="font-medium text-green-600" data-testid="text-completed-tasks">
                    {completedTasksStats.length}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">진행중 작업</span>
                  <span className="font-medium text-blue-600" data-testid="text-inprogress-tasks">
                    {inProgressTasksStats.length}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">진행전 작업</span>
                  <span className="font-medium text-gray-600" data-testid="text-pending-tasks">
                    {pendingTasksStats.length}개
                  </span>
                </div>
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
                  <p className="mt-1 text-sm" data-testid="text-goal-created-by">
                    {(() => {
                      if (!goal.createdBy) return "알 수 없음";
                      const user = (users as SafeUser[])?.find((u: SafeUser) => u.id === goal.createdBy || u.username === goal.createdBy);
                      return user?.name || goal.createdBy;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-goal-created-at">
                    {goal.createdAt ? (() => {
                      const date = new Date(goal.createdAt);
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
                  <p className="mt-1 text-sm" data-testid="text-goal-updated-by">
                    {(() => {
                      if (!goal.lastUpdatedBy) return "알 수 없음";
                      const user = (users as SafeUser[])?.find((u: SafeUser) => u.id === goal.lastUpdatedBy || u.username === goal.lastUpdatedBy);
                      return user?.name || goal.lastUpdatedBy;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-goal-updated-at">
                    {goal.updatedAt ? (() => {
                      const date = new Date(goal.updatedAt);
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
      
      {/* Task Modal */}
      <TaskModal 
        isOpen={taskModalState.isOpen}
        onClose={() => setTaskModalState({ isOpen: false, goalId: '', goalTitle: '' })}
        goalId={taskModalState.goalId}
        goalTitle={taskModalState.goalTitle}
      />
    </>
  );
}