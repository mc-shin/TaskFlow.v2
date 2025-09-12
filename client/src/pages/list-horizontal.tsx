import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, AlertTriangle, User, Plus, Eye, Target, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { SafeTaskWithAssignee, ProjectWithDetails, GoalWithTasks } from "@shared/schema";
import { ProjectModal } from "@/components/project-modal";
import { GoalModal } from "@/components/goal-modal";
import { TaskModal } from "@/components/task-modal";

interface FlattenedItem {
  id: string;
  type: 'project' | 'goal' | 'task';
  name: string;
  deadline: string | null;
  participant: { id: string; name: string } | null;
  label: string;
  status: string;
  score: number;
  importance: string;
  project: ProjectWithDetails;
  goal: GoalWithTasks | null;
  task: SafeTaskWithAssignee | null;
}

export default function ListHorizontal() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
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
        participant: project.ownerId ? { id: project.ownerId, name: '소유자' } : null,
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
                participant: task.assignee && task.assigneeId ? { id: task.assigneeId, name: task.assignee.name } : null,
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
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
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
      case "실행대기":
        return "secondary" as const;
      case "이슈함":
        return "destructive" as const;
      case "사업팀":
        return "default" as const;
      case "인력팀":
        return "default" as const;
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedItems(new Set())}
              >
                선택 해제
              </Button>
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
                    {item.participant ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {item.participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm" data-testid={`text-participant-${item.id}`}>
                          {item.participant.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-label-${item.id}`}>
                      {item.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(item.status)} data-testid={`badge-status-${item.id}`}>
                      {item.status}
                    </Badge>
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