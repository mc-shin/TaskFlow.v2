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
  const [taskEditModalState, setTaskEditModalState] = useState<{ isOpen: boolean; taskId: string }>({ 
    isOpen: false, 
    taskId: '' 
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

  // 현재 표시된 프로젝트와 목표의 작업 통계 계산
  const totalStats = useMemo(() => {
    if (!projects || (projects as ProjectWithDetails[]).length === 0) {
      return { "진행전": 0, "진행중": 0, "완료": 0, "이슈": 0 };
    }
    
    // 현재 표시된 모든 프로젝트의 목표들의 작업들 수집
    const visibleTasks: SafeTaskWithAssignees[] = [];
    (projects as ProjectWithDetails[]).forEach(project => {
      project.goals?.forEach(goal => {
        if (goal.tasks) {
          visibleTasks.push(...goal.tasks);
        }
      });
    });
    
    return {
      "진행전": visibleTasks.filter(task => task.status === "실행대기" || task.status === "진행전").length,
      "진행중": visibleTasks.filter(task => task.status === "진행중").length,
      "완료": visibleTasks.filter(task => task.status === "완료").length,
      "이슈": visibleTasks.filter(task => task.status === "이슈함" || task.status === "이슈").length,
    };
  }, [projects]);

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
        {/* 첫 번째 이미지 참고: 큰 div 안에 가로로 4개 상태 헤더 */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex">
            <div className="flex-1 text-center py-4 px-6 border-r border-gray-200">
              <div className="text-lg font-medium text-gray-700">진행전</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {totalStats['진행전'] || 0}
              </div>
            </div>
            <div className="flex-1 text-center py-4 px-6 border-r border-gray-200">
              <div className="text-lg font-medium text-gray-700">진행중</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {totalStats['진행중'] || 0}
              </div>
            </div>
            <div className="flex-1 text-center py-4 px-6 border-r border-gray-200">
              <div className="text-lg font-medium text-gray-700">완료</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {totalStats['완료'] || 0}
              </div>
            </div>
            <div className="flex-1 text-center py-4 px-6">
              <div className="text-lg font-medium text-gray-700">이슈</div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {totalStats['이슈'] || 0}
              </div>
            </div>
          </div>
        </div>

        {/* 두 번째 이미지 참고: position relative 프로젝트 div → 목표 div → 4개 상태별 칸반 컬럼 → 작업 div */}
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
            <div className="space-y-8">
              {(projects as ProjectWithDetails[])?.map((project) => (
                <div 
                  key={project.id} 
                  className="relative bg-white border border-gray-200 rounded-lg shadow-sm"
                  data-testid={`project-container-${project.id}`}
                >
                  {/* 프로젝트 헤더 */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-green-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900" data-testid={`text-project-title-${project.id}`}>
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        {project.completedTasks}/{project.totalTasks} 작업 완료
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setGoalModalState({
                          isOpen: true,
                          projectId: project.id,
                          projectTitle: project.name
                        })}
                        data-testid={`button-add-goal-${project.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        새 목표
                      </Button>
                    </div>
                  </div>

                  {/* 목표 섹션 */}
                  <ProjectKanbanGoals 
                    projectId={project.id}
                    setTaskModalState={setTaskModalState}
                    setTaskEditModalState={setTaskEditModalState}
                  />
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
        onClose={() => setTaskEditModalState({ isOpen: false, taskId: '' })}
        taskId={taskEditModalState.taskId}
      />
    </>
  );
}

// 프로젝트 칸반 목표 컴포넌트 (두 번째 이미지 구조)
interface ProjectKanbanGoalsProps {
  projectId: string;
  setTaskModalState: (state: { isOpen: boolean; goalId: string; goalTitle: string }) => void;
  setTaskEditModalState: (state: { isOpen: boolean; taskId: string }) => void;
}

function ProjectKanbanGoals({ projectId, setTaskModalState, setTaskEditModalState }: ProjectKanbanGoalsProps) {
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
    <div className="p-4 space-y-6">
      {(goals as GoalWithTasks[])?.map((goal) => (
        <div key={goal.id} className="bg-gray-50 border border-gray-200 rounded-lg">
          {/* 목표 헤더 */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-orange-50">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                <Target className="w-3 h-3 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900" data-testid={`text-goal-title-${goal.id}`}>
                  {goal.title}
                </h4>
                {goal.description && (
                  <p className="text-sm text-gray-600">{goal.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {goal.completedTasks}/{goal.totalTasks} 완료
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setTaskModalState({
                  isOpen: true,
                  goalId: goal.id,
                  goalTitle: goal.title
                })}
                data-testid={`button-add-task-${goal.id}`}
              >
                <Plus className="w-4 h-4 mr-1" />
                작업
              </Button>
            </div>
          </div>

          {/* 4개 상태별 칸반 컬럼 */}
          <div className="p-4">
            <GoalKanbanColumns goal={goal} setTaskEditModalState={setTaskEditModalState} />
          </div>
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
  setTaskEditModalState: (state: { isOpen: boolean; taskId: string }) => void;
}

function GoalKanbanColumns({ goal, setTaskEditModalState }: GoalKanbanColumnsProps) {
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

  return (
    <div className="grid grid-cols-4 gap-4 min-h-[300px]">
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        <div
          key={status}
          className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col"
        >
          {/* 컬럼 헤더 */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <h5 className="font-medium text-sm text-gray-700">{status}</h5>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {statusTasks.length}
            </span>
          </div>
          
          {/* 작업 카드들 */}
          <div className="space-y-3 flex-1">
            {statusTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
                data-testid={`task-card-${task.id}`}
                onClick={() => setTaskEditModalState({ isOpen: true, taskId: task.id })}
              >
                <div className="space-y-2">
                  <h6 className="font-medium text-sm text-gray-900 leading-tight">
                    {task.title}
                  </h6>
                  
                  {task.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {task.priority && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {task.priority}
                        </span>
                      )}
                      {task.assigneeIds && task.assigneeIds.length > 0 && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white">?</span>
                        </div>
                      )}
                    </div>
                    
                    {task.deadline && (
                      <div className="text-xs text-gray-500">
                        {new Date(task.deadline).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {statusTasks.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-xs">작업 없음</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}