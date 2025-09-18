import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, Plus, Calendar, User, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import type { SafeTaskWithAssignee, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { ProjectModal } from "@/components/project-modal";
import { GoalModal } from "@/components/goal-modal";
import { TaskModal } from "@/components/task-modal";
import { apiRequest } from "@/lib/queryClient";

export default function ListTree() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSelectionToast, setShowSelectionToast] = useState(false);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean; projectId: string; projectTitle: string }>({ 
    isOpen: false, 
    projectId: '', 
    projectTitle: '' 
  });
  const [taskModalState, setTaskModalState] = useState<{ isOpen: boolean; goalId: string; goalTitle: string }>({ 
    isOpen: false, 
    goalId: '', 
    goalTitle: '' 
  });

  // Inline editing state
  const [editingField, setEditingField] = useState<{ itemId: string; field: string; type: 'project' | 'goal' | 'task' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Get users for assignee dropdown
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const queryClient = useQueryClient();
  
  // Show/hide toast based on selection
  useEffect(() => {
    setShowSelectionToast(selectedItems.size > 0);
  }, [selectedItems.size]);
  
  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };
  
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };
  
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };
  
  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Inline editing functions
  const startEditing = (itemId: string, field: string, type: 'project' | 'goal' | 'task', currentValue: string) => {
    setEditingField({ itemId, field, type });
    setEditingValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditingValue('');
  };

  // Mutations for updating items
  const updateProjectMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/projects/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/goals/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/tasks/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const saveEdit = () => {
    if (!editingField) return;
    
    const updates: any = {};
    
    if (editingField.field === 'deadline') {
      updates.deadline = editingValue;
    } else if (editingField.field === 'assignee') {
      if (editingField.type === 'project') {
        updates.ownerId = editingValue === 'none' ? null : editingValue;
      } else {
        updates.assigneeId = editingValue === 'none' ? null : editingValue;
      }
    } else if (editingField.field === 'status') {
      updates.status = editingValue;
    } else if (editingField.field === 'progress') {
      // Progress is calculated, not directly editable for projects/goals
      if (editingField.type === 'task') {
        updates.status = parseInt(editingValue) === 100 ? '완료' : '진행중';
      }
    } else if (editingField.field === 'importance') {
      if (editingField.type === 'task') {
        updates.priority = editingValue;
      }
      // Projects and goals don't have importance in the schema
    }

    if (editingField.type === 'project') {
      updateProjectMutation.mutate({ id: editingField.itemId, updates });
    } else if (editingField.type === 'goal') {
      updateGoalMutation.mutate({ id: editingField.itemId, updates });
    } else if (editingField.type === 'task') {
      updateTaskMutation.mutate({ id: editingField.itemId, updates });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Render functions for editable fields
  const renderEditableDeadline = (itemId: string, type: 'project' | 'goal' | 'task', deadline: string | null) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'deadline';
    
    if (isEditing) {
      return (
        <Input
          type="date"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={saveEdit}
          className="h-6 text-xs"
          autoFocus
          data-testid={`edit-deadline-${itemId}`}
        />
      );
    }
    
    return (
      <div 
        className="cursor-pointer hover:bg-muted/20 px-1 py-1 rounded text-sm"
        onClick={() => startEditing(itemId, 'deadline', type, deadline || '')}
        data-testid={`text-${type}-deadline-${itemId}`}
      >
        {formatDeadline(deadline)}
      </div>
    );
  };

  const renderEditableAssignee = (itemId: string, type: 'project' | 'goal' | 'task', assignee: SafeUser | null, ownerId?: string | null) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'assignee';
    const currentUserId = type === 'project' ? ownerId : assignee?.id;
    
    if (isEditing) {
      return (
        <Select value={editingValue} onValueChange={(value) => {
          setEditingValue(value);
          const updates: any = {};
          if (type === 'project') {
            updates.ownerId = value === 'none' ? null : value;
          } else {
            updates.assigneeId = value === 'none' ? null : value;
          }
          
          if (type === 'project') {
            updateProjectMutation.mutate({ id: itemId, updates });
          } else if (type === 'goal') {
            updateGoalMutation.mutate({ id: itemId, updates });
          } else {
            updateTaskMutation.mutate({ id: itemId, updates });
          }
          cancelEditing();
        }}>
          <SelectTrigger className="h-6 text-xs" data-testid={`edit-assignee-${itemId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">담당자 없음</span>
            </SelectItem>
            {(users as SafeUser[])?.map(user => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <div 
        className="cursor-pointer hover:bg-muted/20 px-1 py-1 rounded"
        onClick={() => startEditing(itemId, 'assignee', type, currentUserId || 'none')}
      >
        {assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{assignee.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">담당자 없음</span>
        )}
      </div>
    );
  };

  const renderEditableStatus = (itemId: string, type: 'project' | 'goal' | 'task', status: string) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'status';
    
    if (isEditing) {
      return (
        <Select value={editingValue} onValueChange={(value) => {
          setEditingValue(value);
          updateTaskMutation.mutate({ id: itemId, updates: { status: value } });
          cancelEditing();
        }}>
          <SelectTrigger className="h-6 text-xs" data-testid={`edit-status-${itemId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="진행전">진행전</SelectItem>
            <SelectItem value="진행중">진행중</SelectItem>
            <SelectItem value="완료">완료</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <Badge 
        variant={getStatusBadgeVariant(status)} 
        className="text-xs cursor-pointer hover:opacity-80"
        onClick={() => startEditing(itemId, 'status', type, status)}
      >
        {status}
      </Badge>
    );
  };

  const renderEditableProgress = (itemId: string, type: 'project' | 'goal' | 'task', progress: number, status?: string) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'progress';
    
    if (isEditing && type === 'task') {
      return (
        <Input
          type="number"
          min="0"
          max="100"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={saveEdit}
          className="h-6 text-xs w-16"
          autoFocus
          data-testid={`edit-progress-${itemId}`}
        />
      );
    }
    
    return (
      <div 
        className={`flex items-center gap-2 ${type === 'task' ? 'cursor-pointer hover:bg-muted/20 px-1 py-1 rounded' : ''}`}
        onClick={type === 'task' ? () => startEditing(itemId, 'progress', type, status === '완료' ? '100' : '50') : undefined}
      >
        <Progress value={progress} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8">
          {progress}%
        </span>
      </div>
    );
  };

  const renderEditableImportance = (itemId: string, type: 'project' | 'goal' | 'task', importance: string) => {
    const isEditing = editingField?.itemId === itemId && editingField?.field === 'importance';
    
    if (isEditing && type === 'task') {
      return (
        <Select value={editingValue} onValueChange={setEditingValue}>
          <SelectTrigger className="h-6 text-xs" data-testid={`edit-importance-${itemId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="높음">높음</SelectItem>
            <SelectItem value="중간">중간</SelectItem>
            <SelectItem value="낮음">낮음</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <Badge 
        variant={getImportanceBadgeVariant(importance)} 
        className={`text-xs ${type === 'task' ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={type === 'task' ? () => startEditing(itemId, 'importance', type, importance) : undefined}
      >
        {importance}
      </Badge>
    );
  };
  
  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '-';
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const month = deadlineDate.getMonth() + 1;
    const day = deadlineDate.getDate();
    
    let dDayPart = '';
    if (diffDays < 0) {
      dDayPart = `D+${Math.abs(diffDays)}`;
    } else if (diffDays === 0) {
      dDayPart = 'D-Day';
    } else {
      dDayPart = `D-${diffDays}`;
    }
    
    return `${month}/${day} ${dDayPart}`;
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
  
  const getImportanceBadgeVariant = (importance: string) => {
    switch (importance) {
      case "높음":
        return "destructive" as const;
      case "중간":
        return "default" as const;
      case "낮음":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              데이터를 불러오는데 실패했습니다
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 relative">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">프로젝트 관리</h1>
            <p className="text-muted-foreground">계층 구조로 프로젝트를 관리합니다</p>
          </div>
          <Button 
            onClick={() => setIsProjectModalOpen(true)}
            data-testid="button-add-project"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-muted/30 p-3 rounded-t-lg border">
        <div className="grid grid-cols-11 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">이름</div>
          <div className="col-span-1">마감일</div>
          <div className="col-span-1">담당자</div>
          <div className="col-span-1">작업</div>
          <div className="col-span-1">상태</div>
          <div className="col-span-2">진행도</div>
          <div className="col-span-1">중요도</div>
        </div>
      </div>

      {/* Content */}
      <Card className="rounded-t-none">
        <CardContent className="p-0">
          {(!projects || (projects as ProjectWithDetails[]).length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>프로젝트가 없습니다</p>
              <p className="text-sm mt-1">새 프로젝트를 추가해주세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {(projects as ProjectWithDetails[]).map((project) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="grid grid-cols-11 gap-4 items-center">
                      <div className="col-span-4 flex items-center gap-2">
                        <Checkbox
                          checked={selectedItems.has(project.id)}
                          onCheckedChange={() => toggleItemSelection(project.id)}
                          data-testid={`checkbox-project-${project.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleProject(project.id)}
                        >
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        <span className="font-medium" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {project.code}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => setGoalModalState({
                            isOpen: true,
                            projectId: project.id,
                            projectTitle: project.name
                          })}
                          data-testid={`button-add-goal-${project.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="col-span-1">
                        {renderEditableDeadline(project.id, 'project', project.deadline)}
                      </div>
                      <div className="col-span-1">
                        {renderEditableAssignee(project.id, 'project', project.owner || null, project.ownerId)}
                      </div>
                      <div className="col-span-1 text-sm">
                        {project.completedTasks}/{project.totalTasks}
                      </div>
                      <div className="col-span-1">
                        {renderEditableStatus(project.id, 'project', '진행중')}
                      </div>
                      <div className="col-span-2">
                        {renderEditableProgress(project.id, 'project', project.progressPercentage || 0)}
                      </div>
                      <div className="col-span-1">
                        {renderEditableImportance(project.id, 'project', '중간')}
                      </div>
                    </div>
                  </div>

                  {/* Goals */}
                  {expandedProjects.has(project.id) && project.goals && (
                    <div className="bg-muted/20">
                      {project.goals.map((goal) => (
                        <div key={goal.id}>
                          {/* Goal Row */}
                          <div className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="grid grid-cols-11 gap-4 items-center">
                              <div className="col-span-4 flex items-center gap-2 ml-8">
                                <Checkbox
                                  checked={selectedItems.has(goal.id)}
                                  onCheckedChange={() => toggleItemSelection(goal.id)}
                                  data-testid={`checkbox-goal-${goal.id}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleGoal(goal.id)}
                                >
                                  {expandedGoals.has(goal.id) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                                <Target className="w-4 h-4 text-green-600" />
                                <span className="font-medium" data-testid={`text-goal-name-${goal.id}`}>
                                  {goal.title}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-2"
                                  onClick={() => setTaskModalState({
                                    isOpen: true,
                                    goalId: goal.id,
                                    goalTitle: goal.title
                                  })}
                                  data-testid={`button-add-task-${goal.id}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="col-span-1">
                                {renderEditableDeadline(goal.id, 'goal', null)}
                              </div>
                              <div className="col-span-1">
                                {renderEditableAssignee(goal.id, 'goal', null)}
                              </div>
                              <div className="col-span-1 text-sm">
                                {goal.completedTasks || 0}/{goal.totalTasks || 0}
                              </div>
                              <div className="col-span-1">
                                {renderEditableStatus(goal.id, 'goal', '목표')}
                              </div>
                              <div className="col-span-2">
                                {renderEditableProgress(goal.id, 'goal', goal.progressPercentage || 0)}
                              </div>
                              <div className="col-span-1">
                                {renderEditableImportance(goal.id, 'goal', '중간')}
                              </div>
                            </div>
                          </div>

                          {/* Tasks */}
                          {expandedGoals.has(goal.id) && goal.tasks && (
                            <div className="bg-muted/30">
                              {goal.tasks.map((task) => (
                                <div key={task.id} className="p-3 hover:bg-muted/50 transition-colors">
                                  <div className="grid grid-cols-11 gap-4 items-center">
                                    <div className="col-span-4 flex items-center gap-2 ml-16">
                                      <Checkbox
                                        checked={selectedItems.has(task.id)}
                                        onCheckedChange={() => toggleItemSelection(task.id)}
                                        data-testid={`checkbox-task-${task.id}`}
                                      />
                                      <Circle className="w-4 h-4 text-orange-600" />
                                      <span className="font-medium" data-testid={`text-task-name-${task.id}`}>
                                        {task.title}
                                      </span>
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableDeadline(task.id, 'task', task.deadline)}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableAssignee(task.id, 'task', task.assignee || null)}
                                    </div>
                                    <div className="col-span-1 text-sm">1/1</div>
                                    <div className="col-span-1">
                                      {renderEditableStatus(task.id, 'task', task.status)}
                                    </div>
                                    <div className="col-span-2">
                                      {renderEditableProgress(task.id, 'task', task.status === '완료' ? 100 : 50, task.status)}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableImportance(task.id, 'task', task.priority || '중간')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Selection Toast */}
      {showSelectionToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedItems.size}개 선택됨
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-slate-800 text-sm"
              onClick={clearSelection}
              data-testid="button-clear-selection"
            >
              선택 해제
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-sm"
              data-testid="button-archive"
            >
              보관하기
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
      />
      
      <GoalModal 
        isOpen={goalModalState.isOpen} 
        onClose={() => setGoalModalState({ isOpen: false, projectId: '', projectTitle: '' })}
        projectId={goalModalState.projectId}
        projectTitle={goalModalState.projectTitle}
      />
      
      <TaskModal 
        isOpen={taskModalState.isOpen} 
        onClose={() => setTaskModalState({ isOpen: false, goalId: '', goalTitle: '' })}
        goalId={taskModalState.goalId}
        goalTitle={taskModalState.goalTitle}
      />
    </div>
  );
}