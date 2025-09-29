import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, Clock, AlertTriangle, User, Plus, ChevronDown, ChevronRight, Target, FolderOpen } from "lucide-react";
import { useState, useEffect } from "react";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks } from "@shared/schema";
import { ProjectModal } from "@/components/project-modal";
import { GoalModal } from "@/components/goal-modal";
import { TaskModal } from "@/components/task-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function List() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
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
  
  // Local state to track completed items for immediate UI feedback
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sync database completion state with local state when projects data changes
  useEffect(() => {
    if (projects && Array.isArray(projects)) {
      const newCompletedItems = new Set<string>();
      
      // Add projects that are completed in database
      (projects as ProjectWithDetails[]).forEach(project => {
        if (project.status === '완료') {
          newCompletedItems.add(project.id);
        }
        
        // Add goals that are completed in database
        if (project.goals) {
          project.goals.forEach(goal => {
            if (goal.status === '완료') {
              newCompletedItems.add(goal.id);
            }
          });
        }
      });
      
      setCompletedItems(newCompletedItems);
    }
  }, [projects]);

  // Mutation for updating project status
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { status: string } }) => {
      return apiRequest("PUT", `/api/projects/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  // Mutation for updating goal status
  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { status: string } }) => {
      return apiRequest("PUT", `/api/goals/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  // Check if auto-completion is allowed for a project or goal
  const canAutoComplete = (itemId: string, type: 'project' | 'goal'): boolean => {
    if (!projects || !Array.isArray(projects)) return false;
    
    if (type === 'project') {
      const project = (projects as ProjectWithDetails[]).find(p => p.id === itemId);
      if (!project) return false;
      
      // Check if all goals in this project are 100% complete
      if (project.goals && project.goals.length > 0) {
        return project.goals.every(goal => {
          if (goal.tasks && goal.tasks.length > 0) {
            return goal.tasks.every(task => 
              task.progress === 100 || task.status === '완료'
            );
          }
          return false;
        });
      }
      return false;
    }
    
    if (type === 'goal') {
      // Find the goal across all projects
      for (const project of projects as ProjectWithDetails[]) {
        if (project.goals) {
          const goal = project.goals.find(g => g.id === itemId);
          if (goal) {
            // Check if all tasks in this goal are 100% complete
            if (goal.tasks && goal.tasks.length > 0) {
              return goal.tasks.every(task => 
                task.progress === 100 || task.status === '완료'
              );
            }
            // If no tasks, allow completion (goal can be completed without tasks)
            return true;
          }
        }
      }
    }
    
    return false;
  };

  // Calculate what the status should be based on child progress
  const getCalculatedStatus = (itemId: string, type: 'project' | 'goal'): string => {
    if (!projects || !Array.isArray(projects)) return '진행전';
    
    if (type === 'project') {
      const project = (projects as ProjectWithDetails[]).find(p => p.id === itemId);
      if (!project) return '진행전';
      
      if (project.goals && project.goals.length > 0) {
        const allCompleted = project.goals.every(goal => (goal.progressPercentage || 0) === 100);
        const anyStarted = project.goals.some(goal => (goal.progressPercentage || 0) > 0);
        if (allCompleted) return '완료';
        if (anyStarted) return '진행중';
        return '진행전';
      }
      return '진행전';
    } else if (type === 'goal') {
      for (const project of projects as ProjectWithDetails[]) {
        if (project.goals) {
          const goal = project.goals.find(g => g.id === itemId);
          if (goal) {
            if (goal.tasks && goal.tasks.length > 0) {
              const allCompleted = goal.tasks.every(task => 
                task.progress === 100 || task.status === '완료'
              );
              const anyStarted = goal.tasks.some(task => 
                (task.progress !== null && task.progress > 0) || task.status === '진행중'
              );
              if (allCompleted) return '완료';
              if (anyStarted) return '진행중';
              return '진행전';
            }
            return '진행전';
          }
        }
      }
    }
    
    return '진행전';
  };

  // Interactive status handler for projects and goals
  const handleStatusClick = async (itemId: string, type: 'project' | 'goal', currentStatus: string) => {
    console.log('🔄 handleStatusClick called:', { itemId, type, currentStatus });
    
    // Don't allow interaction with '이슈' status
    if (currentStatus === '이슈') return;
    
    const autoCompleteAllowed = canAutoComplete(itemId, type);
    const isCompleted = currentStatus === '완료';
    
    console.log('🔍 Status check:', { 
      autoCompleteAllowed, 
      isCompleted,
      currentStatus
    });
    
    // Enable completion button if auto-completion is allowed OR if already completed
    if (!autoCompleteAllowed && !isCompleted) {
      console.log('❌ Not allowed to complete - returning early');
      return; // Not allowed to complete
    }
    
    try {
      if (isCompleted) {
        console.log('🚫 CANCEL operation triggered');
        // This is a cancel operation - revert to calculated status
        const calculatedStatus = getCalculatedStatus(itemId, type);
        console.log('📊 Calculated status for cancel:', calculatedStatus);
        
        if (type === 'project') {
          await updateProjectMutation.mutateAsync({ 
            id: itemId, 
            updates: { status: calculatedStatus } 
          });
          
          toast({
            title: "프로젝트 완료 취소",
            description: "프로젝트 완료가 취소되었습니다.",
          });
        } else if (type === 'goal') {
          await updateGoalMutation.mutateAsync({ 
            id: itemId, 
            updates: { status: calculatedStatus } 
          });
          
          toast({
            title: "목표 완료 취소",
            description: "목표 완료가 취소되었습니다.",
          });
        }
      } else {
        console.log('✅ COMPLETE operation triggered');
        // This is a complete operation
        if (type === 'project') {
          await updateProjectMutation.mutateAsync({ 
            id: itemId, 
            updates: { status: '완료' } 
          });
          
          toast({
            title: "프로젝트 완료",
            description: "프로젝트가 완료 상태로 변경되었습니다.",
          });
        } else if (type === 'goal') {
          await updateGoalMutation.mutateAsync({ 
            id: itemId, 
            updates: { status: '완료' } 
          });
          
          toast({
            title: "목표 완료",
            description: "목표가 완료 상태로 변경되었습니다.",
          });
        }
      }
    } catch (error) {
      console.error('Status update failed:', error);
      toast({
        title: "상태 변경 실패",
        description: "상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Render interactive status badge for projects and goals
  const renderInteractiveStatus = (itemId: string, type: 'project' | 'goal', status: string) => {
    const autoCompleteAllowed = canAutoComplete(itemId, type);
    const isCompleted = status === '완료';
    const isClickable = status !== '이슈' && (autoCompleteAllowed || isCompleted);
    
    console.log('🎨 renderInteractiveStatus:', { 
      itemId, 
      type, 
      status, 
      autoCompleteAllowed, 
      isCompleted,
      isClickable
    });
    
    return (
      <Badge 
        variant={getStatusBadgeVariant(status || "진행전")} 
        className={`text-xs ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
        data-testid={`badge-${type}-status-${itemId}`}
        onClick={isClickable ? () => handleStatusClick(itemId, type, status || '진행전') : undefined}
      >
        {status || "진행전"}
      </Badge>
    );
  };
  
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

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            프로젝트 계층 구조
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            프로젝트 → 목표 → 작업 계층으로 구성된 전체 구조를 확인합니다
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
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
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
                          {/* 프로젝트 상태 뱃지 */}
                          {renderInteractiveStatus(project.id, 'project', project.status || '진행전')}
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
                        <ProjectGoalsContent project={project} 
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
                          renderInteractiveStatus={renderInteractiveStatus}
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

// Separate component for project goals content
interface ProjectGoalsContentProps {
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
  renderInteractiveStatus: (itemId: string, type: 'project' | 'goal', status: string) => JSX.Element;
}

function ProjectGoalsContent({ 
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
  setTaskModalState,
  renderInteractiveStatus
}: ProjectGoalsContentProps) {
  // Fetch goals for this project
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
                    {/* 목표 상태 뱃지 */}
                    {renderInteractiveStatus(goal.id, 'goal', goal.status || '진행전')}
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
                <div className="space-y-3 ml-8">
                  {goal.tasks?.map((task) => (
                    <Card 
                      key={task.id} 
                      className="border-l-4 border-l-orange-400 hover:shadow-sm transition-shadow duration-200"
                      data-testid={`card-task-${task.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {/* 상태 표시 */}
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`}></div>
                            
                            {/* 작업 정보 */}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm" data-testid={`text-task-title-${task.id}`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* 오른쪽 정보 */}
                          <div className="flex items-center space-x-3">
                            {/* 담당자 */}
                            {task.assignees && task.assignees.length > 0 && (
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-5 h-5">
                                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {task.assignees[0].initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">
                                  {task.assignees[0].name}
                                </span>
                              </div>
                            )}
                            
                            {/* 마감일 */}
                            {task.deadline && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {formatDeadline(task.deadline)}
                                </span>
                              </div>
                            )}
                            
                            {/* 상태 뱃지 */}
                            <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs" data-testid={`badge-status-${task.id}`}>
                              {task.status}
                            </Badge>
                            
                            {/* 우선순위 */}
                            {task.priority && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-priority-${task.id}`}>
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {(!goal.tasks || goal.tasks.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">이 목표에는 아직 작업이 없습니다</p>
                    </div>
                  )}
                </div>
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