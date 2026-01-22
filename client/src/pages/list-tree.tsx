import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Target,
  Circle,
  Plus,
  Calendar,
  User,
  BarChart3,
  Check,
  X,
  Tag,
  Mail,
  UserPlus,
  Trash2,
  Archive,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type {
  SafeTaskWithAssignees,
  ProjectWithDetails,
  GoalWithTasks,
  SafeUser,
} from "@shared/schema";
import { ProjectModal } from "@/components/project-modal";
import { GoalModal } from "@/components/goal-modal";
import { TaskModal } from "@/components/task-modal";
import { apiRequest } from "@/lib/queryClient";
import { KoreanDatePicker } from "@/components/korean-date-picker";
import { parse } from "date-fns";
import {
  mapPriorityToLabel,
  getPriorityBadgeVariant,
} from "@/lib/priority-utils";
import api from "@/api/api-index";
import { flushSync } from "react-dom";

export default function ListTree() {
  const { id: workspaceId } = useParams();

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error,
  } = useQuery({
    queryKey: ["/api/workspaces", workspaceId, "projects"],

    queryFn: async () => {
      const response = await api.get(`/api/workspaces/${workspaceId}/projects`);
      return response.data;
    },
    enabled: !!workspaceId,

    staleTime: 300000, // 5분
    refetchOnWindowFocus: true,
  });

  const { data: archivedProjects, isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ["/api/workspaces", workspaceId, "archive", "projects"],

    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/archive/projects`,
      );
      return response.data;
    },

    enabled: !!workspaceId,
  });

  const { data: goals } = useQuery({
    queryKey: ["/api/workspaces", workspaceId, "goals"],

    queryFn: async () => {
      const response = await api.get(`/api/workspaces/${workspaceId}/goals`);
      return response.data;
    },
    enabled: !!workspaceId,

    staleTime: 300000, // 5분
    refetchOnWindowFocus: true,
  });

  const activeProjects = projects as ProjectWithDetails[];

  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSelectionToast, setShowSelectionToast] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("하이더");

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [goalModalState, setGoalModalState] = useState<{
    isOpen: boolean;
    projectId: string;
    projectTitle: string;
  }>({
    isOpen: false,
    projectId: "",
    projectTitle: "",
  });
  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    goalId: string;
    goalTitle: string;
  }>({
    isOpen: false,
    goalId: "",
    goalTitle: "",
  });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("팀원");
  const [usernameError, setUsernameError] = useState("");
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [deletedMemberIds, setDeletedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [renderKey, setRenderKey] = useState(0);

  const useOnClickOutside = (ref: any, handler: any) => {
    useEffect(() => {
      const listener = (event: { target: any }) => {
        // ref가 없거나, 클릭한 요소가 ref 내부의 요소라면 무시
        if (!ref.current || ref.current.contains(event.target)) {
          return;
        }
        const targetElement = event.target;

        const isInsideSelectContent = targetElement.closest(
          "[data-radix-popper-content-wrapper], .your-select-content-class",
        );

        if (isInsideSelectContent) {
          return; // SelectContent 내부 클릭은 무시
        }

        handler(event);
      };

      // 이벤트 리스너 등록
      document.addEventListener("mousedown", listener);
      document.addEventListener("touchstart", listener);

      // 클린업 함수: 컴포넌트 언마운트 시 리스너 제거
      return () => {
        document.removeEventListener("mousedown", listener);
        document.removeEventListener("touchstart", listener);
      };
    }, [ref, handler]);
  };

  const wrapperRef = useRef(null);

  const getInitialExpandedState = (key: string): Set<string> => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        // 저장된 JSON 문자열을 Set으로 변환하여 반환
        return new Set(JSON.parse(saved));
      } catch {
        return new Set(); // 파싱 오류 시 빈 Set 반환
      }
    }
    return new Set(); // 저장된 것이 없을 시 빈 Set 반환
  };
  // 2. 상태를 선언할 때 이 함수를 사용
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    getInitialExpandedState("LIST_expandedProjectIds"), // 'expandedProjectIds'라는 키로 저장
  );
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(
    getInitialExpandedState("LIST_expandedGoalIds"), // 'expandedGoalIds'라는 키로 저장
  );

  // Inline editing state
  const [editingField, setEditingField] = useState<{
    itemId: string;
    field: string;
    type: "project" | "goal" | "task";
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Local state to track completed items
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // Load workspace name from localStorage
  useEffect(() => {
    const storedWorkspaceName = localStorage.getItem("workspaceName");
    if (storedWorkspaceName) {
      setWorkspaceName(storedWorkspaceName);
    }

    // Listen for workspace name updates
    const handleWorkspaceNameUpdate = () => {
      const updatedName = localStorage.getItem("workspaceName");
      if (updatedName) {
        setWorkspaceName(updatedName);
      }
    };

    window.addEventListener("workspaceNameUpdated", handleWorkspaceNameUpdate);
    return () => {
      window.removeEventListener(
        "workspaceNameUpdated",
        handleWorkspaceNameUpdate,
      );
    };
  }, []);

  // Sync database completion state with local state when projects data changes
  useEffect(() => {
    if (projects && Array.isArray(projects)) {
      // Create a completely new Set based only on database state
      const newCompletedItems = new Set<string>();

      // Add projects that are completed in database
      (projects as ProjectWithDetails[]).forEach((project) => {
        if (project.status === "완료") {
          newCompletedItems.add(project.id);
        }

        // Add goals that are completed in database
        if (project.goals) {
          project.goals.forEach((goal) => {
            if (goal.status === "완료") {
              newCompletedItems.add(goal.id);
            }
          });
        }
      });

      setCompletedItems(newCompletedItems);
    }
  }, [projects]);

  const archivedGoalCounts = useMemo(() => {
    const countMap = new Map<string, number>();
    archivedProjects?.forEach((ap) => {
      countMap.set(String(ap.id), ap.goals?.length || 0);
    });
    return countMap;
  }, [archivedProjects]);

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["workspace-members", workspaceId],

    queryFn: async () => {
      const response = await api.get(`/api/workspaces/${workspaceId}/users`);
      return response.data;
    },

    enabled: !!workspaceId,

    staleTime: 300000,
    refetchOnWindowFocus: true,
  });

  // Get current user's role to check if they can delete members
  const currentUserEmail = localStorage.getItem("userEmail") || "";
  const currentUser = (users as SafeUser[] | undefined)?.find(
    (u) => u.email === currentUserEmail,
  );
  const isCurrentUserAdmin = currentUser?.role === "관리자";

  const queryClient = useQueryClient();

  // 멤버 삭제 mutation (관리자 페이지와 동일한 로직)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // 1. API 경로를 관리자 페이지와 동일하게 워크스페이스 기반으로 수정
      return apiRequest(
        "DELETE",
        `/api/workspaces/${workspaceId}/workspaceMembers/${userId}`,
        {},
        { "X-User-Email": currentUserEmail },
      );
    },
    onSuccess: () => {
      // 2. 관리자 페이지에서 사용하던 쿼리 무효화 로직을 그대로 적용
      // 명시적인 쿼리 키 무효화
      queryClient.invalidateQueries({
        queryKey: ["workspace-members", workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["users-stats", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });

      // 3. predicate를 사용하여 /api/로 시작하는 모든 관련 캐시 삭제
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) => {
          const key = queryKey[0] as string;

          return (
            key?.startsWith("/api/users") ||
            key?.startsWith("/api/projects") ||
            key?.startsWith("/api/goals") ||
            key?.startsWith("/api/tasks") ||
            key?.startsWith("/api/meetings")
          );
        },
      });

      toast({
        title: "멤버 삭제 완료",
        description: "멤버가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("멤버 삭제 실패:", error);
      toast({
        title: "멤버 삭제 실패",
        description: "멤버 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Function to update progress for parent items (goals and projects) by modifying child tasks
  const updateProgressForParentItem = async (
    itemId: string,
    type: "goal" | "project",
    targetProgress: number,
  ): Promise<number> => {
    if (!projects) return targetProgress;

    let childTasks: SafeTaskWithAssignees[] = [];

    if (type === "goal") {
      // Find all tasks under this goal
      (projects as ProjectWithDetails[]).forEach((project) => {
        const goal = project.goals?.find((g) => g.id === itemId);
        if (goal?.tasks) {
          childTasks = goal.tasks;
        }
      });
    } else if (type === "project") {
      // Find all tasks under all goals in this project
      const project = (projects as ProjectWithDetails[]).find(
        (p) => p.id === itemId,
      );
      if (project?.goals) {
        project.goals.forEach((goal) => {
          if (goal.tasks) {
            childTasks.push(...goal.tasks);
          }
        });
      }
      // Also include direct project tasks if any
      if (project?.tasks) {
        childTasks.push(...project.tasks);
      }
    }

    if (childTasks.length === 0) return targetProgress;

    // Improved progress calculation algorithm
    const totalTasks = childTasks.length;

    // Get current distribution
    const currentDistribution = childTasks.reduce(
      (acc, task) => {
        if (task.status === "완료") acc.completed++;
        else if (task.status === "진행중") acc.inProgress++;
        else acc.notStarted++;
        return acc;
      },
      { completed: 0, inProgress: 0, notStarted: 0 },
    );

    const currentProgress =
      (currentDistribution.completed * 100 +
        currentDistribution.inProgress * 50) /
      totalTasks;

    // Find optimal distribution with preference for minimal changes
    let bestDistribution = currentDistribution;
    let bestError = Math.abs(currentProgress - targetProgress);
    let bestChangeCount = 0;

    // Try all possible combinations, preferring distributions with fewer changes
    for (let completed = 0; completed <= totalTasks; completed++) {
      for (
        let inProgress = 0;
        inProgress <= totalTasks - completed;
        inProgress++
      ) {
        const notStarted = totalTasks - completed - inProgress;
        const actualProgress = (completed * 100 + inProgress * 50) / totalTasks;
        const error = Math.abs(actualProgress - targetProgress);

        // Calculate how many task status changes would be needed
        const changeCount =
          Math.abs(completed - currentDistribution.completed) +
          Math.abs(inProgress - currentDistribution.inProgress) +
          Math.abs(notStarted - currentDistribution.notStarted);

        // Prefer solution with lower error, or same error with fewer changes
        if (
          error < bestError ||
          (error === bestError && changeCount < bestChangeCount)
        ) {
          bestError = error;
          bestDistribution = { completed, inProgress, notStarted };
          bestChangeCount = changeCount;
        }
      }
    }

    const finalProgress =
      (bestDistribution.completed * 100 + bestDistribution.inProgress * 50) /
      totalTasks;

    // Deterministic task assignment to exactly match target distribution
    const updates: Array<{ task: SafeTaskWithAssignees; newStatus: string }> =
      [];

    // Create target assignment arrays for each status
    const targetAssignment: { [status: string]: SafeTaskWithAssignees[] } = {
      진행전: [],
      진행중: [],
      완료: [],
    };

    // Group tasks by current status
    const tasksByStatus = {
      진행전: childTasks.filter((t) => t.status === "진행전"),
      진행중: childTasks.filter((t) => t.status === "진행중"),
      완료: childTasks.filter((t) => t.status === "완료"),
    };

    // First, assign tasks that can keep their current status (minimize changes)
    const keepNotStarted = Math.min(
      tasksByStatus["진행전"].length,
      bestDistribution.notStarted,
    );
    const keepInProgress = Math.min(
      tasksByStatus["진행중"].length,
      bestDistribution.inProgress,
    );
    const keepCompleted = Math.min(
      tasksByStatus["완료"].length,
      bestDistribution.completed,
    );

    targetAssignment["진행전"].push(
      ...tasksByStatus["진행전"].slice(0, keepNotStarted),
    );
    targetAssignment["진행중"].push(
      ...tasksByStatus["진행중"].slice(0, keepInProgress),
    );
    targetAssignment["완료"].push(
      ...tasksByStatus["완료"].slice(0, keepCompleted),
    );

    // Collect remaining tasks that need reassignment
    const remainingTasks = [
      ...tasksByStatus["진행전"].slice(keepNotStarted),
      ...tasksByStatus["진행중"].slice(keepInProgress),
      ...tasksByStatus["완료"].slice(keepCompleted),
    ];

    // Calculate remaining slots needed for each status
    const remainingSlots = {
      진행전: bestDistribution.notStarted - keepNotStarted,
      진행중: bestDistribution.inProgress - keepInProgress,
      완료: bestDistribution.completed - keepCompleted,
    };

    // Assign remaining tasks to fill the remaining slots, preferring minimal status changes
    let taskIndex = 0;

    // Sort remaining tasks by how close they are to their target status (prefer one-step changes)
    remainingTasks.sort((a, b) => {
      const getStatusOrder = (status: string) => {
        if (status === "진행전") return 0;
        if (status === "진행중") return 1;
        return 2; // '완료'
      };

      const aOrder = getStatusOrder(a.status);
      const bOrder = getStatusOrder(b.status);
      return aOrder - bOrder;
    });

    // Fill remaining slots in order of preference
    for (const status of ["진행전", "진행중", "완료"] as const) {
      while (remainingSlots[status] > 0 && taskIndex < remainingTasks.length) {
        targetAssignment[status].push(remainingTasks[taskIndex]);
        remainingSlots[status]--;
        taskIndex++;
      }
    }

    // Generate updates for tasks that changed status
    for (const [targetStatus, tasks] of Object.entries(targetAssignment)) {
      for (const task of tasks) {
        if (task.status !== targetStatus) {
          updates.push({ task, newStatus: targetStatus });
        }
      }
    }

    // Verify the final distribution
    const finalDistribution = {
      completed: targetAssignment["완료"].length,
      inProgress: targetAssignment["진행중"].length,
      notStarted: targetAssignment["진행전"].length,
    };

    if (
      finalDistribution.completed !== bestDistribution.completed ||
      finalDistribution.inProgress !== bestDistribution.inProgress ||
      finalDistribution.notStarted !== bestDistribution.notStarted
    ) {
      console.error(
        "Distribution mismatch! Target:",
        bestDistribution,
        "Actual:",
        finalDistribution,
      );
    }

    // Apply updates using direct API calls to avoid individual query invalidations
    const updatePromises = updates.map(async (update) => {
      try {
        await apiRequest("PUT", `/api/tasks/${update.task.id}`, {
          status: update.newStatus,
        });
        return { success: true, update };
      } catch (error) {
        console.error(`Failed to update task "${update.task.title}":`, error);
        return { success: false, update, error };
      }
    });

    const results = await Promise.allSettled(updatePromises);
    const failedUpdates = results.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.success),
    );

    if (failedUpdates.length > 0) {
      console.error(`${failedUpdates.length} task updates failed`);
      throw new Error(
        `${failedUpdates.length} out of ${updates.length} task updates failed`,
      );
    }

    // Invalidate queries once after all updates are complete
    // queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    // queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({
      queryKey: ["/api/workspaces", workspaceId, "projects"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/workspaces", workspaceId, "tasks"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/workspaces", workspaceId, "activities"],
    });

    // Return the actual achieved progress
    return finalProgress;
  };

  // Show/hide toast based on selection
  useEffect(() => {
    setShowSelectionToast(selectedItems.size > 0);
  }, [selectedItems.size]);

  // 상태 변경 시 localStorage에 저장하는 로직을 추가합니다.
  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }

    setExpandedProjects(newExpanded);

    // 👈 **추가된 부분:** 상태를 로컬 저장소에 반영
    localStorage.setItem(
      "LIST_expandedProjectIds",
      JSON.stringify(Array.from(newExpanded)),
    );
  };

  // 3. 상태 변경 시 localStorage에 저장하는 로직을 추가합니다.
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }

    setExpandedGoals(newExpanded);

    // 👈 **추가된 부분:** 상태를 로컬 저장소에 반영
    localStorage.setItem(
      "LIST_expandedGoalIds",
      JSON.stringify(Array.from(newExpanded)),
    );
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);

    // Helper function to find all child items of a project or goal
    const getChildItems = (
      parentId: string,
      parentType: "project" | "goal",
    ): string[] => {
      const childIds: string[] = [];

      if (parentType === "project") {
        // Find all goals and tasks under this project
        const project = (projects as ProjectWithDetails[])?.find(
          (p) => p.id === parentId,
        );
        if (project?.goals) {
          project.goals.forEach((goal) => {
            childIds.push(goal.id);
            if (goal.tasks) {
              goal.tasks.forEach((task) => {
                childIds.push(task.id);
              });
            }
          });
        }
      } else if (parentType === "goal") {
        // Find all tasks under this goal
        (projects as ProjectWithDetails[])?.forEach((project) => {
          const goal = project.goals?.find((g) => g.id === parentId);
          if (goal?.tasks) {
            goal.tasks.forEach((task) => {
              childIds.push(task.id);
            });
          }
        });
      }

      return childIds;
    };

    // Helper function to find parent items
    const getParentItems = (
      childId: string,
    ): { projectId?: string; goalId?: string } => {
      for (const project of (projects as ProjectWithDetails[]) || []) {
        // Check if this is a goal of the project
        const goal = project.goals?.find((g) => g.id === childId);
        if (goal) {
          return { projectId: project.id };
        }

        // Check if this is a task of any goal in the project
        for (const goal of project.goals || []) {
          const task = goal.tasks?.find((t) => t.id === childId);
          if (task) {
            return { projectId: project.id, goalId: goal.id };
          }
        }
      }
      return {};
    };

    // Determine the type of the selected item
    let itemType: "project" | "goal" | "task" = "task";
    const isProject = (projects as ProjectWithDetails[])?.some(
      (p) => p.id === itemId,
    );
    if (isProject) {
      itemType = "project";
    } else {
      // Check if it's a goal
      const isGoal = (projects as ProjectWithDetails[])?.some((p) =>
        p.goals?.some((g) => g.id === itemId),
      );
      if (isGoal) {
        itemType = "goal";
      }
    }

    // For parent items (project/goal), check if they should be considered "selected"
    // either directly or because all their children are selected
    let isCurrentlySelected = newSelected.has(itemId);
    if (
      !isCurrentlySelected &&
      (itemType === "project" || itemType === "goal")
    ) {
      const childIds = getChildItems(itemId, itemType);
      // Consider parent selected if all children are selected
      if (childIds.length > 0) {
        isCurrentlySelected = childIds.every((childId) =>
          newSelected.has(childId),
        );
      }
    }

    if (isCurrentlySelected) {
      // Deselecting: remove the item and all its children
      newSelected.delete(itemId);

      if (itemType === "project" || itemType === "goal") {
        const childIds = getChildItems(itemId, itemType);
        childIds.forEach((childId) => newSelected.delete(childId));
      }
    } else {
      // Selecting: add the item and all its children
      newSelected.add(itemId);

      if (itemType === "project" || itemType === "goal") {
        const childIds = getChildItems(itemId, itemType);
        childIds.forEach((childId) => newSelected.add(childId));
      }
    }

    setSelectedItems(newSelected);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Delete selected items
  const deleteSelectedItems = async () => {
    const selectedArray = Array.from(selectedItems);

    try {
      // Categorize selected items by type
      const projectIds: string[] = [];
      const goalIds: string[] = [];
      const taskIds: string[] = [];

      selectedArray.forEach((itemId) => {
        // Check if it's a project
        const isProject = (projects as ProjectWithDetails[])?.some(
          (p) => p.id === itemId,
        );
        if (isProject) {
          projectIds.push(itemId);
          return;
        }

        // Check if it's a goal
        const isGoal = (projects as ProjectWithDetails[])?.some((p) =>
          p.goals?.some((g) => g.id === itemId),
        );
        if (isGoal) {
          goalIds.push(itemId);
          return;
        }

        // Otherwise it's a task
        taskIds.push(itemId);
      });

      // Delete tasks first (to avoid foreign key conflicts)
      for (const taskId of taskIds) {
        await deleteTaskMutation.mutateAsync(taskId);
      }

      // Then delete goals
      for (const goalId of goalIds) {
        await deleteGoalMutation.mutateAsync(goalId);
      }

      // Finally delete projects
      for (const projectId of projectIds) {
        await deleteProjectMutation.mutateAsync(projectId);
      }

      // Clear selection after successful deletion
      clearSelection();
    } catch (error) {
      console.error("Failed to delete selected items:", error);
      // TODO: Show error toast to user
    }
  };

  // Inline editing functions
  const startEditing = (
    itemId: string,
    field: string,
    type: "project" | "goal" | "task",
    currentValue: string,
  ) => {
    setEditingField({ itemId, field, type });
    setEditingValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditingValue("");
  };

  const handleClickOutside = useCallback(() => {
    cancelEditing();
  }, [cancelEditing]);

  useOnClickOutside(wrapperRef, handleClickOutside);

  // Mutations for updating items
  const updateProjectMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/projects/${data.id}`, data.updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      // await queryClient.cancelQueries({ queryKey: ["/api/projects"] });
      const projectKey = ["/api/workspaces", workspaceId, "projects"];
      await queryClient.cancelQueries({ queryKey: projectKey });

      // Snapshot the previous value
      // const previousProjects = queryClient.getQueryData(["/api/projects"]);
      const previousProjects = queryClient.getQueryData(projectKey);

      // Optimistically update the cache
      // queryClient.setQueryData(
      //   ["/api/projects"],
      //   (old: ProjectWithDetails[] | undefined) => {
      //     if (!old) return old;

      //     return old.map((project) =>
      //       project.id === id ? { ...project, ...updates } : project
      //     );
      //   }
      // );
      queryClient.setQueryData(
        projectKey,
        (old: ProjectWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((project) =>
            project.id === id ? { ...project, ...updates } : project,
          );
        },
      );

      return { previousProjects };
    },
    onError: (err, newProject, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/goals/${data.id}`, data.updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      // await queryClient.cancelQueries({ queryKey: ["/api/projects"] });
      const projectKey = ["/api/workspaces", workspaceId, "projects"];
      await queryClient.cancelQueries({ queryKey: projectKey });

      // Snapshot the previous value
      // const previousProjects = queryClient.getQueryData(["/api/projects"]);
      const previousProjects = queryClient.getQueryData(projectKey);

      // Optimistically update the cache
      // queryClient.setQueryData(
      //   ["/api/projects"],
      //   (old: ProjectWithDetails[] | undefined) => {
      //     if (!old) return old;

      //     return old.map((project) => ({
      //       ...project,
      //       goals: project.goals?.map((goal) =>
      //         goal.id === id ? { ...goal, ...updates } : goal
      //       ),
      //     }));
      //   }
      // );
      queryClient.setQueryData(
        projectKey,
        (old: ProjectWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((project) => ({
            ...project,
            goals: project.goals?.map((goal) =>
              goal.id === id ? { ...goal, ...updates } : goal,
            ),
          }));
        },
      );

      return { previousProjects };
    },
    onError: (err, newGoal, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/tasks/${data.id}`, data.updates);
    },
    onMutate: async ({ id, updates }) => {
      const projectKey = ["/api/workspaces", workspaceId, "projects"];

      await queryClient.cancelQueries({ queryKey: projectKey });
      const previousProjects = queryClient.getQueryData(projectKey);

      if (updates.progress === undefined) {
        queryClient.setQueryData(
          projectKey,
          (old: ProjectWithDetails[] | undefined) => {
            if (!old) return old;
            return old.map((project) => ({
              ...project,
              goals: project.goals?.map((goal) => ({
                ...goal,
                tasks: goal.tasks?.map((task) =>
                  task.id === id ? { ...task, ...updates } : task,
                ),
              })),
            }));
          },
        );
      }

      return { previousProjects, taskId: id, updates };
    },
    onSuccess: async (data, variables) => {
      const { id: taskId, updates } = variables;
      const projectKey = ["/api/workspaces", workspaceId, "projects"];
      const currentProjects = queryClient.getQueryData(
        projectKey,
      ) as ProjectWithDetails[];

      if (currentProjects) {
        for (const project of currentProjects) {
          for (const goal of project.goals || []) {
            const task = goal.tasks?.find((t) => t.id === taskId);
            if (task) {
              // Found the parent goal and project
              let statusChanges: string[] = [];

              // Check if parent goal is completed and reset it
              if (goal.status === "완료") {
                try {
                  await updateGoalMutation.mutateAsync({
                    id: goal.id,
                    updates: { status: "진행중" },
                  });

                  // Remove goal from local completed items set
                  setCompletedItems((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(goal.id);
                    return newSet;
                  });

                  statusChanges.push("목표");
                } catch (error) {
                  console.error(
                    "Failed to reset goal completion status:",
                    error,
                  );
                }
              }

              // Check if parent project is completed and reset it
              if (project.status === "완료") {
                try {
                  await updateProjectMutation.mutateAsync({
                    id: project.id,
                    updates: { status: "진행중" },
                  });

                  // Remove project from local completed items set
                  setCompletedItems((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(project.id);
                    return newSet;
                  });

                  statusChanges.push("프로젝트");
                } catch (error) {
                  console.error(
                    "Failed to reset project completion status:",
                    error,
                  );
                }
              }

              // Show toast if any status was changed
              if (statusChanges.length > 0) {
                toast({
                  title: "상태 변경",
                  description: `하위 작업 수정으로 인해 ${statusChanges.join(
                    "과 ",
                  )} 완료 상태가 해제되었습니다.`,
                });
              }

              return; // Found the project, stop searching
            }
          }
        }
      }
    },
    onError: (err, newTask, context) => {
      // Revert the optimistic update on error
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["/api/workspaces", workspaceId, "projects"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/api/workspaces", workspaceId, "tasks"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/api/workspaces", workspaceId, "activities"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/api/workspaces", workspaceId, "stats"],
        }),
      ]);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/workspaces", workspaceId],
      });

      // 캐시에서 즉시 제거
      queryClient.setQueryData(
        ["/api/workspaces", workspaceId, "projects"],
        (old: any) => old?.filter((p: any) => p.id !== projectId),
      );
    },
    onSettled: () => {
      // ✅ 활동 피드를 다시 불러오도록 신호를 보냄
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "activities"],
      });
      // 프로젝트 목록도 갱신
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
    onSuccess: () => {
      toast({
        title: "프로젝트 삭제 완료",
        description: "프로젝트와 모든 하위 항목이 삭제되었습니다.",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/goals/${id}`);
    },
    // 1. 서버 응답 전 UI를 먼저 수정 (낙관적 업데이트)
    onMutate: async (deletedGoalId) => {
      // 진행 중인 워크스페이스 관련 쿼리 취소 (데이터 덮어쓰기 방지)
      await queryClient.cancelQueries({
        queryKey: ["/api/workspaces", workspaceId],
      });

      // 에러 발생 시 복구를 위한 이전 상태 저장 (Snapshot)
      const previousGoals = queryClient.getQueryData([
        "/api/workspaces",
        workspaceId,
        "goals",
      ]);
      const previousTasks = queryClient.getQueryData([
        "/api/workspaces",
        workspaceId,
        "tasks",
      ]);

      // 캐시에서 삭제할 목표 제거
      queryClient.setQueryData(
        ["/api/workspaces", workspaceId, "goals"],
        (old: any) => old?.filter((g: any) => g.id !== deletedGoalId),
      );

      // 캐시에서 해당 목표에 속한 태스크들도 즉시 제거
      queryClient.setQueryData(
        ["/api/workspaces", workspaceId, "tasks"],
        (old: any) => old?.filter((t: any) => t.goalId !== deletedGoalId),
      );

      // 복구용 컨텍스트 반환
      return { previousGoals, previousTasks };
    },
    // 2. 에러 발생 시 이전 상태로 롤백
    onError: (err, deletedGoalId, context) => {
      if (context) {
        queryClient.setQueryData(
          ["/api/workspaces", workspaceId, "goals"],
          context.previousGoals,
        );
        queryClient.setQueryData(
          ["/api/workspaces", workspaceId, "tasks"],
          context.previousTasks,
        );
      }
      toast({
        title: "삭제 실패",
        description: "목표 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    // 3. 성공/실패 여부와 상관없이 서버와 데이터 동기화
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "activities"],
      });
      // 프로젝트 목록도 갱신
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "goal"],
      });
    },
    onSuccess: () => {
      toast({
        title: "목표 삭제 완료",
        description: "목표와 모든 하위 항목이 삭제되었습니다.",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      // 1. ⭐ 문자열 백틱 대신 콤마(,)로 구분된 배열 구조 사용
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "tasks"],
      });

      // 2. 통계 데이터도 동일한 구조로 무효화
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "stats"],
      });

      // 3. (선택사항) 만약 프로젝트 목록의 진행률도 바뀌어야 한다면
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "activities"],
      });

      toast({
        title: "작업 삭제 완료",
        description: "작업이 성공적으로 삭제되었습니다.",
      });
    },
  });

  // Archive mutations for database-based archive functionality
  const archiveProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/projects/${id}/archive`);
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/archive/projects"] });
      // ✅ 해당 워크스페이스의 프로젝트 리스트 즉시 갱신
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "archive", "projects"],
      });
      // 일반 프로젝트 리스트 쿼리도 무효화 (목록에서 사라지게 하기 위함)
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "projects"],
      });
      toast({
        title: "프로젝트 보관 완료",
        description: "프로젝트가 성공적으로 보관되었습니다.",
      });
    },
  });

  const archiveGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/goals/${id}/archive`);
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/archive/goals"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/archive/goals", workspaceId],
      });
      // 만약 목표 리스트를 따로 관리한다면 아래 추가
      queryClient.invalidateQueries({ queryKey: ["/api/goals", workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "archive", "goals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "archive", "projects"],
      });

      toast({
        title: "목표 보관 완료",
        description: "목표가 성공적으로 보관되었습니다.",
      });
    },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/tasks/${id}/archive`);
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/archive/tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/archive/tasks", workspaceId],
      });
      toast({
        title: "작업 보관 완료",
        description: "작업이 성공적으로 보관되었습니다.",
      });
    },
  });

  const saveEdit = async () => {
    if (!editingField) return;

    const updates: any = {};

    if (editingField.field === "deadline") {
      updates.deadline = editingValue;
    } else if (editingField.field === "assignee") {
      if (editingField.type === "project") {
        updates.ownerIds = editingValue === "none" ? [] : [editingValue];
      } else {
        updates.assigneeIds = editingValue === "none" ? [] : [editingValue];
      }
    } else if (editingField.field === "status") {
      updates.status = editingValue;
    } else if (editingField.field === "progress") {
      const progressValue = parseInt(editingValue);

      if (editingField.type === "task") {
        // Map progress to status for backend
        let finalStatus: string;

        if (progressValue === 0) {
          finalStatus = "진행전";
        } else if (progressValue === 100) {
          finalStatus = "완료";
        } else {
          finalStatus = "진행중";
        }

        updates.status = finalStatus;
        updates.progress = progressValue;

        toast({
          title: "진행도 업데이트",
          description: `작업 진행도가 ${progressValue}%로 업데이트되었습니다.`,
        });
      } else if (
        editingField.type === "goal" ||
        editingField.type === "project"
      ) {
        // For goals and projects, we need to update their child tasks to achieve target progress
        // Skip the normal update flow and handle this specially
        try {
          const achievedProgress = await updateProgressForParentItem(
            editingField.itemId,
            editingField.type,
            progressValue,
          );
          const itemTypeName =
            editingField.type === "goal" ? "목표" : "프로젝트";

          const description =
            Math.round(achievedProgress) === progressValue
              ? `${itemTypeName} 진행도가 ${progressValue}%로 업데이트되고 하위 작업들이 조정되었습니다.`
              : `${itemTypeName} 진행도가 ${Math.round(
                  achievedProgress,
                )}%로 조정되었습니다 (목표: ${progressValue}%).`;

          toast({
            title: "진행도 업데이트 완료",
            description,
          });

          // Navigate to graph view after successful progress update
          setTimeout(() => {
            setLocation(`/workspace/${workspaceId}/team`);
          }, 1500);
        } catch (error) {
          console.error("Error in updateProgressForParentItem:", error);
          toast({
            title: "진행도 업데이트 실패",
            description:
              "진행도 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.",
            variant: "destructive",
          });
        }
        cancelEditing();
        return;
      }
    } else if (editingField.field === "importance") {
      if (editingField.type === "task") {
        updates.priority = editingValue;
      }
      // Projects and goals don't have importance in the schema
    }

    if (editingField.type === "project") {
      updateProjectMutation.mutate(
        { id: editingField.itemId, updates },
        {
          onSuccess: () => {
            if (editingField.field === "progress") {
              setTimeout(() => {
                setLocation(`/workspace/${workspaceId}/team`);
              }, 1500);
            }
          },
        },
      );
    } else if (editingField.type === "goal") {
      updateGoalMutation.mutate(
        { id: editingField.itemId, updates },
        {
          onSuccess: () => {
            if (editingField.field === "progress") {
              setTimeout(() => {
                setLocation(`/workspace/${workspaceId}/team`);
              }, 1500);
            }
          },
        },
      );
    } else if (editingField.type === "task") {
      updateTaskMutation.mutate(
        { id: editingField.itemId, updates },
        {
          onSuccess: () => {
            if (editingField.field === "progress") {
              setTimeout(() => {
                setLocation(`/workspace/${workspaceId}/team`);
              }, 1500);
            }
          },
        },
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  // Render functions for editable fields
  const renderEditableDeadline = (
    itemId: string,
    type: "project" | "goal" | "task",
    deadline: string | null,
  ) => {
    const isEditing =
      editingField?.itemId === itemId && editingField?.field === "deadline";

    if (isEditing) {
      return (
        <KoreanDatePicker
          value={editingValue}
          onChange={(value) => {
            setEditingValue(value);
            const updates: any = { deadline: value };

            if (type === "project") {
              updateProjectMutation.mutate({ id: itemId, updates });
            } else if (type === "goal") {
              updateGoalMutation.mutate({ id: itemId, updates });
            } else {
              updateTaskMutation.mutate({ id: itemId, updates });
            }
            cancelEditing();
          }}
          placeholder="날짜 선택"
          className="h-6 text-xs"
        />
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-muted/20 px-1 py-1 rounded text-sm"
        onClick={() => startEditing(itemId, "deadline", type, deadline || "")}
        data-testid={`text-${type}-deadline-${itemId}`}
      >
        <span className={getDDayColorClass(deadline)}>
          {formatDeadline(deadline)}
        </span>
      </div>
    );
  };

  const renderEditableAssignee = (
    itemId: string,
    type: "project" | "goal" | "task",
    assignee: SafeUser | null,
    ownerIds?: string[] | null,
    assigneeIds?: string[] | null,
  ) => {
    // Get all assignees for display
    const currentAssigneeIds =
      type === "project"
        ? Array.isArray(ownerIds)
          ? ownerIds
          : []
        : Array.isArray(assigneeIds)
          ? assigneeIds
          : [];
    const assignees = currentAssigneeIds
      .map((id) => (users as SafeUser[])?.find((user) => user.id === id))
      .filter(Boolean) as SafeUser[];

    // For projects, also get pending invitations to show in the member list
    let pendingInvitations: any[] = [];
    if (type === "project") {
      try {
        // Get all pending invitations from localStorage
        const globalInvitations = JSON.parse(
          localStorage.getItem("pendingInvitations") || "[]",
        );

        // Also check individual user invitation lists (for existing users)
        const allUsers = (users as SafeUser[]) || [];
        allUsers.forEach((user) => {
          const userInvitations = JSON.parse(
            localStorage.getItem(`receivedInvitations_${user.email}`) || "[]",
          );
          globalInvitations.push(...userInvitations);
        });

        // Filter invitations for this specific project that are still pending
        pendingInvitations = globalInvitations.filter(
          (inv: any) => inv.projectId === itemId && inv.status === "pending",
        );
      } catch (error) {
        console.error("Error loading pending invitations:", error);
      }
    }

    const handleAssigneeToggle = (userId: string, isSelected: boolean) => {
      // Get the latest assignee IDs from the current cache/data to avoid stale closure issues
      // const latestData = queryClient.getQueryData(["/api/projects"]) as
      //   | ProjectWithDetails[]
      //   | undefined;
      const queryKey = ["/api/workspaces", workspaceId, "projects"];

      // 2. 캐시에서 최신 데이터를 가져옵니다.
      const latestData =
        queryClient.getQueryData<ProjectWithDetails[]>(queryKey);

      let latestCurrentAssigneeIds: string[] = [];

      if (latestData) {
        if (type === "project") {
          const latestProject = latestData.find((p) => p.id === itemId);
          latestCurrentAssigneeIds = Array.isArray(latestProject?.ownerIds)
            ? latestProject.ownerIds
            : [];
        } else if (type === "goal") {
          const latestGoal = latestData
            .flatMap((p) => p.goals || [])
            .find((g) => g.id === itemId);
          latestCurrentAssigneeIds = Array.isArray(latestGoal?.assigneeIds)
            ? latestGoal.assigneeIds
            : [];
        } else if (type === "task") {
          const latestTask = latestData
            .flatMap((p) => [
              ...(p.tasks || []),
              ...(p.goals || []).flatMap((g) => g.tasks || []),
            ])
            .find((t) => t.id === itemId);
          latestCurrentAssigneeIds = Array.isArray(latestTask?.assigneeIds)
            ? latestTask.assigneeIds
            : [];
        }
      }

      const updates: any = {};
      let newAssigneeIds: string[];

      if (isSelected) {
        // Add user to assignees if not already present
        newAssigneeIds = latestCurrentAssigneeIds.includes(userId)
          ? latestCurrentAssigneeIds
          : [...latestCurrentAssigneeIds, userId];
      } else {
        // Remove user from assignees
        newAssigneeIds = latestCurrentAssigneeIds.filter((id) => id !== userId);
      }

      if (type === "project") {
        updates.ownerIds = newAssigneeIds;
      } else {
        updates.assigneeIds = newAssigneeIds;
      }

      if (type === "project") {
        updateProjectMutation.mutate({ id: itemId, updates });
      } else if (type === "goal") {
        updateGoalMutation.mutate({ id: itemId, updates });
      } else {
        updateTaskMutation.mutate({ id: itemId, updates });
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            className="cursor-pointer hover:bg-muted/20 px-1 py-1 rounded w-28 min-w-[7rem] max-w-[7rem] h-8 flex items-center overflow-hidden"
            data-testid={`edit-assignee-${itemId}`}
          >
            {assignees.length > 0 ? (
              <div className="flex items-center gap-1 truncate">
                {/* Current members only - 초대 대기중인 사용자는 담당자에서 제외 */}
                {assignees.slice(0, 3).map((assignee, index) => (
                  <Avatar
                    key={assignee.id}
                    className="w-6 h-6 flex-shrink-0"
                    style={{ zIndex: assignees.length - index }}
                  >
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground border border-white">
                      {assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 3 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    +{assignees.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">담당자 없음</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">담당자 선택</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(users as SafeUser[])?.map((user) => {
                const queryKey = ["/api/workspaces", workspaceId, "projects"];

                // 2. 이제 최신 데이터를 정상적으로 가져올 수 있습니다.
                const latestData =
                  queryClient.getQueryData<ProjectWithDetails[]>(queryKey);

                let latestAssigneeIds: string[] = [];

                // Get assignee IDs from latest data, allowing empty arrays
                if (latestData && Array.isArray(latestData)) {
                  if (type === "project") {
                    const latestProject = latestData.find(
                      (p) => p.id === itemId,
                    );
                    if (
                      latestProject &&
                      Array.isArray(latestProject.ownerIds)
                    ) {
                      latestAssigneeIds = latestProject.ownerIds;
                    }
                  } else if (type === "goal") {
                    const latestGoal = latestData
                      .flatMap((p) => p.goals || [])
                      .find((g) => g.id === itemId);
                    if (latestGoal && Array.isArray(latestGoal.assigneeIds)) {
                      latestAssigneeIds = latestGoal.assigneeIds;
                    }
                  } else if (type === "task") {
                    const latestTask = latestData
                      .flatMap((p) => [
                        ...(p.tasks || []),
                        ...(p.goals || []).flatMap((g) => g.tasks || []),
                      ])
                      .find((t) => t.id === itemId);
                    if (latestTask && Array.isArray(latestTask.assigneeIds)) {
                      latestAssigneeIds = latestTask.assigneeIds;
                    }
                  }
                }

                // Check if user is explicitly in the assignee list
                const isSelected = latestAssigneeIds.includes(user.id);

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 hover:bg-muted/50 p-2 rounded cursor-pointer"
                    onClick={() => handleAssigneeToggle(user.id, !isSelected)}
                    data-testid={`user-item-${user.id}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                      data-testid={`checkbox-user-${user.id}`}
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

  // Function to derive status from progress
  const getStatusFromProgress = (progress: number): string => {
    if (progress === 0) return "진행전";
    if (progress >= 100) return "완료";
    return "진행중";
  };

  // Function to derive progress from status
  const getProgressFromStatus = (status: string): number => {
    if (status === "진행전") return 0;
    if (status === "완료") return 100;
    return 50; // '진행중'
  };

  // Helper function to check if all child items are completed
  const canAutoComplete = (
    itemId: string,
    type: "project" | "goal",
  ): boolean => {
    if (!projects || !Array.isArray(projects)) return false;

    if (type === "project") {
      // Find the project
      const project = projects.find((p) => p.id === itemId);
      if (!project) return false;

      // If project has goals, check if all goals have been locally completed (completion button clicked)
      if (project.goals && project.goals.length > 0) {
        return project.goals.every((goal: any) => completedItems.has(goal.id));
      }

      // If no goals, check if all direct project tasks are 100% complete
      if (project.tasks && project.tasks.length > 0) {
        return project.tasks.every((task: any) => {
          // Calculate task progress like in backend
          if (task.progress !== null && task.progress !== undefined) {
            return task.progress === 100;
          }
          return task.status === "완료";
        });
      }

      // If no goals and no tasks, disallow completion
      return false;
    } else if (type === "goal") {
      // Find the goal across all projects
      for (const project of projects) {
        if (project.goals) {
          const goal = project.goals.find((g: any) => g.id === itemId);
          if (goal) {
            // Check if all tasks in this goal are 100% complete
            if (goal.tasks && goal.tasks.length > 0) {
              return goal.tasks.every((task: any) => {
                // Calculate task progress like in backend
                if (task.progress !== null && task.progress !== undefined) {
                  return task.progress === 100;
                }
                return task.status === "완료";
              });
            }
            // If no tasks, disallow completion
            return false;
          }
        }
      }
    }

    return false;
  };

  const renderEditableStatus = (
    itemId: string,
    type: "project" | "goal" | "task",
    status: string,
    progress?: number,
  ) => {
    const isLocallyCompleted = completedItems.has(itemId);
    const isLocallyDeleted = completedItems.has(`deleted-${itemId}`);

    const displayStatus =
      status === "이슈"
        ? "이슈"
        : type === "task" && progress !== undefined
          ? getStatusFromProgress(progress)
          : status;

    if ((type === "project" || type === "goal") && displayStatus !== "이슈") {
      const canAutoComplete = (
        targetId: string,
        itemType: "project" | "goal",
      ): boolean => {
        if (!projects || !Array.isArray(projects)) return false;

        if (itemType === "project") {
          const project = (projects as ProjectWithDetails[]).find(
            (p) => String(p.id) === String(targetId),
          );

          const hasGoals = !!(project?.goals && project.goals.length > 0);
          return (
            hasGoals &&
            (project?.goals?.every(
              (g) => g.status === "완료" || completedItems.has(g.id),
            ) ??
              false)
          );
        } else {
          const project = (projects as ProjectWithDetails[]).find((p) =>
            p.goals?.some((g) => String(g.id) === String(targetId)),
          );
          const goal = project?.goals?.find(
            (g) => String(g.id) === String(targetId),
          );

          const hasTasks = !!(goal?.tasks && goal.tasks.length > 0);
          return (
            hasTasks &&
            (goal?.tasks?.every(
              (t) => t.status === "완료" || completedItems.has(t.id),
            ) ??
              false)
          );
        }
      };

      const autoCompleteAllowed = canAutoComplete(itemId, type);

      let showAsCompleted = status === "완료";

      if (isLocallyDeleted) {
        if (status !== "완료") {
          setCompletedItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(`deleted-${itemId}`);
            return newSet;
          });
          showAsCompleted = false;
        } else {
          showAsCompleted = false;
        }
      } else if (isLocallyCompleted) {
        showAsCompleted = true;
      }

      const isCompleteButtonEnabled = autoCompleteAllowed || showAsCompleted;

      const handleCompleteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isCompleteButtonEnabled) return;

        try {
          if (showAsCompleted) {
            setCompletedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(itemId);
              newSet.add(`deleted-${itemId}`);
              return newSet;
            });

            const mutation =
              type === "project" ? updateProjectMutation : updateGoalMutation;
            await mutation.mutateAsync({
              id: itemId,
              updates: { status: "진행중" },
            });
          } else {
            setCompletedItems((prev) => {
              const newSet = new Set(prev);
              newSet.add(itemId);
              newSet.delete(`deleted-${itemId}`);
              return newSet;
            });

            const mutation =
              type === "project" ? updateProjectMutation : updateGoalMutation;
            await mutation.mutateAsync({
              id: itemId,
              updates: { status: "완료" },
            });
          }

          await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        } catch (error) {
          console.error("Update failed:", error);
        }
      };

      const getBadgeUI = () => {
        const base = "text-xs font-medium transition-all duration-200";
        if (showAsCompleted) {
          return {
            text: "취소",
            className: `${base} cursor-pointer hover:scale-105 hover:shadow-md bg-orange-600 hover:bg-orange-700 text-white border-orange-600 font-semibold shadow-lg`,
          };
        }
        return {
          text: "완료",
          className: isCompleteButtonEnabled
            ? `${base} cursor-pointer hover:scale-105 hover:shadow-md bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-semibold`
            : `${base} cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-50`,
        };
      };

      const ui = getBadgeUI();

      return (
        <Badge
          className={ui.className}
          style={{ borderRadius: "0px" }}
          onClick={handleCompleteClick}
        >
          {ui.text}
        </Badge>
      );
    }

    return (
      <Badge
        variant={getStatusBadgeVariant(displayStatus)}
        className="text-xs cursor-default"
        data-testid={`status-${itemId}`}
      >
        {displayStatus}
      </Badge>
    );
  };

  const renderEditableProgress = (
    itemId: string,
    type: "project" | "goal" | "task",
    progress: number,
    status?: string,
  ) => {
    // Only tasks can have their progress edited directly
    if (type !== "task") {
      return (
        <div className="flex items-center gap-2 px-1 py-1">
          <Progress value={progress} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8">{progress}%</span>
        </div>
      );
    }

    // 상태가 "이슈"일 때는 진행도 편집 비활성화
    const isIssueStatus = status === "이슈";
    const isEditing =
      editingField?.itemId === itemId && editingField?.field === "progress";

    // Progress options for dropdown (10% increments)
    const progressOptions = Array.from({ length: 11 }, (_, i) => i * 10);

    // 🌟 새로운 함수: 취소 시 편집 모드를 해제합니다.
    const handleCancelEdit = (isOpen: Boolean) => {
      if (!isOpen) {
        cancelEditing();
      }
    };

    const handleProgressSelect = async (value: string) => {
      const progressValue = parseInt(value);

      // Map progress to status for backend
      let finalStatus: string;

      if (progressValue === 0) {
        finalStatus = "진행전";
      } else if (progressValue === 100) {
        finalStatus = "완료";
      } else {
        finalStatus = "진행중";
      }

      try {
        await updateTaskMutation.mutateAsync({
          id: itemId,
          updates: { status: finalStatus, progress: progressValue },
        });

        toast({
          title: "진행도 업데이트",
          description: `작업 진행도가 ${progressValue}%로 업데이트되었습니다.`,
        });
      } catch (error) {
        console.error("Progress update failed:", error);
        toast({
          title: "업데이트 실패",
          description: "진행도 업데이트 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }

      cancelEditing();
    };

    if (isEditing && !isIssueStatus) {
      return (
        <div ref={wrapperRef}>
          <Select
            value={progress.toString()}
            onValueChange={handleProgressSelect}
            onOpenChange={handleCancelEdit}
          >
            <SelectTrigger
              className="h-6 text-xs w-5/6"
              data-testid={`edit-progress-${itemId}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {progressOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-2 px-1 py-1 rounded ${
          isIssueStatus
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-muted/20"
        }`}
        onClick={
          isIssueStatus
            ? undefined
            : () => startEditing(itemId, "progress", type, progress.toString())
        }
        title={
          isIssueStatus
            ? "이슈 상태에서는 진행도를 변경할 수 없습니다"
            : undefined
        }
      >
        <Progress value={progress} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8">{progress}%</span>
      </div>
    );
  };

  // 라벨 편집 기능
  const renderEditableLabel = (
    itemId: string,
    type: "project" | "goal" | "task",
    labels: string[],
  ) => {
    const currentLabels = labels || [];

    // Get current item data
    let currentItem: any = null;
    if (type === "project") {
      currentItem = (projects as ProjectWithDetails[])?.find(
        (p) => p.id === itemId,
      );
    } else if (type === "goal") {
      currentItem = (projects as ProjectWithDetails[])
        ?.flatMap((p) => p.goals || [])
        .find((g) => g.id === itemId);
    } else if (type === "task") {
      currentItem = (projects as ProjectWithDetails[])
        ?.flatMap((p) => [
          ...(p.tasks || []),
          ...(p.goals || []).flatMap((g) => g.tasks || []),
        ])
        .find((t) => t.id === itemId);
    }

    const handleLabelAdd = (newLabel: string) => {
      if (
        !newLabel.trim() ||
        currentLabels.length >= 2 ||
        newLabel.trim().length > 5
      )
        return;

      const updatedLabels = [...currentLabels, newLabel.trim()];

      if (type === "project") {
        updateProjectMutation.mutate({
          id: itemId,
          updates: { labels: updatedLabels },
        });
      } else if (type === "goal") {
        updateGoalMutation.mutate({
          id: itemId,
          updates: { labels: updatedLabels },
        });
      } else if (type === "task") {
        updateTaskMutation.mutate({
          id: itemId,
          updates: { labels: updatedLabels },
        });
      }
    };

    const handleLabelRemove = (labelToRemove: string) => {
      const updatedLabels = currentLabels.filter(
        (label) => label !== labelToRemove,
      );

      if (type === "project") {
        updateProjectMutation.mutate({
          id: itemId,
          updates: { labels: updatedLabels },
        });
      } else if (type === "goal") {
        updateGoalMutation.mutate({
          id: itemId,
          updates: { labels: updatedLabels },
        });
      } else if (type === "task") {
        updateTaskMutation.mutate({
          id: itemId,
          updates: { labels: updatedLabels },
        });
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            className="cursor-pointer hover:bg-muted/20 rounded-md min-w-16 min-h-6 flex items-center px-1 gap-1 flex-wrap"
            data-testid={`edit-labels-${itemId}`}
          >
            {currentLabels.length > 0 ? (
              currentLabels.map((label, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`text-xs ${
                    index === 0
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Tag className="w-3 h-3" />
                라벨
              </span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">라벨 편집 (최대 2개)</h4>

            {/* 입력 필드 */}
            {currentLabels.length < 2 && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="새 라벨 입력 (최대 5글자)"
                    className="flex-1 h-8"
                    maxLength={5}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const target = e.target as HTMLInputElement;
                        handleLabelAdd(target.value);
                        target.value = "";
                      }
                    }}
                    data-testid={`input-new-label-${itemId}`}
                  />
                </div>
                <div className="text-xs text-muted-foreground">최대 5글자</div>
              </div>
            )}

            {/* 기존 라벨 목록 */}
            {currentLabels.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">현재 라벨</div>
                {currentLabels.map((label, index) => (
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
                      onClick={() => handleLabelRemove(label)}
                      className="h-6 w-6 p-0"
                      data-testid={`button-remove-label-${itemId}-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {currentLabels.length >= 2 && (
              <div className="text-xs text-muted-foreground text-center">
                최대 2개의 라벨을 사용할 수 있습니다.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderEditableImportance = (
    itemId: string,
    type: "project" | "goal" | "task",
    importance: string,
  ) => {
    const isEditing =
      editingField?.itemId === itemId && editingField?.field === "importance";

    // 프로젝트와 목표는 우선순위 표시하지 않음
    if (type !== "task") {
      return <span className="text-muted-foreground text-sm">-</span>;
    }

    if (isEditing) {
      return (
        <div ref={wrapperRef}>
          <Select
            value={editingValue}
            onValueChange={(value) => {
              setEditingValue(value);
              updateTaskMutation.mutate({
                id: itemId,
                updates: { priority: value },
              });
              cancelEditing();
            }}
            onOpenChange={(open) => {
              if (!open && editingValue === importance) {
                cancelEditing();
              }
            }}
          >
            <SelectTrigger
              className="h-6 text-xs"
              data-testid={`edit-importance-${itemId}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">높음</SelectItem>
              <SelectItem value="3">중요</SelectItem>
              <SelectItem value="2">낮음</SelectItem>
              <SelectItem value="4">미정</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <Badge
        variant={getImportanceBadgeVariant(importance)}
        className="text-xs cursor-pointer hover:opacity-80"
        onClick={() => startEditing(itemId, "importance", type, importance)}
      >
        {mapPriorityToLabel(importance)}
      </Badge>
    );
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "-";

    // Use same parsing logic as KoreanDatePicker to avoid timezone issues
    const deadlineDate = parse(deadline, "yyyy-MM-dd", new Date());

    // Check if the parsed date is valid
    if (isNaN(deadlineDate.getTime())) {
      return "-";
    }

    const month = deadlineDate.getMonth() + 1;
    const day = deadlineDate.getDate();

    // Calculate D-day
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight for accurate comparison
    deadlineDate.setHours(0, 0, 0, 0); // Set to midnight for accurate comparison

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let dDayPart = "";
    if (diffDays < 0) {
      dDayPart = ` D+${Math.abs(diffDays)}`;
    } else if (diffDays === 0) {
      dDayPart = " D-Day";
    } else {
      dDayPart = ` D-${diffDays}`;
    }

    return `${month}/${day}${dDayPart}`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "진행전":
        return "secondary" as const;
      case "진행중":
        return "default" as const;
      case "완료":
        return "success" as const; // 완료 상태에 전용 success variant 사용
      case "이슈":
        return "issue" as const;
      default:
        return "outline" as const;
    }
  };

  const getImportanceBadgeVariant = (importance: string) => {
    return getPriorityBadgeVariant(importance);
  };

  const getDDayColorClass = (deadline: string | null) => {
    if (!deadline) return "text-muted-foreground";

    const deadlineDate = parse(deadline, "yyyy-MM-dd", new Date());
    if (isNaN(deadlineDate.getTime())) {
      return "text-muted-foreground";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "px-2 py-1 text-xs rounded font-medium bg-red-100 text-red-700";
    } else if (diffDays === 0) {
      return "px-2 py-1 text-xs rounded font-medium bg-orange-100 text-orange-700";
    } else {
      return "px-2 py-1 text-xs rounded font-medium bg-blue-100 text-blue-700";
    }
  };

  // Note: 로딩 처리를 삭제했습니다. 사용자 요청에 따라 "로딩중" 텍스트를 제거했습니다.

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
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            프로젝트 관리
          </h1>
          <p
            className="text-sm text-muted-foreground"
            data-testid="header-subtitle"
          >
            계층 구조로 프로젝트를 관리합니다
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="default"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => setLocation(`/workspace/${workspaceId}/archive`)}
            data-testid="button-archive-page"
          >
            <Archive className="w-4 h-4 mr-2" />
            보관함
          </Button>
          <Button
            onClick={() => setIsProjectModalOpen(true)}
            data-testid="button-add-project"
          >
            <Plus className="w-4 h-4 mr-2" />새 프로젝트
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {/* Project Members Section */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">프로젝트 참여자</h3>
                  <div className="flex items-center gap-2">
                    {isLoadingUsers || isLoadingProjects ? (
                      <CardContent className="h-8 bg-muted rounded animate-pulse"></CardContent>
                    ) : (
                      ((users as SafeUser[]) || []).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2"
                          data-testid={`member-${member.id}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setIsInviteModalOpen(true)}
                  data-testid="button-invite-member"
                >
                  <User className="h-4 w-4" />
                  멤버 초대
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Header */}
        <div className="bg-muted/30 p-3 rounded-t-lg border">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">이름</div>
            <div className="col-span-1">마감일</div>
            <div className="col-span-1">담당자</div>
            <div className="col-span-2">라벨</div>
            <div className="col-span-1">상태</div>
            <div className="col-span-2">진행도</div>
            <div className="col-span-1">우선순위</div>
          </div>
        </div>

        {/* Content */}
        <Card className="rounded-t-none">
          {isLoadingProjects || isLoadingUsers ? (
            <CardContent className="p-0">
              <div className="min-h-[200px] flex flex-col justify-center items-center py-8 text-muted-foreground bg-muted rounded animate-pulse"></div>
            </CardContent>
          ) : (
            // <CardContent className="p-0">
            //   {!projects || (projects as ProjectWithDetails[]).length === 0 ? (
            //     <div className="min-h-[200px] flex flex-col justify-center items-center py-8 text-muted-foreground">
            //       <p>프로젝트가 없습니다</p>
            //       <p className="text-sm mt-1">새 프로젝트를 추가해주세요</p>
            //     </div>
            //   ) : (
            //     <div className="divide-y">
            //       {activeProjects.map((project) => (
            //         <div key={project.id}>
            //           {/* Project Row */}
            //           <div
            //             className={`p-3 hover:bg-muted/50 hover:bg-[hsl(215,40%,30%)] transition-colors ${
            //               completedItems.has(project.id) ? "opacity-50" : ""
            //             }`}
            //           >
            //             <div className="grid grid-cols-12 gap-4 items-center">
            //               <div className="col-span-4 flex items-center gap-2">
            //                 <Checkbox
            //                   checked={selectedItems.has(project.id)}
            //                   onCheckedChange={() =>
            //                     toggleItemSelection(project.id)
            //                   }
            //                   data-testid={`checkbox-project-${project.id}`}
            //                 />
            //                 <Button
            //                   variant="ghost"
            //                   size="sm"
            //                   // 1. 하위 목표가 없으면 버튼 자체를 비활성화 (클릭 이벤트 차단)
            //                   disabled={
            //                     !project.goals || project.goals.length === 0
            //                   }
            //                   className={`h-6 w-6 p-0 transition-all ${
            //                     !project.goals || project.goals.length === 0
            //                       ? "cursor-default opacity-30 hover:bg-transparent" // 목표 없으면 커서 고정 및 호버 효과 제거
            //                       : "cursor-pointer hover:bg-muted" // 목표 있으면 포인터 커서 및 호버 효과 적용
            //                   }`}
            //                   onClick={() => toggleProject(project.id)}
            //                 >
            //                   {/* 2. 하위 목표가 있고 펼쳐진 상태일 때만 Down 아이콘 */}
            //                   {project.goals &&
            //                   project.goals.length > 0 &&
            //                   expandedProjects.has(project.id) ? (
            //                     <ChevronDown className="w-4 h-4" />
            //                   ) : (
            //                     /* 3. 닫혀있거나 하위 목표가 없는 경우 모두 Right 아이콘 */
            //                     <ChevronRight className="w-4 h-4" />
            //                   )}
            //                 </Button>
            //                 <FolderOpen className="w-4 h-4 text-blue-600" />
            //                 <button
            //                   className="font-medium hover:text-blue-600 cursor-pointer transition-colors text-left"
            //                   onClick={() =>
            //                     setLocation(
            //                       `/workspace/${workspaceId}/detail/project/${project.id}?from=list`
            //                     )
            //                   }
            //                   data-testid={`text-project-name-${project.id}`}
            //                 >
            //                   {project.name}
            //                 </button>
            //                 <Badge variant="outline" className="text-xs">
            //                   {project.code}
            //                 </Badge>
            //                 <Button
            //                   variant="ghost"
            //                   size="sm"
            //                   className="ml-2"
            //                   onClick={() =>
            //                     setGoalModalState({
            //                       isOpen: true,
            //                       projectId: project.id,
            //                       projectTitle: project.name,
            //                     })
            //                   }
            //                   data-testid={`button-add-goal-${project.id}`}
            //                 >
            //                   <Plus className="w-4 h-4" />
            //                 </Button>
            //               </div>
            //               <div className="col-span-1">
            //                 {renderEditableDeadline(
            //                   project.id,
            //                   "project",
            //                   project.deadline
            //                 )}
            //               </div>
            //               <div className="col-span-1">
            //                 {renderEditableAssignee(
            //                   project.id,
            //                   "project",
            //                   project.owners && project.owners.length > 0
            //                     ? project.owners[0]
            //                     : null,
            //                   project.ownerIds
            //                 )}
            //               </div>
            //               <div className="col-span-2">
            //                 {renderEditableLabel(
            //                   project.id,
            //                   "project",
            //                   project.labels || []
            //                 )}
            //               </div>
            //               <div className="col-span-1">
            //                 {renderEditableStatus(
            //                   project.id,
            //                   "project",
            //                   project.status || ""
            //                 )}
            //               </div>
            //               <div className="col-span-2">
            //                 {(() => {
            //                   // Calculate progress as "프로젝트 하위 목표 진행도 총합 / 목표 수"
            //                   const goals = project.goals || [];
            //                   if (goals.length === 0)
            //                     return renderEditableProgress(
            //                       project.id,
            //                       "project",
            //                       0
            //                     );

            //                   const goalProgressSum = goals.reduce(
            //                     (sum, goal) => {
            //                       const goalTasks = goal.tasks || [];
            //                       const goalProgress =
            //                         goalTasks.length > 0
            //                           ? goalTasks.reduce(
            //                               (taskSum, task) =>
            //                                 taskSum + (task.progress || 0),
            //                               0
            //                             ) / goalTasks.length
            //                           : 0;
            //                       return sum + goalProgress;
            //                     },
            //                     0
            //                   );

            //                   const averageProgress = Math.round(
            //                     goalProgressSum / goals.length
            //                   );
            //                   return renderEditableProgress(
            //                     project.id,
            //                     "project",
            //                     averageProgress
            //                   );
            //                 })()}
            //               </div>
            //               <div className="col-span-1">
            //                 {renderEditableImportance(
            //                   project.id,
            //                   "project",
            //                   "중간"
            //                 )}
            //               </div>
            //             </div>
            //           </div>

            //           {/* Goals */}
            //           {expandedProjects.has(project.id) && project.goals && (
            //             <div
            //               className="bg-muted/20"
            //               key={`${project.id}-${renderKey}`}
            //             >
            //               {project.goals
            //                 .slice()
            //                 .sort((a, b) => {
            //                   const dateA = new Date(
            //                     a.completedAt || 0
            //                   ).getTime();
            //                   const dateB = new Date(
            //                     b.completedAt || 0
            //                   ).getTime();

            //                   return dateA - dateB;
            //                 })
            //                 .map((goal) => (
            //                   <div key={goal.id}>
            //                     {/* Goal Row */}
            //                     <div
            //                       className={`p-3 hover:bg-muted/50 hover:bg-[hsl(215,40%,30%)] transition-colors ${
            //                         completedItems.has(project.id) ||
            //                         completedItems.has(goal.id)
            //                           ? "opacity-50"
            //                           : ""
            //                       }`}
            //                     >
            //                       <div className="grid grid-cols-12 gap-4 items-center">
            //                         <div className="col-span-4 flex items-center gap-2 ml-8">
            //                           <Checkbox
            //                             checked={selectedItems.has(goal.id)}
            //                             onCheckedChange={() =>
            //                               toggleItemSelection(goal.id)
            //                             }
            //                             data-testid={`checkbox-goal-${goal.id}`}
            //                           />
            //                           <Button
            //                             variant="ghost"
            //                             size="sm"
            //                             // 1. 하위 태스크가 없으면 클릭 비활성화 및 포인터 커서 제거
            //                             disabled={
            //                               !goal.tasks || goal.tasks.length === 0
            //                             }
            //                             className={`h-6 w-6 p-0 transition-all ${
            //                               !goal.tasks || goal.tasks.length === 0
            //                                 ? "cursor-default opacity-30 hover:bg-transparent"
            //                                 : "cursor-pointer hover:bg-muted"
            //                             }`}
            //                             onClick={() => toggleGoal(goal.id)}
            //                           >
            //                             {/* 2. 데이터가 있고 펼쳐진 상태일 때만 Down 아이콘 */}
            //                             {goal.tasks &&
            //                             goal.tasks.length > 0 &&
            //                             expandedGoals.has(goal.id) ? (
            //                               <ChevronDown className="w-4 h-4" />
            //                             ) : (
            //                               /* 3. 데이터가 없거나 닫힌 상태면 Right 아이콘 */
            //                               <ChevronRight className="w-4 h-4" />
            //                             )}
            //                           </Button>
            //                           <Target className="w-4 h-4 text-green-600" />
            //                           <button
            //                             className="font-medium hover:text-green-600 cursor-pointer transition-colors text-left"
            //                             onClick={() =>
            //                               setLocation(
            //                                 `/workspace/${workspaceId}/detail/goal/${goal.id}?from=list`
            //                               )
            //                             }
            //                             data-testid={`text-goal-name-${goal.id}`}
            //                           >
            //                             {goal.title}
            //                           </button>
            //                           <Button
            //                             variant="ghost"
            //                             size="sm"
            //                             className="ml-2"
            //                             onClick={() =>
            //                               setTaskModalState({
            //                                 isOpen: true,
            //                                 goalId: goal.id,
            //                                 goalTitle: goal.title,
            //                               })
            //                             }
            //                             data-testid={`button-add-task-${goal.id}`}
            //                           >
            //                             <Plus className="w-4 h-4" />
            //                           </Button>
            //                         </div>
            //                         <div className="col-span-1">
            //                           {renderEditableDeadline(
            //                             goal.id,
            //                             "goal",
            //                             goal.deadline
            //                           )}
            //                         </div>
            //                         <div className="col-span-1">
            //                           {renderEditableAssignee(
            //                             goal.id,
            //                             "goal",
            //                             goal.assignees &&
            //                               goal.assignees.length > 0
            //                               ? goal.assignees[0]
            //                               : null,
            //                             undefined,
            //                             goal.assigneeIds
            //                           )}
            //                         </div>
            //                         <div className="col-span-2">
            //                           {renderEditableLabel(
            //                             goal.id,
            //                             "goal",
            //                             goal.labels || []
            //                           )}
            //                         </div>
            //                         <div className="col-span-1">
            //                           {renderEditableStatus(
            //                             goal.id,
            //                             "goal",
            //                             goal.status || ""
            //                           )}
            //                         </div>
            //                         <div className="col-span-2">
            //                           {(() => {
            //                             // 목표 진행도 = 목표 하위 작업들 진행도 합 / 목표 하위 작업들 수
            //                             const goalTasks = goal.tasks || [];
            //                             if (goalTasks.length === 0)
            //                               return renderEditableProgress(
            //                                 goal.id,
            //                                 "goal",
            //                                 0
            //                               );

            //                             const taskProgressSum =
            //                               goalTasks.reduce(
            //                                 (sum, task) =>
            //                                   sum + (task.progress || 0),
            //                                 0
            //                               );
            //                             const averageProgress = Math.round(
            //                               taskProgressSum / goalTasks.length
            //                             );
            //                             return renderEditableProgress(
            //                               goal.id,
            //                               "goal",
            //                               averageProgress
            //                             );
            //                           })()}
            //                         </div>
            //                         <div className="col-span-1">
            //                           {renderEditableImportance(
            //                             goal.id,
            //                             "goal",
            //                             "중간"
            //                           )}
            //                         </div>
            //                       </div>
            //                     </div>

            //                     {/* Tasks */}
            //                     {expandedGoals.has(goal.id) && goal.tasks && (
            //                       <div className="bg-muted/30">
            //                         {goal.tasks.map((task) => (
            //                           <div
            //                             key={task.id}
            //                             className={`p-3 hover:bg-muted/50 hover:bg-[hsl(215,40%,30%)] transition-colors ${
            //                               completedItems.has(project.id) ||
            //                               completedItems.has(goal.id) ||
            //                               completedItems.has(task.id)
            //                                 ? "opacity-50"
            //                                 : ""
            //                             }`}
            //                           >
            //                             <div className="grid grid-cols-12 gap-4 items-center">
            //                               <div className="col-span-4 flex items-center gap-2 ml-16">
            //                                 <Checkbox
            //                                   checked={selectedItems.has(
            //                                     task.id
            //                                   )}
            //                                   onCheckedChange={() =>
            //                                     toggleItemSelection(task.id)
            //                                   }
            //                                   data-testid={`checkbox-task-${task.id}`}
            //                                 />
            //                                 <Circle className="w-4 h-4 text-orange-600" />
            //                                 <button
            //                                   className="font-medium hover:text-orange-600 cursor-pointer transition-colors text-left"
            //                                   onClick={() =>
            //                                     setLocation(
            //                                       `/workspace/${workspaceId}/detail/task/${task.id}?from=list`
            //                                     )
            //                                   }
            //                                   data-testid={`text-task-name-${task.id}`}
            //                                 >
            //                                   {task.title}
            //                                 </button>
            //                               </div>
            //                               <div className="col-span-1">
            //                                 {renderEditableDeadline(
            //                                   task.id,
            //                                   "task",
            //                                   task.deadline
            //                                 )}
            //                               </div>
            //                               <div className="col-span-1">
            //                                 {renderEditableAssignee(
            //                                   task.id,
            //                                   "task",
            //                                   task.assignees &&
            //                                     task.assignees.length > 0
            //                                     ? task.assignees[0]
            //                                     : null,
            //                                   undefined,
            //                                   task.assigneeIds
            //                                 )}
            //                               </div>
            //                               <div className="col-span-2">
            //                                 {renderEditableLabel(
            //                                   task.id,
            //                                   "task",
            //                                   task.labels || []
            //                                 )}
            //                               </div>
            //                               <div className="col-span-1">
            //                                 {renderEditableStatus(
            //                                   task.id,
            //                                   "task",
            //                                   task.status,
            //                                   getProgressFromStatus(task.status)
            //                                 )}
            //                               </div>
            //                               <div className="col-span-2">
            //                                 {renderEditableProgress(
            //                                   task.id,
            //                                   "task",
            //                                   task.progress ??
            //                                     getProgressFromStatus(
            //                                       task.status
            //                                     ),
            //                                   task.status
            //                                 )}
            //                               </div>
            //                               <div className="col-span-1">
            //                                 {renderEditableImportance(
            //                                   task.id,
            //                                   "task",
            //                                   task.priority || "4"
            //                                 )}
            //                               </div>
            //                             </div>
            //                           </div>
            //                         ))}
            //                       </div>
            //                     )}
            //                   </div>
            //                 ))}
            //             </div>
            //           )}
            //         </div>
            //       ))}
            //     </div>
            //   )}
            // </CardContent>
            <CardContent className="p-0">
              {!projects || (projects as ProjectWithDetails[]).length === 0 ? (
                <div className="min-h-[200px] flex flex-col justify-center items-center py-8 text-muted-foreground">
                  <p>프로젝트가 없습니다</p>
                  <p className="text-sm mt-1">새 프로젝트를 추가해주세요</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activeProjects.map((project) => (
                    <div key={project.id}>
                      {/* Project Row */}
                      <div
                        className={`p-3 hover:bg-muted/50 hover:bg-[hsl(215,40%,30%)] transition-colors ${
                          completedItems.has(project.id) ? "opacity-50" : ""
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-4 flex items-center gap-2">
                            <Checkbox
                              checked={selectedItems.has(project.id)}
                              onCheckedChange={() =>
                                toggleItemSelection(project.id)
                              }
                              data-testid={`checkbox-project-${project.id}`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={
                                !project.goals || project.goals.length === 0
                              }
                              className={`h-6 w-6 p-0 transition-all ${
                                !project.goals || project.goals.length === 0
                                  ? "cursor-default opacity-30 hover:bg-transparent"
                                  : "cursor-pointer hover:bg-muted"
                              }`}
                              onClick={() => toggleProject(project.id)}
                            >
                              {project.goals &&
                              project.goals.length > 0 &&
                              expandedProjects.has(project.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                            <button
                              className="font-medium hover:text-blue-600 cursor-pointer transition-colors text-left"
                              onClick={() =>
                                setLocation(
                                  `/workspace/${workspaceId}/detail/project/${project.id}?from=list`,
                                )
                              }
                              data-testid={`text-project-name-${project.id}`}
                            >
                              {project.name}
                            </button>
                            <Badge variant="outline" className="text-xs">
                              <span
                                className={`font-semibold ${
                                  (archivedGoalCounts?.get(
                                    String(project.id),
                                  ) ?? 0) > 0
                                    ? "text-orange-600"
                                    : "text-gray-400"
                                }`}
                              >
                                보관됨{" "}
                                {archivedGoalCounts?.get(String(project.id)) ??
                                  0}
                              </span>
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2"
                              onClick={() =>
                                setGoalModalState({
                                  isOpen: true,
                                  projectId: project.id,
                                  projectTitle: project.name,
                                })
                              }
                              data-testid={`button-add-goal-${project.id}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="col-span-1">
                            {renderEditableDeadline(
                              project.id,
                              "project",
                              project.deadline,
                            )}
                          </div>
                          <div className="col-span-1">
                            {renderEditableAssignee(
                              project.id,
                              "project",
                              project.owners && project.owners.length > 0
                                ? project.owners[0]
                                : null,
                              project.ownerIds,
                            )}
                          </div>
                          <div className="col-span-2">
                            {renderEditableLabel(
                              project.id,
                              "project",
                              project.labels || [],
                            )}
                          </div>
                          <div className="col-span-1">
                            {renderEditableStatus(
                              project.id,
                              "project",
                              project.status || "",
                            )}
                          </div>
                          <div className="col-span-2">
                            {/* ⭐ 백엔드 stats에서 가져온 진행률 사용 */}
                            {renderEditableProgress(
                              project.id,
                              "project",
                              project.progressPercentage || 0,
                            )}
                          </div>
                          <div className="col-span-1">
                            {renderEditableImportance(
                              project.id,
                              "project",
                              "중간",
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Goals */}
                      {expandedProjects.has(project.id) && project.goals && (
                        <div
                          className="bg-muted/20"
                          key={`${project.id}-${renderKey}`}
                        >
                          {project.goals
                            .slice()
                            .sort((a, b) => {
                              const dateA = new Date(
                                a.completedAt || 0,
                              ).getTime();
                              const dateB = new Date(
                                b.completedAt || 0,
                              ).getTime();
                              return dateA - dateB;
                            })
                            .map((goal) => (
                              <div key={goal.id}>
                                {/* Goal Row */}
                                <div
                                  className={`p-3 hover:bg-muted/50 hover:bg-[hsl(215,40%,30%)] transition-colors ${
                                    completedItems.has(project.id) ||
                                    completedItems.has(goal.id)
                                      ? "opacity-50"
                                      : ""
                                  }`}
                                >
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 flex items-center gap-2 ml-8">
                                      <Checkbox
                                        checked={selectedItems.has(goal.id)}
                                        onCheckedChange={() =>
                                          toggleItemSelection(goal.id)
                                        }
                                        data-testid={`checkbox-goal-${goal.id}`}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={
                                          !goal.tasks || goal.tasks.length === 0
                                        }
                                        className={`h-6 w-6 p-0 transition-all ${
                                          !goal.tasks || goal.tasks.length === 0
                                            ? "cursor-default opacity-30 hover:bg-transparent"
                                            : "cursor-pointer hover:bg-muted"
                                        }`}
                                        onClick={() => toggleGoal(goal.id)}
                                      >
                                        {goal.tasks &&
                                        goal.tasks.length > 0 &&
                                        expandedGoals.has(goal.id) ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                      </Button>
                                      <Target className="w-4 h-4 text-green-600" />
                                      <button
                                        className="font-medium hover:text-green-600 cursor-pointer transition-colors text-left"
                                        onClick={() =>
                                          setLocation(
                                            `/workspace/${workspaceId}/detail/goal/${goal.id}?from=list`,
                                          )
                                        }
                                        data-testid={`text-goal-name-${goal.id}`}
                                      >
                                        {goal.title}
                                      </button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-2"
                                        onClick={() =>
                                          setTaskModalState({
                                            isOpen: true,
                                            goalId: goal.id,
                                            goalTitle: goal.title,
                                          })
                                        }
                                        data-testid={`button-add-task-${goal.id}`}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableDeadline(
                                        goal.id,
                                        "goal",
                                        goal.deadline,
                                      )}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableAssignee(
                                        goal.id,
                                        "goal",
                                        goal.assignees &&
                                          goal.assignees.length > 0
                                          ? goal.assignees[0]
                                          : null,
                                        undefined,
                                        goal.assigneeIds,
                                      )}
                                    </div>
                                    <div className="col-span-2">
                                      {renderEditableLabel(
                                        goal.id,
                                        "goal",
                                        goal.labels || [],
                                      )}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableStatus(
                                        goal.id,
                                        "goal",
                                        goal.status || "",
                                      )}
                                    </div>
                                    <div className="col-span-2">
                                      {/* ⭐ 백엔드에서 계산된 goal.progressPercentage 사용 */}
                                      {renderEditableProgress(
                                        goal.id,
                                        "goal",
                                        goal.progressPercentage || 0,
                                      )}
                                    </div>
                                    <div className="col-span-1">
                                      {renderEditableImportance(
                                        goal.id,
                                        "goal",
                                        "중간",
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Tasks */}
                                {expandedGoals.has(goal.id) && goal.tasks && (
                                  <div className="bg-muted/30">
                                    {goal.tasks.map((task) => (
                                      <div
                                        key={task.id}
                                        className={`p-3 hover:bg-muted/50 hover:bg-[hsl(215,40%,30%)] transition-colors ${
                                          completedItems.has(project.id) ||
                                          completedItems.has(goal.id) ||
                                          completedItems.has(task.id)
                                            ? "opacity-50"
                                            : ""
                                        }`}
                                      >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                          <div className="col-span-4 flex items-center gap-2 ml-16">
                                            <Checkbox
                                              checked={selectedItems.has(
                                                task.id,
                                              )}
                                              onCheckedChange={() =>
                                                toggleItemSelection(task.id)
                                              }
                                              data-testid={`checkbox-task-${task.id}`}
                                            />
                                            <Circle className="w-4 h-4 text-orange-600" />
                                            <button
                                              className="font-medium hover:text-orange-600 cursor-pointer transition-colors text-left"
                                              onClick={() =>
                                                setLocation(
                                                  `/workspace/${workspaceId}/detail/task/${task.id}?from=list`,
                                                )
                                              }
                                              data-testid={`text-task-name-${task.id}`}
                                            >
                                              {task.title}
                                            </button>
                                          </div>
                                          <div className="col-span-1">
                                            {renderEditableDeadline(
                                              task.id,
                                              "task",
                                              task.deadline,
                                            )}
                                          </div>
                                          <div className="col-span-1">
                                            {renderEditableAssignee(
                                              task.id,
                                              "task",
                                              task.assignees &&
                                                task.assignees.length > 0
                                                ? task.assignees[0]
                                                : null,
                                              undefined,
                                              task.assigneeIds,
                                            )}
                                          </div>
                                          <div className="col-span-2">
                                            {renderEditableLabel(
                                              task.id,
                                              "task",
                                              task.labels || [],
                                            )}
                                          </div>
                                          <div className="col-span-1">
                                            {renderEditableStatus(
                                              task.id,
                                              "task",
                                              task.status,
                                              getProgressFromStatus(
                                                task.status,
                                              ),
                                            )}
                                          </div>
                                          <div className="col-span-2">
                                            {renderEditableProgress(
                                              task.id,
                                              "task",
                                              task.progress ??
                                                getProgressFromStatus(
                                                  task.status,
                                                ),
                                              task.status,
                                            )}
                                          </div>
                                          <div className="col-span-1">
                                            {renderEditableImportance(
                                              task.id,
                                              "task",
                                              task.priority || "4",
                                            )}
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
          )}
        </Card>

        {/* Bottom Selection Toast */}
        {showSelectionToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedItems.size}개 선택됨
              </span>
              <Button
                variant="default"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
                onClick={clearSelection}
                data-testid="button-clear-selection"
              >
                선택 해제
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-sm"
                onClick={deleteSelectedItems}
                disabled={
                  deleteProjectMutation.isPending ||
                  deleteGoalMutation.isPending ||
                  deleteTaskMutation.isPending
                }
                data-testid="button-delete-selection"
              >
                {deleteProjectMutation.isPending ||
                deleteGoalMutation.isPending ||
                deleteTaskMutation.isPending
                  ? "삭제 중..."
                  : "삭제"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-sm"
                onClick={async () => {
                  const selectedArray = Array.from(selectedItems);

                  // // Filter to only get selected projects
                  // const selectedProjectIds: string[] = [];
                  // const nonProjectCount = selectedArray.filter((itemId) => {
                  //   // Check if it's a project
                  //   const isProject = (projects as ProjectWithDetails[])?.some(
                  //     (p) => p.id === itemId
                  //   );
                  //   if (isProject) {
                  //     selectedProjectIds.push(itemId);
                  //     return false;
                  //   }
                  //   return true; // Count non-project items
                  // }).length;

                  // if (selectedProjectIds.length === 0) {
                  //   toast({
                  //     title: "보관 제한",
                  //     description: "프로젝트 단위로 이동해 주세요.",
                  //     variant: "destructive",
                  //   });
                  //   return;
                  // }

                  // // Show info message if non-project items were also selected
                  // if (nonProjectCount > 0) {
                  //   toast({
                  //     title: "보관 안내",
                  //     description: `선택된 항목 중 ${selectedProjectIds.length}개 프로젝트만 보관됩니다.`,
                  //   });
                  // }

                  // try {
                  //   // Archive selected projects using database-based mutations
                  //   for (const projectId of selectedProjectIds) {
                  //     await archiveProjectMutation.mutateAsync(projectId);
                  //   }

                  //   // Force immediate data refresh to ensure archived projects disappear from list
                  //   await queryClient.refetchQueries({
                  //     queryKey: ["/api/projects"],
                  //   });

                  //   toast({
                  //     title: "보관 완료",
                  //     description: `${selectedProjectIds.length}개 프로젝트가 보관함으로 이동되었습니다.`,
                  //   });

                  //   clearSelection();
                  //   setTimeout(() => {
                  //     setLocation(`/workspace/${workspaceId}/archive`);
                  //   }, 1000);
                  try {
                    for (const itemId of selectedArray) {
                      // 1. 프로젝트인지 확인 후 프로젝트 보관 실행
                      const isProject = (
                        projects as ProjectWithDetails[]
                      )?.some((p) => p.id === itemId);
                      if (isProject) {
                        await archiveProjectMutation.mutateAsync(itemId);
                        continue; // 다음 아이템으로
                      }

                      // 2. 목표인지 확인 후 목표 보관 실행 (goals 목록이 있다고 가정)
                      const isGoal = (goals as GoalWithTasks[])?.some(
                        (g) => g.id === itemId,
                      );
                      if (isGoal) {
                        await archiveGoalMutation.mutateAsync(itemId);
                        continue;
                      }

                      // 3. 작업인지 확인 후 작업 보관 실행
                      // const isTask = (tasks as Task[])?.some(t => t.id === itemId);
                      // if (isTask) {
                      //   await archiveTaskMutation.mutateAsync(itemId);
                      // }
                    }

                    // 모든 처리가 끝난 후 캐시 갱신 및 알림
                    await queryClient.refetchQueries({
                      queryKey: ["/api/projects"],
                    });
                    toast({
                      title: "보관 완료",
                      description: "선택한 모든 항목이 보관되었습니다.",
                    });

                    clearSelection();
                    setTimeout(
                      () => setLocation(`/workspace/${workspaceId}/archive`),
                      1000,
                    );
                  } catch (error) {
                    console.error("Failed to archive items:", error);
                    toast({
                      title: "보관 실패",
                      description: "항목을 보관하는 중 오류가 발생했습니다.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={
                  archiveProjectMutation.isPending ||
                  archiveGoalMutation.isPending ||
                  archiveTaskMutation.isPending
                }
                data-testid="button-archive"
              >
                {archiveProjectMutation.isPending ||
                archiveGoalMutation.isPending ||
                archiveTaskMutation.isPending
                  ? "보관 중..."
                  : "보관하기"}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        workspaceId={workspaceId as string}
      />

      <GoalModal
        isOpen={goalModalState.isOpen}
        onClose={() =>
          setGoalModalState({ isOpen: false, projectId: "", projectTitle: "" })
        }
        projectId={goalModalState.projectId}
        projectTitle={goalModalState.projectTitle}
        workspaceId={workspaceId as string}
        onSuccess={() => {
          if (goalModalState.projectId) {
            setExpandedProjects((prev) => {
              const next = new Set(prev);
              next.add(goalModalState.projectId);
              return next;
            });
          }
        }}
      />

      <TaskModal
        isOpen={taskModalState.isOpen}
        onClose={() =>
          setTaskModalState({ isOpen: false, goalId: "", goalTitle: "" })
        }
        goalId={taskModalState.goalId}
        goalTitle={taskModalState.goalTitle}
        workspaceId={workspaceId as string}
        onSuccess={() => {
          if (taskModalState.goalId) {
            setExpandedGoals((prev) => {
              const next = new Set(prev);
              next.add(taskModalState.goalId);
              return next;
            });
          }
        }}
      />

      {/* Member Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">초대</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="example@company.com"
                  value={inviteUsername}
                  onChange={(e) => {
                    setInviteUsername(e.target.value);
                    if (usernameError) setUsernameError("");
                  }}
                  className={`flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 ${
                    usernameError ? "border-red-500" : ""
                  }`}
                  data-testid="input-invite-email"
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger
                    className="w-32 bg-slate-700 border-slate-600 text-white"
                    data-testid="select-invite-role"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem
                      value="관리자"
                      className="text-white hover:bg-slate-600"
                    >
                      관리자
                    </SelectItem>
                    <SelectItem
                      value="팀원"
                      className="text-white hover:bg-slate-600"
                    >
                      팀원
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  // onClick={async () => {
                  //   // Email validation
                  //   if (!inviteUsername.trim()) {
                  //     setUsernameError("이메일을 입력해 주세요.");
                  //     return;
                  //   }

                  //   // Email format validation
                  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  //   if (!emailRegex.test(inviteUsername)) {
                  //     setUsernameError("올바른 이메일 형식을 입력해 주세요.");
                  //     return;
                  //   }

                  //   setIsInviteLoading(true);

                  //   try {
                  //     let existingInvites: any[] | null = null;
                  //     const existingInviteUrl = `/api/invitations/email/${inviteUsername}`; // Axios가 인코딩 처리

                  //     try {
                  //       const existingInviteResponse = await api.get(
                  //         existingInviteUrl
                  //       );
                  //       existingInvites = existingInviteResponse.data;
                  //     } catch (error) {

                  //     }

                  //     if (existingInvites && existingInvites.length > 0) {
                  //       const pendingInvite = existingInvites.find(
                  //         (invite: any) => invite.status === "pending"
                  //       );
                  //       if (pendingInvite) {
                  //         toast({
                  //           title: "초대 실패",
                  //           description: "이미 초대가 진행 중인 사용자입니다.",
                  //           variant: "destructive",
                  //         });
                  //         setIsInviteLoading(false);
                  //         return;
                  //       }
                  //     }

                  //     let existingUser = null;
                  //     try {
                  //       // 🚩 [수정] 기존 사용자 확인 fetch 블록
                  //       const response = await api.get(
                  //         `/api/users/by-email/${inviteUsername}` // Axios가 인코딩 처리
                  //       );
                  //       existingUser = response.data; // 자동 JSON 파싱
                  //     } catch (error) {
                  //       // 사용자가 존재하지 않아도 괜찮음
                  //     }

                  //     const usersResponse = await api.get("/api/users", {
                  //       params: {
                  //         workspace: true,
                  //       },
                  //     });
                  //     const allUsers = usersResponse.data;

                  //     const myEmail = localStorage.getItem("userEmail")?.toLowerCase();

                  //     // 이메일이 일치하는 사용자를 우선 찾고, 없으면 첫 번째 사용자 선택
                  //     let currentUser = allUsers.find(
                  //       (u: any) => u.email?.toLowerCase() === myEmail
                  //     );

                  //     // if (!currentUser && allUsers.length > 0) {
                  //     //   currentUser = allUsers[0];
                  //     // }

                  //     // 현재 사용자가 없으면 에러 처리
                  //     if (!currentUser) {
                  //       const storedName = localStorage.getItem("userName")
                  //       currentUser = { email: myEmail, name: storedName };
                  //     }

                  //     // 워크스페이스 기반 초대 생성 (프로젝트 ID 없이)
                  //     const invitationData = {
                  //       workspaceId: workspaceId,
                  //       inviterEmail: currentUser.email,
                  //       inviterName: currentUser.name,
                  //       inviteeEmail: inviteUsername,
                  //       role: inviteRole,
                  //       status: "pending",
                  //     };

                  //     // -----------------------------------------------------------------
                  //     // 🚩 [수정] 초대 생성 POST fetch 블록
                  //     // Axios는 method, headers, body/JSON.stringify를 자동으로 처리합니다.
                  //     // 4xx/5xx 에러는 throw하므로, 별도의 if (!response.ok) 체크가 필요 없습니다.
                  //     const response = await api.post(
                  //       "/api/invitations",
                  //       invitationData
                  //     );

                  //     const newInvitation = response.data; // 자동 JSON 파싱
                  //     // -----------------------------------------------------------------

                  //     // localStorage에도 저장 (기존 호환성 유지)
                  //     const invitations = JSON.parse(
                  //       localStorage.getItem("invitations") || "[]"
                  //     );
                  //     const localInvitation = {
                  //       ...newInvitation,
                  //       inviterName: currentUser.name,
                  //       inviteeName: existingUser
                  //         ? existingUser.name
                  //         : inviteUsername,
                  //       createdAt: new Date().toISOString(),
                  //     };

                  //     invitations.push(localInvitation);
                  //     localStorage.setItem(
                  //       "invitations",
                  //       JSON.stringify(invitations)
                  //     );

                  //     // 전역 초대 목록에 저장 (신규가입자도 확인할 수 있도록)
                  //     const globalInvitations = JSON.parse(
                  //       localStorage.getItem("pendingInvitations") || "[]"
                  //     );
                  //     globalInvitations.push(localInvitation);
                  //     localStorage.setItem(
                  //       "pendingInvitations",
                  //       JSON.stringify(globalInvitations)
                  //     );

                  //     // 기존 사용자의 경우 개별 받은 초대 목록에도 추가
                  //     if (existingUser) {
                  //       const receivedInvitations = JSON.parse(
                  //         localStorage.getItem(
                  //           `receivedInvitations_${inviteUsername}`
                  //         ) || "[]"
                  //       );
                  //       receivedInvitations.push(localInvitation);
                  //       localStorage.setItem(
                  //         `receivedInvitations_${inviteUsername}`,
                  //         JSON.stringify(receivedInvitations)
                  //       );

                  //       // 같은 브라우저의 다른 탭에서 즉시 업데이트되도록 storage 이벤트 수동 트리거
                  //       window.dispatchEvent(
                  //         new StorageEvent("storage", {
                  //           key: `receivedInvitations_${inviteUsername}`,
                  //           newValue: JSON.stringify(receivedInvitations),
                  //           oldValue: JSON.stringify(
                  //             receivedInvitations.slice(0, -1)
                  //           ),
                  //         })
                  //       );
                  //     } else {
                  //       // 신규 사용자의 경우에도 pendingInvitations 변경 이벤트 트리거
                  //       window.dispatchEvent(
                  //         new StorageEvent("storage", {
                  //           key: "pendingInvitations",
                  //           newValue:
                  //             localStorage.getItem("pendingInvitations"),
                  //           oldValue: JSON.stringify(
                  //             globalInvitations.slice(0, -1)
                  //           ),
                  //         })
                  //       );
                  //     }

                  //     const inviteeName = existingUser
                  //       ? existingUser.name
                  //       : inviteUsername;
                  //     const userStatus = existingUser
                  //       ? "기존 사용자"
                  //       : "신규 가입 예정자";

                  //     toast({
                  //       title: "초대 완료",
                  //       description: `${inviteeName}(${userStatus})에게 ${inviteRole} 권한으로 초대를 보냈습니다.`,
                  //     });

                  //     setInviteUsername("");
                  //     setInviteRole("팀원");
                  //     setUsernameError("");
                  //     setIsInviteModalOpen(false);
                  //   } catch (error) {
                  //     console.error("초대 실패:", error);
                  //     setUsernameError("초대 발송 중 오류가 발생했습니다.");
                  //   } finally {
                  //     setIsInviteLoading(false);
                  //   }
                  // }}
                  onClick={async () => {
                    // 1. Email validation
                    if (!inviteUsername.trim()) {
                      setUsernameError("이메일을 입력해 주세요.");
                      return;
                    }

                    // 2. Email format validation
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(inviteUsername)) {
                      setUsernameError("올바른 이메일 형식을 입력해 주세요.");
                      return;
                    }

                    setIsInviteLoading(true);

                    try {
                      // 3. 중복 초대 체크 수정 (현재 워크스페이스 ID 확인 추가)
                      let existingInvites: any[] | null = null;
                      try {
                        const existingInviteResponse = await api.get(
                          `/api/invitations/email/${inviteUsername}`,
                        );
                        existingInvites = existingInviteResponse.data;
                      } catch (error) {
                        // 에러 발생 시 무시 (데이터가 없는 경우 등)
                      }

                      if (existingInvites && existingInvites.length > 0) {
                        // ⭐ 수정: 전체 중 'pending'이면서 '현재 워크스페이스'인 초대가 있는지 확인
                        const pendingInvite = existingInvites.find(
                          (invite: any) =>
                            invite.status === "pending" &&
                            invite.workspaceId === workspaceId,
                        );

                        if (pendingInvite) {
                          toast({
                            title: "초대 실패",
                            description:
                              "이 워크스페이스에 이미 초대가 진행 중인 사용자입니다.",
                            variant: "destructive",
                          });
                          setIsInviteLoading(false);
                          return;
                        }
                      }

                      // 4. 기존 사용자 확인 (초대받는 사람)
                      let existingUser = null;
                      try {
                        const response = await api.get(
                          `/api/users/by-email/${inviteUsername}`,
                        );
                        existingUser = response.data;
                      } catch (error) {}

                      // 5. 발신자(본인) 정보 가져오기 수정 ⭐
                      // 기존의 복잡한 allUsers.find 로직 대신, 로그인 시 저장된 본인의 정보를 직접 참조합니다.
                      const myEmail = localStorage
                        .getItem("userEmail")
                        ?.toLowerCase();
                      const myName =
                        localStorage.getItem("userName") || "관리자";

                      const currentUser = {
                        email: myEmail,
                        name: myName,
                      };

                      // 6. 초대 데이터 구성
                      const invitationData = {
                        workspaceId: workspaceId,
                        inviterEmail: currentUser.email,
                        inviterName: currentUser.name, // 로그인된 본인의 이름이 정확히 들어감
                        inviteeEmail: inviteUsername.toLowerCase(),
                        role: inviteRole,
                        status: "pending",
                      };

                      // 7. 초대 생성 API 호출
                      const response = await api.post(
                        "/api/invitations",
                        invitationData,
                      );
                      const newInvitation = response.data;

                      // 8. 로컬 스토리지 및 UI 업데이트 (기존 로직 유지)
                      const invitations = JSON.parse(
                        localStorage.getItem("invitations") || "[]",
                      );
                      const localInvitation = {
                        ...newInvitation,
                        inviterName: currentUser.name,
                        inviteeName: existingUser
                          ? existingUser.name
                          : inviteUsername,
                        createdAt: new Date().toISOString(),
                      };

                      invitations.push(localInvitation);
                      localStorage.setItem(
                        "invitations",
                        JSON.stringify(invitations),
                      );

                      const globalInvitations = JSON.parse(
                        localStorage.getItem("pendingInvitations") || "[]",
                      );
                      globalInvitations.push(localInvitation);
                      localStorage.setItem(
                        "pendingInvitations",
                        JSON.stringify(globalInvitations),
                      );

                      if (existingUser) {
                        const receivedKey = `receivedInvitations_${inviteUsername.toLowerCase()}`;
                        const receivedInvitations = JSON.parse(
                          localStorage.getItem(receivedKey) || "[]",
                        );
                        receivedInvitations.push(localInvitation);
                        localStorage.setItem(
                          receivedKey,
                          JSON.stringify(receivedInvitations),
                        );

                        window.dispatchEvent(
                          new StorageEvent("storage", {
                            key: receivedKey,
                            newValue: JSON.stringify(receivedInvitations),
                          }),
                        );
                      }

                      toast({
                        title: "초대 완료",
                        description: `${
                          existingUser ? existingUser.name : inviteUsername
                        }님에게 초대를 보냈습니다.`,
                      });

                      // 9. 상태 초기화 및 모달 닫기
                      setInviteUsername("");
                      setInviteRole("팀원");
                      setUsernameError("");
                      setIsInviteModalOpen(false);
                    } catch (error) {
                      console.error("초대 실패:", error);
                      setUsernameError("초대 발송 중 오류가 발생했습니다.");
                    } finally {
                      setIsInviteLoading(false);
                    }
                  }}
                  disabled={!inviteUsername.trim() || isInviteLoading}
                  data-testid="button-send-invite"
                >
                  {isInviteLoading ? "전송 중..." : "초대하기"}
                </Button>
              </div>
              {usernameError && (
                <p
                  className="text-red-400 text-sm mt-1"
                  data-testid="text-username-error"
                >
                  {usernameError}
                </p>
              )}
            </div>

            {/* Existing Members */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">
                {workspaceName}의 멤버
              </h4>
              <div
                className="space-y-2 overflow-y-auto relative"
                style={{ minHeight: "340px", maxHeight: "340px" }}
              >
                {(() => {
                  const allUsers = Array.isArray(users)
                    ? (users as SafeUser[])
                    : [];
                  const filteredUsers = allUsers.filter(
                    (user) => !deletedMemberIds.has(user.id),
                  );

                  return (
                    <>
                      {filteredUsers.map((user) => {
                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 hover:bg-slate-700 rounded"
                            data-testid={`member-row-${user.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-600 text-white text-sm">
                                  {user.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-white">
                                {user.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-xs border-slate-600 text-slate-300"
                              >
                                {user.role}
                              </Badge>
                              {user.email !== "admin@qubicom.co.kr" &&
                                (user.role !== "관리자" ||
                                  currentUserEmail === "admin@qubicom.co.kr") &&
                                isCurrentUserAdmin && ( // admin@qubicom.co.kr 본인은 삭제 불가
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                                        data-testid={`button-delete-member-${user.id}`}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-800 border-slate-700">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">
                                          멤버 삭제
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-300">
                                          정말로 <strong>{user.name}</strong>{" "}
                                          멤버를 삭제하시겠습니까?
                                          <br />
                                          <br />
                                          <span className="text-red-400 font-medium">
                                            ⚠️ 주의: 이 작업은 되돌릴 수 없으며,
                                            해당 사용자가 모든 프로젝트, 목표,
                                            작업, 미팅에서 제거됩니다.
                                          </span>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                                          취소
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            deleteUserMutation.mutate(user.id)
                                          }
                                          className="bg-red-600 text-white hover:bg-red-700"
                                          data-testid={`button-confirm-delete-${user.id}`}
                                        >
                                          삭제
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                          멤버가 없습니다.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
