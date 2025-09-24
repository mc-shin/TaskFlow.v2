import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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

  // 전체 작업 통계 계산
  const totalStats = useMemo(() => {
    if (!tasks) return { "진행전": 0, "진행중": 0, "완료": 0, "이슈": 0 };
    
    const allTasks = tasks as SafeTaskWithAssignees[];
    return {
      "진행전": allTasks.filter(task => task.status === "실행대기").length,
      "진행중": allTasks.filter(task => task.status === "진행중").length,
      "완료": allTasks.filter(task => task.status === "완료").length,
      "이슈": allTasks.filter(task => task.status === "이슈함").length,
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
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {/* 상태 헤더 - 본문 상단에 배치 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(totalStats).map(([status, count]) => {
            // 상태별 색상 정의 (totalStats의 키와 일치시킴)
            const getStatusStyle = (status: string) => {
              switch (status) {
                case '실행대기':
                case '진행전':
                  return {
                    backgroundColor: 'hsl(210, 100%, 95%)',
                    borderColor: 'hsl(210, 100%, 85%)',
                    textColor: 'hsl(210, 100%, 30%)'
                  };
                case '진행중':
                  return {
                    backgroundColor: 'hsl(45, 100%, 95%)',
                    borderColor: 'hsl(45, 100%, 85%)',
                    textColor: 'hsl(45, 100%, 30%)'
                  };
                case '완료':
                  return {
                    backgroundColor: 'hsl(120, 60%, 95%)',
                    borderColor: 'hsl(120, 60%, 85%)',
                    textColor: 'hsl(120, 60%, 30%)'
                  };
                case '이슈함':
                case '이슈':
                  return {
                    backgroundColor: 'hsl(0, 100%, 95%)',
                    borderColor: 'hsl(0, 100%, 85%)',
                    textColor: 'hsl(0, 100%, 30%)'
                  };
                default:
                  return {
                    backgroundColor: 'var(--sidebar)',
                    borderColor: 'var(--sidebar-border)',
                    textColor: 'var(--sidebar-foreground)'
                  };
              }
            };
            
            const statusStyle = getStatusStyle(status);
            
            return (
              <div
                key={status}
                className="text-center p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: statusStyle.backgroundColor,
                  borderColor: statusStyle.borderColor,
                  color: statusStyle.textColor
                }}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm opacity-80">
                  {status === '실행대기' ? '진행전' : status}
                </div>
              </div>
            );
          })}
        </div>

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
            {(projects as ProjectWithDetails[])?.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-all duration-200"
                data-testid={`card-project-${project.id}`}
              >
                <Collapsible
                  open={expandedProjects.has(project.id)}
                  onOpenChange={() => toggleProject(project.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onMouseEnter={() => setHoveredProject(project.id)}
                      onMouseLeave={() => setHoveredProject(null)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-lg" data-testid={`text-project-title-${project.id}`}>
                              {project.name}
                            </CardTitle>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {project.completedTasks}/{project.totalTasks} 작업 완료
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {project.progressPercentage}% 진행률
                            </div>
                          </div>
                          {hoveredProject === project.id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 w-8 p-0"
                              data-testid={`button-add-goal-${project.id}`}
                              aria-label="add-goal"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGoalModalState({
                                  isOpen: true,
                                  projectId: project.id,
                                  projectTitle: project.name
                                });
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-6">
                      {expandedProjects.has(project.id) && (
                        <ProjectGoalsKanbanContent 
                          project={project} 
                          expandedGoals={expandedGoals}
                          toggleGoal={toggleGoal}
                          hoveredGoal={hoveredGoal}
                          setHoveredGoal={setHoveredGoal}
                          formatDeadline={formatDeadline}
                          getStatusColor={getStatusColor}
                          getStatusBadgeVariant={getStatusBadgeVariant}
                          hoveredProject={hoveredProject}
                          setGoalModalState={setGoalModalState}
                          setTaskModalState={setTaskModalState}
                        />
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
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
    </>
  );
}

// 프로젝트 목표 칸반 컨텐츠 컴포넌트 (리스트 페이지와 동일한 인터페이스)
interface ProjectGoalsKanbanContentProps {
  project: ProjectWithDetails;
  expandedGoals: Set<string>;
  toggleGoal: (goalId: string) => void;
  hoveredGoal: string | null;
  setHoveredGoal: (goalId: string | null) => void;
  formatDeadline: (deadline: string | null) => string | null;
  getStatusColor: (status: string) => string;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  hoveredProject: string | null;
  setGoalModalState: (state: { isOpen: boolean; projectId: string; projectTitle: string }) => void;
  setTaskModalState: (state: { isOpen: boolean; goalId: string; goalTitle: string }) => void;
}

function ProjectGoalsKanbanContent({ 
  project, 
  expandedGoals, 
  toggleGoal, 
  hoveredGoal, 
  setHoveredGoal,
  formatDeadline,
  getStatusColor,
  getStatusBadgeVariant,
  hoveredProject,
  setGoalModalState,
  setTaskModalState
}: ProjectGoalsKanbanContentProps) {
  // Fetch goals for this project (리스트 페이지와 동일)
  const { data: goals, isLoading: goalsLoading, error: goalsError } = useQuery({
    queryKey: ["/api/projects", project.id, "goals"],
    enabled: !!project.id,
  });

  if (goalsLoading) {
    return (
      <div className="space-y-3 ml-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (goalsError) {
    return (
      <div className="ml-8">
        <Card className="border-destructive">
          <CardContent className="p-4 text-center">
            <div className="text-destructive">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 ml-8">
      {(goals as GoalWithTasks[])?.map((goal) => (
        <Card 
          key={goal.id} 
          className="border-l-4 border-l-green-500 hover:shadow-md transition-all duration-200"
          data-testid={`card-goal-${goal.id}`}
          onMouseEnter={() => setHoveredGoal(goal.id)}
          onMouseLeave={() => setHoveredGoal(null)}
        >
          <Collapsible
            open={expandedGoals.has(goal.id)}
            onOpenChange={() => toggleGoal(goal.id)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {expandedGoals.has(goal.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Target className="w-4 h-4 text-green-600" />
                    <div>
                      <CardTitle className="text-base" data-testid={`text-goal-title-${goal.id}`}>
                        {goal.title}
                      </CardTitle>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {goal.completedTasks}/{goal.totalTasks} 작업 완료
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {goal.progressPercentage}% 진행률
                      </div>
                    </div>
                    {(expandedGoals.has(goal.id) || hoveredGoal === goal.id) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8 w-8 p-0"
                        data-testid={`button-add-task-${goal.id}`}
                        aria-label="add-task"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskModalState({
                            isOpen: true,
                            goalId: goal.id,
                            goalTitle: goal.title
                          });
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                {/* 칸반 형태로 4개 상태별 컬럼 표시 (리스트와 달리 작업을 칸반으로 표시) */}
                <GoalTasksKanbanView 
                  goal={goal}
                  formatDeadline={formatDeadline}
                  getStatusColor={getStatusColor}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
      
      {(!goals || (Array.isArray(goals) && goals.length === 0)) && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">이 프로젝트에는 아직 목표가 없습니다</p>
        </div>
      )}
    </div>
  );
}

// 목표 작업 칸반 뷰 컴포넌트
interface GoalTasksKanbanViewProps {
  goal: GoalWithTasks;
  formatDeadline: (deadline: string | null) => string | null;
  getStatusColor: (status: string) => string;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
}

function GoalTasksKanbanView({ 
  goal, 
  formatDeadline, 
  getStatusColor, 
  getStatusBadgeVariant
}: GoalTasksKanbanViewProps) {
  // 상태별 작업 그룹핑
  const tasksByStatus = useMemo(() => {
    const tasks = goal.tasks || [];
    return {
      "진행전": tasks.filter(task => task.status === "실행대기"),
      "진행중": tasks.filter(task => task.status === "진행중"),
      "완료": tasks.filter(task => task.status === "완료"),
      "이슈": tasks.filter(task => task.status === "이슈함"),
    };
  }, [goal.tasks]);

  // 작업이 없어도 칸반 컬럼은 표시해야 함

  return (
    <div className="ml-8">
      <div className="grid grid-cols-4 gap-4 min-h-[200px]">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <div
            key={status}
            className="border rounded-lg p-3 flex flex-col"
            style={{
              backgroundColor: 'var(--sidebar-accent)',
              borderColor: 'var(--sidebar-border)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm" style={{ color: 'var(--sidebar-foreground)' }}>
                {status}
              </h4>
              <span className="text-xs opacity-70" style={{ color: 'var(--sidebar-foreground)' }}>
                {statusTasks.length}
              </span>
            </div>
            
            <div className="space-y-2 flex-1">
              {statusTasks.map((task) => (
                <Card key={task.id} className="p-2 hover:shadow-sm transition-shadow bg-card">
                  <CardContent className="p-0">
                    <div className="space-y-2">
                      <h5 className="font-medium text-xs leading-tight">
                        {task.title}
                      </h5>
                      
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      {task.priority && (
                        <Badge variant="secondary" className="text-xs">
                          {task.priority}
                        </Badge>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {task.assigneeIds && task.assigneeIds.length > 0 && (
                            <Avatar className="w-4 h-4">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                ?
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        
                        {task.deadline && (
                          <div className="text-xs text-muted-foreground">
                            {formatDeadline(task.deadline)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {statusTasks.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-xs">작업 없음</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}