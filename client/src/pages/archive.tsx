import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FolderOpen, Target, Circle, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { SafeTaskWithAssignees, ProjectWithDetails, GoalWithTasks, SafeUser } from "@shared/schema";

export default function Archive() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Get archived items from localStorage
  const archivedItems = (() => {
    try {
      const stored = localStorage.getItem('archivedItems');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  // Filter projects to show only archived ones and their archived children
  const archivedProjects = (projects as ProjectWithDetails[])?.filter(project => {
    const isProjectArchived = archivedItems.includes(project.id);
    
    if (isProjectArchived) {
      return true; // Show archived projects
    }
    
    if (project.goals) {
      // Check if any goals or tasks are archived
      const hasArchivedChildren = project.goals.some(goal => 
        archivedItems.includes(goal.id) || 
        (goal.tasks && goal.tasks.some(task => archivedItems.includes(task.id)))
      );
      return hasArchivedChildren;
    }
    
    return false;
  }).map(project => {
    const isProjectArchived = archivedItems.includes(project.id);
    
    if (isProjectArchived) {
      return project; // Show full project if archived
    }
    
    // Show only archived goals and tasks
    const archivedGoals = project.goals?.filter(goal => 
      archivedItems.includes(goal.id) || 
      (goal.tasks && goal.tasks.some(task => archivedItems.includes(task.id)))
    ).map(goal => ({
      ...goal,
      tasks: goal.tasks?.filter(task => archivedItems.includes(task.id)) || []
    })) || [];
    
    return {
      ...project,
      goals: archivedGoals
    };
  }) || [];

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const [_, setLocation] = useLocation();
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSelectionToast, setShowSelectionToast] = useState(false);
  
  const { toast } = useToast();

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleGoal = (goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  // Show/hide toast based on selection
  useEffect(() => {
    setShowSelectionToast(selectedItems.size > 0);
  }, [selectedItems.size]);

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const moveToList = () => {
    try {
      const existingArchived = localStorage.getItem('archivedItems');
      const archivedItems = existingArchived ? JSON.parse(existingArchived) : [];
      
      // Remove selected items from archived list
      const selectedArray = Array.from(selectedItems);
      const newArchivedItems = archivedItems.filter((itemId: string) => !selectedArray.includes(itemId));
      localStorage.setItem('archivedItems', JSON.stringify(newArchivedItems));
      
      toast({
        title: "리스트로 이동 완료",
        description: `${selectedItems.size}개 항목이 리스트로 이동되었습니다.`,
      });
      clearSelection();
      
      // Refresh the page to show updated archived items
      window.location.reload();
    } catch (error) {
      toast({
        title: "오류",
        description: "리스트로 이동하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getUserById = (userId: string): SafeUser | undefined => {
    return (users as SafeUser[])?.find(user => user.id === userId);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
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
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/list')}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">보관함</h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">보관된 프로젝트, 목표, 작업을 관리합니다</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">

      {/* Table Header */}
      <div className="bg-muted/30 p-3 rounded-t-lg border">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">이름</div>
          <div className="col-span-1">마감일</div>
          <div className="col-span-1">담당자</div>
          <div className="col-span-2">라벨</div>
          <div className="col-span-1">상태</div>
          <div className="col-span-2">진행도</div>
          <div className="col-span-1">중요도</div>
        </div>
      </div>

      {/* Content */}
      <Card className="rounded-t-none">
        <CardContent className="p-0">
          {(!archivedProjects || archivedProjects.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>보관된 항목이 없습니다</p>
              <p className="text-sm mt-1">리스트에서 항목을 보관해주세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {archivedProjects.map((project) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' ? 'opacity-50' : ''}`}>
                    <div className="grid grid-cols-12 gap-4 items-center">
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
                        <button 
                          className="font-medium hover:text-blue-600 cursor-pointer transition-colors text-left" 
                          onClick={() => setLocation(`/detail/project/${project.id}`)}
                          data-testid={`text-project-name-${project.id}`}
                        >
                          {project.name}
                        </button>
                        <Badge variant="outline" className="text-xs">
                          {project.code}
                        </Badge>
                      </div>
                      <div className="col-span-1">
                        <div className="cursor-default hover:bg-muted/20 px-1 py-1 rounded text-sm" data-testid={`text-project-deadline-${project.id}`}>
                          {formatDate(project.deadline)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center gap-2">
                          {project.owners && project.owners.length > 0 ? (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-blue-600 text-white">
                                  {project.owners[0].initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{project.owners[0].name}</span>
                              {project.owners.length > 1 && (
                                <span className="text-xs text-muted-foreground">+{project.owners.length - 1}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex gap-1">
                          {project.labels && project.labels.length > 0 ? (
                            project.labels.map((label, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {label}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Badge 
                          variant={project.status === '완료' ? 'default' : project.progressPercentage === 0 ? 'outline' : 'secondary'}
                          className="text-xs cursor-default"
                          data-testid={`status-${project.id}`}
                        >
                          {project.status || (project.progressPercentage === 0 ? '진행전' : project.progressPercentage === 100 ? '완료' : '진행중')}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 px-1 py-1">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.progressPercentage || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground min-w-[2ch]">
                            {project.progressPercentage || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <span className="text-muted-foreground text-xs">-</span>
                      </div>
                    </div>
                  </div>

                  {/* Goals */}
                  {expandedProjects.has(project.id) && project.goals && (
                    <div className="bg-muted/20">
                      {project.goals.map((goal) => (
                        <div key={goal.id}>
                          {/* Goal Row */}
                          <div className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' || goal.status === '완료' ? 'opacity-50' : ''}`}>
                            <div className="grid grid-cols-12 gap-4 items-center">
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
                                <button 
                                  className="font-medium hover:text-green-600 cursor-pointer transition-colors text-left" 
                                  onClick={() => setLocation(`/detail/goal/${goal.id}`)}
                                  data-testid={`text-goal-name-${goal.id}`}
                                >
                                  {goal.title}
                                </button>
                              </div>
                              <div className="col-span-1">
                                <div className="cursor-default hover:bg-muted/20 px-1 py-1 rounded text-sm" data-testid={`text-goal-deadline-${goal.id}`}>
                                  {formatDate(goal.deadline)}
                                </div>
                              </div>
                              <div className="col-span-1">
                                <div className="flex items-center gap-2">
                                  {goal.assignees && goal.assignees.length > 0 ? (
                                    <>
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs bg-green-600 text-white">
                                          {goal.assignees[0].initials}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">{goal.assignees[0].name}</span>
                                      {goal.assignees.length > 1 && (
                                        <span className="text-xs text-muted-foreground">+{goal.assignees.length - 1}</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <div className="flex gap-1">
                                  {goal.labels && goal.labels.length > 0 ? (
                                    goal.labels.map((label, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {label}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-1">
                                <Badge 
                                  variant={goal.status === '완료' ? 'default' : goal.progressPercentage === 0 ? 'outline' : 'secondary'}
                                  className="text-xs cursor-default"
                                  data-testid={`status-${goal.id}`}
                                >
                                  {goal.status || (goal.progressPercentage === 0 ? '진행전' : goal.progressPercentage === 100 ? '완료' : '진행중')}
                                </Badge>
                              </div>
                              <div className="col-span-2">
                                <div className="flex items-center gap-2 px-1 py-1">
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${goal.progressPercentage || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground min-w-[2ch]">
                                    {goal.progressPercentage || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-1">
                                <span className="text-muted-foreground text-xs">-</span>
                              </div>
                            </div>
                          </div>

                          {/* Tasks */}
                          {expandedGoals.has(goal.id) && goal.tasks && (
                            <div className="bg-muted/30">
                              {goal.tasks.map((task) => (
                                <div key={task.id} className={`p-3 hover:bg-muted/50 transition-colors ${project.status === '완료' || goal.status === '완료' || task.status === '완료' ? 'opacity-50' : ''}`}>
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 flex items-center gap-2 ml-16">
                                      <Checkbox
                                        checked={selectedItems.has(task.id)}
                                        onCheckedChange={() => toggleItemSelection(task.id)}
                                        data-testid={`checkbox-task-${task.id}`}
                                      />
                                      <Circle className="w-4 h-4 text-orange-600" />
                                      <button 
                                        className="font-medium hover:text-orange-600 cursor-pointer transition-colors text-left" 
                                        onClick={() => setLocation(`/detail/task/${task.id}`)}
                                        data-testid={`text-task-name-${task.id}`}
                                      >
                                        {task.title}
                                      </button>
                                    </div>
                                    <div className="col-span-1">
                                      <div className="cursor-default hover:bg-muted/20 px-1 py-1 rounded text-sm" data-testid={`text-task-deadline-${task.id}`}>
                                        {formatDate(task.deadline)}
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      <div className="flex items-center gap-2">
                                        {task.assignees && task.assignees.length > 0 ? (
                                          <>
                                            <Avatar className="h-6 w-6">
                                              <AvatarFallback className="text-xs bg-orange-600 text-white">
                                                {task.assignees[0].initials}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{task.assignees[0].name}</span>
                                            {task.assignees.length > 1 && (
                                              <span className="text-xs text-muted-foreground">+{task.assignees.length - 1}</span>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="col-span-2">
                                      <div className="flex gap-1">
                                        {task.labels && task.labels.length > 0 ? (
                                          task.labels.map((label, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                              {label}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      <Badge 
                                        variant={task.status === '완료' ? 'default' : task.progress === 0 ? 'outline' : 'secondary'}
                                        className="text-xs cursor-default"
                                        data-testid={`status-${task.id}`}
                                      >
                                        {task.status || (task.progress === 0 ? '진행전' : task.progress === 100 ? '완료' : '진행중')}
                                      </Badge>
                                    </div>
                                    <div className="col-span-2">
                                      <div className="flex items-center gap-2 px-1 py-1">
                                        <div className="w-full bg-muted rounded-full h-2">
                                          <div 
                                            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${task.progress || 0}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-muted-foreground min-w-[2ch]">
                                          {task.progress || 0}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      <Badge variant="outline" className="text-xs">
                                        중간
                                      </Badge>
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

      </main>

      {/* Selection Toast */}
      {showSelectionToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedItems.size}개 선택됨
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-white hover:bg-slate-700 h-8 px-3"
            >
              취소
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={moveToList}
              className="text-white hover:bg-slate-700 h-8 px-3"
              data-testid="button-move-to-list"
            >
              리스트로 이동
            </Button>
          </div>
        </div>
      )}
    </>
  );
}