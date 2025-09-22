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
import { ArrowLeft, Edit, Save, X, FolderOpen, Target, Circle, Plus, Trash2, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithDetails, SafeUser } from "@shared/schema";
import { GoalModal } from "@/components/goal-modal";

export default function ProjectDetail() {
  const [, params] = useRoute("/detail/project/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const projectId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<ProjectWithDetails>>({});
  const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean; projectId: string; projectTitle: string }>({ 
    isOpen: false, 
    projectId: '', 
    projectTitle: '' 
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const project = (projects as ProjectWithDetails[])?.find(p => p.id === projectId);

  // Calculate statistics from goal tasks only (no direct project tasks)
  const goalTasks = project?.goals?.flatMap(goal => goal.tasks || []) || [];
  const calculatedCompletedTasks = goalTasks.filter(task => task.status === '완료');
  const calculatedInProgressTasks = goalTasks.filter(task => task.status === '진행중');
  const calculatedPendingTasks = goalTasks.filter(task => task.status === '진행전');

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Partial<ProjectWithDetails>) => {
      return await apiRequest("PUT", `/api/projects/${projectId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditing(false);
      setEditedProject({});
      toast({
        title: "프로젝트 수정 완료",
        description: "프로젝트가 성공적으로 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "프로젝트 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "프로젝트 삭제 완료",
        description: "프로젝트가 성공적으로 삭제되었습니다.",
      });
      setLocation("/list");
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "프로젝트 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (Object.keys(editedProject).length > 0) {
      updateProjectMutation.mutate(editedProject);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProject({});
  };

  const handleGoalClick = (goalId: string) => {
    setLocation(`/detail/goal/${goalId}`);
  };

  const handleTaskClick = (taskId: string) => {
    setLocation(`/detail/task/${taskId}`);
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

  const handleAddGoal = () => {
    setGoalModalState({
      isOpen: true,
      projectId: project?.id || '',
      projectTitle: project?.name || ''
    });
  };

  const handleDelete = () => {
    deleteProjectMutation.mutate();
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

  if (!project) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">프로젝트를 찾을 수 없습니다</h1>
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
              <FolderOpen className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold" data-testid="text-project-title">
                {project.name}
              </h1>
              <Badge variant="outline">{project.code}</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  onClick={handleSave}
                  disabled={updateProjectMutation.isPending}
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
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      disabled={deleteProjectMutation.isPending}
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
                          <div>[-] 프로젝트를 삭제하시겠습니까?</div>
                          <div className="text-sm text-muted-foreground">
                            해당 프로젝트의 모든 목표와 작업이 함께 삭제됩니다.
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
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">프로젝트 이름</label>
                  {isEditing ? (
                    <Input
                      value={editedProject.name ?? project.name}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                      data-testid="input-project-name"
                    />
                  ) : (
                    <p className="mt-1 font-medium" data-testid="text-project-name">{project.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">코드</label>
                  {isEditing ? (
                    <Input
                      value={editedProject.code ?? project.code}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, code: e.target.value }))}
                      className="mt-1"
                      data-testid="input-project-code"
                    />
                  ) : (
                    <p className="mt-1 font-medium" data-testid="text-project-code">{project.code}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">설명</label>
                  {isEditing ? (
                    <Textarea
                      value={editedProject.description ?? project.description ?? ''}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      rows={3}
                      data-testid="textarea-project-description"
                    />
                  ) : (
                    <p className="mt-1" data-testid="text-project-description">
                      {project.description || "설명이 없습니다."}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">라벨</label>
                  <div className="mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div 
                          className="cursor-pointer hover:bg-muted/20 rounded-md min-w-16 min-h-8 flex items-center px-2 py-1 gap-1 flex-wrap border border-dashed border-muted-foreground/30"
                          data-testid={`edit-labels-${project.id}`}
                        >
                          {(project.labels && project.labels.length > 0) ? (
                            project.labels.map((label, index) => (
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
                          {(!project.labels || project.labels.length < 2) && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="새 라벨 입력"
                                className="flex-1 h-8"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const target = e.target as HTMLInputElement;
                                    const newLabel = target.value.trim();
                                    if (newLabel && newLabel.length <= 5 && (!project.labels || project.labels.length < 2)) {
                                      const updatedLabels = [...(project.labels || []), newLabel];
                                      updateProjectMutation.mutate({ labels: updatedLabels });
                                      target.value = '';
                                    }
                                  }
                                }}
                                data-testid={`input-new-label-${project.id}`}
                              />
                            </div>
                          )}
                          
                          {/* 기존 라벨 목록 */}
                          {project.labels && project.labels.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground">현재 라벨</div>
                              {project.labels.map((label, index) => (
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
                                      const updatedLabels = project.labels!.filter((_, i) => i !== index);
                                      updateProjectMutation.mutate({ labels: updatedLabels });
                                    }}
                                    className="h-6 w-6 p-0"
                                    data-testid={`button-remove-label-${project.id}-${index}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {project.labels && project.labels.length >= 2 && (
                            <div className="text-xs text-muted-foreground text-center">
                              최대 2개의 라벨을 사용할 수 있습니다.
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">상태</label>
                  {isEditing ? (
                    <Select
                      value={editedProject.status ?? project.status ?? "진행전"}
                      onValueChange={(value) => setEditedProject(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-project-status">
                        <SelectValue placeholder="상태를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="진행전">진행전</SelectItem>
                        <SelectItem value="진행중">진행중</SelectItem>
                        <SelectItem value="완료">완료</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge 
                        variant={
                          project.status === "완료" ? "default" : 
                          project.status === "진행중" ? "secondary" : 
                          "outline"
                        }
                        data-testid="badge-project-status"
                      >
                        {project.status ?? "진행전"}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">마감일</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedProject.deadline ?? project.deadline ?? ''}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, deadline: e.target.value }))}
                      className="mt-1"
                      data-testid="input-project-deadline"
                    />
                  ) : (
                    <div className="mt-1" data-testid="text-project-deadline">
                      {project.deadline ? (
                        <div className="flex items-center gap-2">
                          <span>{new Date(project.deadline).toLocaleDateString('ko-KR')}</span>
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            calculateDDay(project.deadline).includes('D+')
                              ? 'bg-red-100 text-red-700'
                              : calculateDDay(project.deadline) === 'D-Day'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {calculateDDay(project.deadline)}
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

            {/* Goals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>목표 ({project.goals?.length || 0}개)</CardTitle>
                  <Button 
                    onClick={handleAddGoal}
                    size="sm"
                    data-testid="button-add-goal"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    목표 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto" data-testid="goals-content-container">
                {project.goals && project.goals.length > 0 ? (
                  <div className="space-y-3">
                    {project.goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleGoalClick(goal.id)}
                        data-testid={`card-goal-${goal.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-green-600" />
                            <div>
                              <h4 className="font-medium" data-testid={`text-goal-title-${goal.id}`}>
                                {goal.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                작업 {goal.totalTasks || 0}개 · 완료 {goal.completedTasks || 0}개
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{goal.progressPercentage || 0}%</div>
                            <Progress 
                              value={goal.progressPercentage || 0} 
                              className="w-20 h-2 mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">목표가 없습니다.</p>
                    <Button onClick={handleAddGoal} data-testid="button-add-first-goal">
                      <Plus className="h-4 w-4 mr-2" />
                      첫 번째 목표 추가
                    </Button>
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
                      {goalTasks.length > 0 ? Math.round((calculatedCompletedTasks.length / goalTasks.length) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={goalTasks.length > 0 ? Math.round((calculatedCompletedTasks.length / goalTasks.length) * 100) : 0} 
                    className="h-3"
                    data-testid="progress-bar"
                  />
                  <div className="text-sm text-muted-foreground">
                    전체 작업 {goalTasks.length}개 중 {calculatedCompletedTasks.length}개 완료
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Owners */}
            <Card>
              <CardHeader>
                <CardTitle>담당자 ({project.owners?.length || 0}명)</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">담당자 선택</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Array.isArray(users) ? (users as SafeUser[]).map((user) => {
                        const currentOwnerIds = editedProject.ownerIds ?? project.ownerIds ?? [];
                        const isSelected = currentOwnerIds.includes(user.id);
                        
                        return (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`owner-${user.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const currentIds = editedProject.ownerIds ?? project.ownerIds ?? [];
                                let newIds: string[];
                                
                                if (checked) {
                                  newIds = [...currentIds, user.id];
                                } else {
                                  newIds = currentIds.filter(id => id !== user.id);
                                }
                                
                                setEditedProject(prev => ({ ...prev, ownerIds: newIds }));
                              }}
                              data-testid={`checkbox-owner-${user.id}`}
                            />
                            <label
                              htmlFor={`owner-${user.id}`}
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
                  project.owners && project.owners.length > 0 ? (
                    <div className="space-y-2">
                      {project.owners.map((owner, index) => (
                        <div key={owner.id} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {owner.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium" data-testid={`text-owner-name-${index}`}>{owner.name}</p>
                            <p className="text-sm text-muted-foreground">@{owner.username}</p>
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

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">목표 수</span>
                  <span className="font-medium" data-testid="text-goals-count">
                    {project.goals?.length || 0}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">전체 작업</span>
                  <span className="font-medium" data-testid="text-total-tasks">
                    {goalTasks.length}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">완료된 작업</span>
                  <span className="font-medium text-green-600" data-testid="text-completed-tasks">
                    {calculatedCompletedTasks.length}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">진행중 작업</span>
                  <span className="font-medium text-blue-600" data-testid="text-inprogress-tasks">
                    {calculatedInProgressTasks.length}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">진행전 작업</span>
                  <span className="font-medium text-gray-600" data-testid="text-pending-tasks">
                    {calculatedPendingTasks.length}개
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Goal Modal */}
      <GoalModal 
        isOpen={goalModalState.isOpen}
        onClose={() => setGoalModalState({ isOpen: false, projectId: '', projectTitle: '' })}
        projectId={goalModalState.projectId}
        projectTitle={goalModalState.projectTitle}
      />
    </div>
  );
}