import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, Clock, AlertTriangle, User, Plus, ChevronDown, ChevronRight, Target, FolderOpen } from "lucide-react";
import type { SafeTaskWithAssignees, SafeUser, ProjectWithDetails, GoalWithTasks } from "@shared/schema";
import { ProjectModal } from "@/components/project-modal";
import { GoalModal } from "@/components/goal-modal";
import { TaskModal } from "@/components/task-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Kanban() {
  const { data: projects, isLoading: projectsLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [hoveredGoal, setHoveredGoal] = useState<string | null>(null);
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
  const [taskEditModalState, setTaskEditModalState] = useState<{ isOpen: boolean; editingTask: SafeTaskWithAssignees | null }>({ 
    isOpen: false, 
    editingTask: null 
  });

  const isLoading = projectsLoading || usersLoading || tasksLoading;

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

  // 사용자 매핑
  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map((users as SafeUser[]).map(user => [user.id, user]));
  }, [users]);

  // 사용자 조회 헬퍼
  const getUserById = (userId: string): SafeUser | undefined => {
    return usersMap.get(userId);
  };

  // 전체 시스템 작업 통계 계산
  const totalStats = useMemo(() => {
    if (!tasks || (tasks as SafeTaskWithAssignees[]).length === 0) {
      return { "진행전": 0, "진행중": 0, "완료": 0, "이슈": 0 };
    }
    
    const allTasks = tasks as SafeTaskWithAssignees[];
    
    return {
      "진행전": allTasks.filter(task => task.status === "실행대기" || task.status === "진행전").length,
      "진행중": allTasks.filter(task => task.status === "진행중").length,
      "완료": allTasks.filter(task => task.status === "완료").length,
      "이슈": allTasks.filter(task => task.status === "이슈함" || task.status === "이슈").length,
    };
  }, [tasks]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료": return "bg-green-500";
      case "실행대기": return "bg-blue-500";
      case "이슈함": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "완료": return "default";
      case "실행대기": return "secondary";
      case "이슈함": return "destructive";
      default: return "outline";
    }
  };

  const getDDayColorClass = (deadline: string | null) => {
    if (!deadline) return "";
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "text-red-600 font-semibold";
    if (diffDays === 0) return "text-red-500 font-semibold";
    if (diffDays <= 3) return "text-orange-500 font-medium";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            프로젝트 칸반 보드
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            프로젝트 → 목표 → 작업을 칸반 형태로 관리합니다
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700" 
          onClick={() => setIsProjectModalOpen(true)}
          data-testid="button-add-project"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 프로젝트
        </Button>
      </header>
      
      <main className="flex-1 overflow-auto" data-testid="main-content">
        {/* 통합된 헤더와 프로젝트 영역 */}
        <div className="p-6">
          {error ? (
            <Card className="border-destructive">
              <CardContent className="p-6 text-center">
                <div className="text-destructive mb-2">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">프로젝트를 불러오는 중 오류가 발생했습니다</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* 상단 상태 헤더 */}
              <div className="bg-card border border-border rounded-lg shadow-sm hover:shadow-lg transition-all duration-200">
                <div className="grid grid-cols-4 gap-0">
                  <div className="text-center py-4 px-3 border-r border-border">
                    <div className="text-lg font-medium text-foreground">진행전</div>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {totalStats['진행전'] || 0}
                    </div>
                  </div>
                  <div className="text-center py-4 px-3 border-r border-border">
                    <div className="text-lg font-medium text-foreground">진행중</div>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {totalStats['진행중'] || 0}
                    </div>
                  </div>
                  <div className="text-center py-4 px-3 border-r border-border">
                    <div className="text-lg font-medium text-foreground">완료</div>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {totalStats['완료'] || 0}
                    </div>
                  </div>
                  <div className="text-center py-4 px-3">
                    <div className="text-lg font-medium text-foreground">이슈</div>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {totalStats['이슈'] || 0}
                    </div>
                  </div>
                </div>
              </div>
              
              {(projects as ProjectWithDetails[])?.map((project) => (
                <div 
                  key={project.id} 
                  className="relative bg-card border border-border rounded-lg shadow-sm hover:shadow-lg transition-all duration-200"
                  data-testid={`project-container-${project.id}`}
                >
                  {/* 프로젝트 헤더 */}
                  <div className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                       onClick={() => toggleProject(project.id)}>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-7 w-7 opacity-100 bg-muted hover:bg-muted/80 border border-border hover:border-border/80 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProject(project.id);
                        }}
                        data-testid={`button-toggle-project-${project.id}`}
                      >
                        {expandedProjects.has(project.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <FolderOpen className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="text-lg font-medium text-foreground" data-testid={`text-project-title-${project.id}`}>
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-muted-foreground">
                        {project.completedTasks}/{project.totalTasks} 작업 완료
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGoalModalState({
                            isOpen: true,
                            projectId: project.id,
                            projectTitle: project.name
                          });
                        }}
                        data-testid={`button-add-goal-${project.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        새 목표
                      </Button>
                    </div>
                  </div>

                  {/* 목표 섹션 - 프로젝트가 확장된 경우에만 표시 */}
                  {expandedProjects.has(project.id) && (
                    <ProjectKanbanGoals 
                      projectId={project.id}
                      setTaskModalState={setTaskModalState}
                      setTaskEditModalState={setTaskEditModalState}
                      expandedGoals={expandedGoals}
                      toggleGoal={toggleGoal}
                      usersMap={usersMap}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
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
      
      <TaskModal
        isOpen={taskEditModalState.isOpen}
        onClose={() => setTaskEditModalState({ isOpen: false, editingTask: null })}
        editingTask={taskEditModalState.editingTask as any}
      />
    </>
  );
}

// 프로젝트 칸반 목표 컴포넌트 (두 번째 이미지 구조)
interface ProjectKanbanGoalsProps {
  projectId: string;
  setTaskModalState: (state: { isOpen: boolean; goalId: string; goalTitle: string }) => void;
  setTaskEditModalState: (state: { isOpen: boolean; editingTask: SafeTaskWithAssignees | null }) => void;
  expandedGoals: Set<string>;
  toggleGoal: (goalId: string) => void;
  usersMap: Map<string, SafeUser>;
}

function ProjectKanbanGoals({ projectId, setTaskModalState, setTaskEditModalState, expandedGoals, toggleGoal, usersMap }: ProjectKanbanGoalsProps) {
  // 프로젝트의 목표들 가져오기
  const { data: goals, isLoading: goalsLoading, error: goalsError } = useQuery({
    queryKey: ["/api/projects", projectId, "goals"],
    enabled: !!projectId,
  });

  if (goalsLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-100 h-32 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (goalsError) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-medium">목표를 불러오는 중 오류가 발생했습니다</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {(goals as GoalWithTasks[])?.map((goal) => (
        <div key={goal.id} className="bg-card border border-border rounded-lg hover:shadow-md transition-all duration-200">
          {/* 목표 헤더 */}
          <div className="flex items-center justify-between p-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
               onClick={() => toggleGoal(goal.id)}>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 opacity-100 bg-muted hover:bg-muted/80 border border-border hover:border-border/80 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGoal(goal.id);
                }}
                data-testid={`button-toggle-goal-${goal.id}`}
              >
                {expandedGoals.has(goal.id) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
              <Target className="w-4 h-4 text-primary" />
              <div>
                <h4 className="font-medium text-foreground" data-testid={`text-goal-title-${goal.id}`}>
                  {goal.title}
                </h4>
                {goal.description && (
                  <p className="text-sm text-muted-foreground">{goal.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-muted-foreground">
                {goal.completedTasks}/{goal.totalTasks} 완료
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaskModalState({
                    isOpen: true,
                    goalId: goal.id,
                    goalTitle: goal.title
                  });
                }}
                data-testid={`button-add-task-${goal.id}`}
              >
                <Plus className="w-4 h-4 mr-1" />
                작업
              </Button>
            </div>
          </div>

          {/* 4개 상태별 칸반 컬럼 - 목표가 확장된 경우에만 표시 */}
          {expandedGoals.has(goal.id) && (
            <div className="p-2">
              <GoalKanbanColumns goal={goal} setTaskEditModalState={setTaskEditModalState} usersMap={usersMap} />
            </div>
          )}
        </div>
      ))}
      
      {(!goals || (Array.isArray(goals) && goals.length === 0)) && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">이 프로젝트에는 아직 목표가 없습니다</p>
        </div>
      )}
    </div>
  );
}

// 목표별 칸반 컬럼 컴포넌트
interface GoalKanbanColumnsProps {
  goal: GoalWithTasks;
  setTaskEditModalState: (state: { isOpen: boolean; editingTask: SafeTaskWithAssignees | null }) => void;
  usersMap: Map<string, SafeUser>;
}

function GoalKanbanColumns({ goal, setTaskEditModalState, usersMap }: GoalKanbanColumnsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 마감날짜 포맷팅 함수
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

  // 상태 배지 스타일 함수
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "완료": return "bg-green-100 text-green-700";
      case "진행중": return "bg-orange-100 text-orange-700";
      case "진행전": 
      case "실행대기": return "bg-blue-100 text-blue-700";
      case "이슈":
      case "이슈함": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // 상태별 작업 그룹핑
  const tasksByStatus = useMemo(() => {
    const tasks = goal.tasks || [];
    return {
      "진행전": tasks.filter(task => task.status === "실행대기" || task.status === "진행전"),
      "진행중": tasks.filter(task => task.status === "진행중"),
      "완료": tasks.filter(task => task.status === "완료"),
      "이슈": tasks.filter(task => task.status === "이슈함" || task.status === "이슈"),
    };
  }, [goal.tasks]);

  // 작업 상태 변경 mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      // 프로젝트별 목표 데이터도 무효화
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/projects" && query.queryKey[2] === "goals" 
      });
      toast({
        title: "성공",
        description: "작업 상태가 변경되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "오류",
        description: "작업 상태 변경에 실패했습니다.",
      });
    },
  });

  // 드롭 핸들러
  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = goal.tasks?.find(t => t.id === taskId);
    
    if (task && task.status !== newStatus) {
      updateTaskStatusMutation.mutate({ taskId, newStatus });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  return (
    <div className="grid grid-cols-4 gap-4 min-h-[300px]">
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        <div
          key={status}
          className="bg-card border border-border rounded-lg p-3 flex flex-col flex-1 min-h-[200px] transition-all duration-200 hover:shadow-md"
          onDrop={(e) => handleDrop(e, status)}
          onDragOver={handleDragOver}
        >
          {/* 작업 카드들 */}
          <div className="space-y-3 flex-1">
            {statusTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-border/80"
                data-testid={`task-card-${task.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => setTaskEditModalState({ isOpen: true, editingTask: task })}
              >
                <div className="space-y-2">
                  <h6 className="font-medium text-sm text-foreground leading-tight">
                    {task.title}
                  </h6>
                  
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  
                  {/* 마감날짜, D-DAY, 담당자 구성 */}
                  <div className="space-y-1 pt-2 border-t border-gray-100">
                    {/* 상태와 우선순위 배지 */}
                    <div className="flex items-center space-x-2 mb-2">
                      {task.status && (
                        <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeStyle(task.status)}`}>
                          {task.status}
                        </span>
                      )}
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {task.priority || "미지정"}
                      </span>
                    </div>
                    
                    {/* 마감날짜 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">마감:</span>
                      <span className="text-foreground">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString('ko-KR') : "미지정"}
                      </span>
                    </div>
                    
                    {/* D-DAY */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">남은 시간:</span>
                      {task.deadline ? (
                        <span className={`font-medium ${
                          formatDeadline(task.deadline)?.startsWith('D+') ? 'text-red-600' : 
                          formatDeadline(task.deadline) === 'D-Day' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {formatDeadline(task.deadline)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">미지정</span>
                      )}
                    </div>
                    
                    {/* 담당자 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">담당자:</span>
                      {task.assigneeIds && task.assigneeIds.length > 0 ? (
                        <div className="flex items-center overflow-hidden">
                          <span className="text-foreground text-xs truncate">
                            {task.assigneeIds
                              .map(assigneeId => usersMap.get(assigneeId)?.name)
                              .filter(Boolean)
                              .join(', ') || '사용자 미확인'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">미지정</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {statusTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-xs">작업 없음</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}