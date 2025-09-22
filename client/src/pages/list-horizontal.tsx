import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle, Clock, AlertTriangle, User, Plus, Eye, Target, FolderOpen, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";
import { ProjectModal } from "@/components/project-modal";
import { GoalModal } from "@/components/goal-modal";
import { TaskModal } from "@/components/task-modal";

interface FlattenedItem {
  id: string;
  type: 'project' | 'goal' | 'task';
  name: string;
  deadline: string | null;
  participant: { id: string; name: string } | null;
  ownerIds?: string[];
  assigneeIds?: string[];
  label: string;
  status: string;
  score: number;
  importance: string;
  project: ProjectWithDetails;
  goal: GoalWithTasks | null;
  task: SafeTaskWithAssignees | null;
}

export default function ListHorizontal() {
  const { toast } = useToast();
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });
  
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });
  
  const updateProjectMutation = useMutation({
    mutationFn: async (data: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/projects/${data.id}`, data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/goals/${data.id}`, data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      return await apiRequest("PUT", `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const deleteItemsMutation = useMutation({
    mutationFn: async (items: FlattenedItem[]) => {
      const results = [];
      
      // Delete in order: tasks first, then goals, then projects to avoid dependency issues
      const sortedItems = [...items].sort((a, b) => {
        const order = { task: 0, goal: 1, project: 2 };
        return order[a.type] - order[b.type];
      });

      for (const item of sortedItems) {
        try {
          let endpoint = '';
          switch (item.type) {
            case 'project':
              endpoint = `/api/projects/${item.id}`;
              break;
            case 'goal':
              endpoint = `/api/goals/${item.id}`;
              break;
            case 'task':
              endpoint = `/api/tasks/${item.id}`;
              break;
          }
          
          const result = await apiRequest("DELETE", endpoint);
          results.push({ success: true, item, result });
        } catch (error) {
          results.push({ success: false, item, error });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      if (successCount > 0) {
        toast({
          title: "삭제 완료",
          description: `${successCount}개 항목이 성공적으로 삭제되었습니다.${errorCount > 0 ? ` (${errorCount}개 항목 삭제 실패)` : ""}`,
        });
      }
      
      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "삭제 실패", 
          description: "선택한 항목을 삭제할 수 없습니다.",
          variant: "destructive",
        });
      }
      
      setSelectedItems(new Set());
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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
  
  // Flatten all items for table display
  const flattenedItems: FlattenedItem[] = [];
  if (projects) {
    for (const project of projects as ProjectWithDetails[]) {
      // Add project as item
      flattenedItems.push({
        id: project.id,
        type: 'project',
        name: project.name,
        deadline: project.deadline,
        participant: project.ownerIds && project.ownerIds.length > 0 ? { id: project.ownerIds[0], name: '소유자' } : null,
        ownerIds: project.ownerIds || undefined,
        label: project.code,
        status: `${project.completedTasks}/${project.totalTasks}`,
        score: project.progressPercentage || 0,
        importance: '중간',
        project,
        goal: null,
        task: null
      });
      
      // Add goals for this project
      if (project.goals) {
        for (const goal of project.goals) {
          flattenedItems.push({
            id: goal.id,
            type: 'goal',
            name: goal.title,
            deadline: null,
            participant: null,
            assigneeIds: goal.assigneeIds || undefined,
            label: `${project.code}-G`,
            status: `${goal.completedTasks || 0}/${goal.totalTasks || 0}`,
            score: goal.progressPercentage || 0,
            importance: '중간',
            project,
            goal,
            task: null
          });
          
          // Add tasks for this goal
          if (goal.tasks) {
            for (const task of goal.tasks) {
              flattenedItems.push({
                id: task.id,
                type: 'task',
                name: task.title,
                deadline: task.deadline,
                participant: task.assignees && task.assignees.length > 0 ? { id: task.assignees[0].id, name: task.assignees[0].name } : null,
                assigneeIds: task.assigneeIds || undefined,
                label: `${project.code}-T`,
                status: task.status,
                score: task.duration || 0,
                importance: task.priority || '중간',
                project,
                goal,
                task
              });
            }
          }
        }
      }
    }
  }
  
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    const item = flattenedItems.find(i => i.id === itemId);
    
    if (newSelected.has(itemId)) {
      // If item is being deselected, also deselect all its children
      newSelected.delete(itemId);
      
      if (item?.type === 'project') {
        // Deselect all goals and tasks for this project
        flattenedItems.forEach(flatItem => {
          if (flatItem.project.id === item.id && flatItem.id !== item.id) {
            newSelected.delete(flatItem.id);
          }
        });
      } else if (item?.type === 'goal') {
        // Deselect all tasks for this goal
        flattenedItems.forEach(flatItem => {
          if (flatItem.goal?.id === item.id && flatItem.type === 'task') {
            newSelected.delete(flatItem.id);
          }
        });
      }
    } else {
      // If item is being selected, also select all its children
      newSelected.add(itemId);
      
      if (item?.type === 'project') {
        // Select all goals and tasks for this project
        flattenedItems.forEach(flatItem => {
          if (flatItem.project.id === item.id && flatItem.id !== item.id) {
            newSelected.add(flatItem.id);
          }
        });
      } else if (item?.type === 'goal') {
        // Select all tasks for this goal
        flattenedItems.forEach(flatItem => {
          if (flatItem.goal?.id === item.id && flatItem.type === 'task') {
            newSelected.add(flatItem.id);
          }
        });
      }
    }
    
    setSelectedItems(newSelected);
  };
  
  const toggleSelectAll = () => {
    if (selectedItems.size === flattenedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(flattenedItems.map(item => item.id)));
    }
  };
  
  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '-';
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `D+${Math.abs(diffDays)}`;
    } else if (diffDays === 0) {
      return 'D-Day';
    } else {
      return `D-${diffDays}`;
    }
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
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="w-4 h-4 text-blue-600" />;
      case 'goal':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'task':
        return <CheckCircle className="w-4 h-4 text-orange-600" />;
      default:
        return null;
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

  const handleDeleteSelected = () => {
    const selectedItemsArray = flattenedItems.filter(item => selectedItems.has(item.id));
    if (selectedItemsArray.length > 0) {
      deleteItemsMutation.mutate(selectedItemsArray);
    }
  };

  const handleDetailView = (item: FlattenedItem) => {
    // Open appropriate modal based on item type
    if (item.type === 'project') {
      setGoalModalState({
        isOpen: true,
        projectId: item.id,
        projectTitle: item.name
      });
    } else if (item.type === 'goal') {
      setTaskModalState({
        isOpen: true,
        goalId: item.id,
        goalTitle: item.name
      });
    }
    // For tasks, we could add a task detail modal in the future
  };

  const handleAssigneeChange = (taskId: string, assigneeId: string) => {
    const assigneeData = assigneeId === "none" ? { assigneeIds: [] } : { assigneeIds: [assigneeId] };
    updateTaskMutation.mutate({ taskId, data: assigneeData });
  };

  const handleStatusChange = (taskId: string, status: string) => {
    updateTaskMutation.mutate({ taskId, data: { status } });
  };

  const renderEditableAssignee = (item: FlattenedItem) => {
    // Get assignees based on item type
    let assignees: SafeUser[] = [];
    let currentAssigneeIds: string[] = [];
    
    if (item.type === 'project') {
      currentAssigneeIds = Array.isArray(item.ownerIds) ? item.ownerIds : [];
      assignees = currentAssigneeIds.map(id => 
        (users as SafeUser[])?.find(user => user.id === id)
      ).filter(Boolean) as SafeUser[];
    } else if (item.type === 'goal') {
      currentAssigneeIds = Array.isArray(item.assigneeIds) ? item.assigneeIds : [];
      assignees = currentAssigneeIds.map(id => 
        (users as SafeUser[])?.find(user => user.id === id)
      ).filter(Boolean) as SafeUser[];
    } else if (item.type === 'task' && item.task) {
      currentAssigneeIds = Array.isArray(item.task.assigneeIds) ? item.task.assigneeIds : [];
      assignees = currentAssigneeIds.map(id => 
        (users as SafeUser[])?.find(user => user.id === id)
      ).filter(Boolean) as SafeUser[];
    }

    const handleAssigneeToggle = (userId: string, isSelected: boolean) => {
      let newAssigneeIds: string[];
      
      if (isSelected) {
        // Add user to assignees
        newAssigneeIds = [...currentAssigneeIds, userId];
      } else {
        // Remove user from assignees
        newAssigneeIds = currentAssigneeIds.filter(id => id !== userId);
      }
      
      if (item.type === 'project') {
        // Update project owners
        const updateData = { ownerIds: newAssigneeIds };
        updateProjectMutation.mutate({ id: item.id, data: updateData });
      } else if (item.type === 'goal') {
        // Update goal assignees
        const updateData = { assigneeIds: newAssigneeIds };
        updateGoalMutation.mutate({ id: item.id, data: updateData });
      } else if (item.type === 'task') {
        // Update task assignees
        const updateData = { assigneeIds: newAssigneeIds };
        updateTaskMutation.mutate({ taskId: item.id, data: updateData });
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="cursor-pointer hover:bg-muted rounded-md w-32 h-8 flex items-center px-1"
            data-testid={`edit-assignee-${item.id}`}
          >
            {assignees.length > 0 ? (
              <div className="flex items-center gap-1">
                {assignees.slice(0, 4).map((assignee, index) => (
                  <Avatar key={assignee.id} className="w-6 h-6 flex-shrink-0" style={{ zIndex: assignees.length - index }}>
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground border border-white">
                      {assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 4 && (
                  <span className="text-xs text-muted-foreground ml-1">+{assignees.length - 4}</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">담당자 없음</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {item.type === 'project' ? '소유자' : '담당자'} 선택
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(users as SafeUser[])?.map(user => {
                const isSelected = currentAssigneeIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 hover:bg-muted/50 p-2 rounded cursor-pointer"
                    onClick={() => handleAssigneeToggle(user.id, !isSelected)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderEditableStatus = (item: FlattenedItem) => {
    if (item.type !== 'task' || !item.task) {
      return (
        <Badge variant={getStatusBadgeVariant(item.status)} data-testid={`badge-status-${item.id}`}>
          {item.status}
        </Badge>
      );
    }

    const statusOptions = [
      { value: "진행전", label: "진행전" },
      { value: "진행중", label: "진행중" },
      { value: "완료", label: "완료" }
    ];

    return (
      <Select
        value={item.status}
        onValueChange={(value) => handleStatusChange(item.id, value)}
        disabled={updateTaskMutation.isPending}
      >
        <SelectTrigger className="h-8 p-1 border-0 shadow-none hover:bg-muted rounded-md w-20" data-testid={`select-status-${item.id}`}>
          <SelectValue>
            <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
              {item.status}
            </Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <Badge variant={getStatusBadgeVariant(option.value)} className="text-xs">
                {option.label}
              </Badge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
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
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">프로젝트 계층 구조</h1>
            <p className="text-muted-foreground">프로젝트 → 목표 → 작업 계층으로 구성된 상세 구조를 확인합니다</p>
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

      {/* Selection Summary */}
      {selectedItems.size > 0 && (
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size}개 항목이 선택됨
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                  data-testid="button-clear-selection"
                >
                  선택 해제
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteItemsMutation.isPending}
                  data-testid="button-delete-selected"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deleteItemsMutation.isPending ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedItems.size === flattenedItems.length && flattenedItems.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="w-[60px]">상세</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>마감일</TableHead>
              <TableHead>참여자</TableHead>
              <TableHead>라벨</TableHead>
              <TableHead>현황</TableHead>
              <TableHead>스코어</TableHead>
              <TableHead>중요도</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-muted-foreground">
                    <p>프로젝트가 없습니다</p>
                    <p className="text-sm mt-1">새 프로젝트를 추가해주세요</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              flattenedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className={selectedItems.has(item.id) ? "bg-muted/50" : ""}
                  data-testid={`row-${item.type}-${item.id}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      data-testid={`checkbox-${item.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDetailView(item)}
                      data-testid={`button-detail-${item.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <span 
                        className={`font-medium ${item.type === 'project' ? 'text-blue-600' : item.type === 'goal' ? 'text-green-600' : 'text-orange-600'}`}
                        data-testid={`text-${item.type}-name-${item.id}`}
                      >
                        {item.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-deadline-${item.id}`}>
                    {formatDeadline(item.deadline)}
                  </TableCell>
                  <TableCell>
                    {renderEditableAssignee(item)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-label-${item.id}`}>
                      {item.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {renderEditableStatus(item)}
                  </TableCell>
                  <TableCell data-testid={`text-score-${item.id}`}>
                    <span className="font-mono text-sm">{item.score}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getImportanceBadgeVariant(item.importance)} data-testid={`badge-importance-${item.id}`}>
                      {item.importance}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

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