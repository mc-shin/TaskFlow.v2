import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Users,
  Trash2,
  UserPlus,
  Mail,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  goals,
  type ProjectWithOwners,
  type SafeUserWithStats,
} from "@shared/schema";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import api from "@/api/api-index";
import * as Axios from "axios"; // 👈 Axios 타입/헬퍼 함수 사용을 위해 임포트가 필요합니다.
import { useParams } from "wouter";

const inviteSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  role: z.enum(["관리자", "팀원"], { message: "역할을 선택해주세요" }),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function Admin() {
  const [activeTab, setActiveTab] = useState("projects");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id: workspaceId } = useParams();

  // Load workspace name from localStorage
  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem("workspaceId"); // ID 로드
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

    window.addEventListener("handleWorkspaceUpdate", handleWorkspaceNameUpdate);
    return () => {
      window.removeEventListener(
        "handleWorkspaceUpdate",
        handleWorkspaceNameUpdate
      );
    };
  }, []);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", workspaceId], // 식별자로 사용
    queryFn: async () => {
      const response = await api.get(`/api/workspaces/${workspaceId}/projects`);
      return response.data;
    },
    enabled: !!workspaceId,
  });

  const { data: usersWithStats, isLoading: usersLoading } = useQuery({
    queryKey: ["users-stats", workspaceId],
    queryFn: async () => {
      // URL에 직접 workspaceId를 포함하여 의도를 명확히 함
      const response = await api.get(
        `/api/workspaces/${workspaceId}/users/with-stats`
      );
      return response.data;
    },
    staleTime: 0,
    enabled: !!workspaceId,
  });
console.log(usersWithStats)
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/api/workspaces/${workspaceId}/tasks`);
      return response.data;
    },
    enabled: !!workspaceId,
  });

  // Get current user email for permission checking
  const currentUserEmail = localStorage.getItem("userEmail") || "";

  // 사용자 삭제 뮤테이션
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // API 경로 자체에 workspaceId를 포함하여 하드코딩 요소를 제거
      return apiRequest(
        "DELETE",
        `/api/workspaces/${workspaceId}/workspaceMembers/${userId}`,
        {},
        { "X-User-Email": currentUserEmail }
      );
    },
    onSuccess: () => {
      // 명시적으로 모든 사용자 관련 쿼리들을 무효화
      queryClient.invalidateQueries({ queryKey: ["users-stats", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });

      // predicate를 사용한 추가 무효화
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

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const formatDeadline = (deadline: string) => {
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

  // 아카이브된 항목 필터링 (리스트 페이지와 동일한 로직)
  const archivedItems = (() => {
    try {
      const stored = localStorage.getItem("archivedItems");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  // 아카이브된 ID들을 빠른 조회를 위해 Set으로 변환
  const archivedIds = new Set<string>();
  archivedItems.forEach((item: any) => {
    if (typeof item === "string") {
      archivedIds.add(item);
    } else if (item && typeof item === "object") {
      if (item.id) {
        archivedIds.add(item.id);
      } else if (item.data && item.data.id) {
        archivedIds.add(item.data.id);
      }
    }
  });

  // 아카이브되지 않은 프로젝트들만 필터링
  const activeProjects =
    (projects as ProjectWithOwners[])?.filter((project) => {
      return !archivedIds.has(project.id);
    }) || [];

  // 아카이브되지 않은 작업들만 필터링
  const activeTasks =
    (tasks as any[])?.filter((task) => {
      return !archivedIds.has(task.id);
    }) || [];

  // 상태별 색상 함수
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "진행전":
        return "bg-gray-500"; // secondary
      case "진행중":
        return "bg-blue-500"; // default/primary
      case "완료":
        return "bg-green-500"; // success
      case "이슈":
      case "이슈함":
        return "bg-orange-500"; // issue (legacy support)
      default:
        return "bg-gray-500";
    }
  };

  const [workspace, setWorkspace] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      try {
        const userRes = await api.get(
          `/api/users/by-email/${encodeURIComponent(userEmail)}`
        );
        const userId = userRes.data.id;
        setCurrentUserId(userId);

        const wsRes = await api.get(`/api/workspaces/${workspaceId}`);
        const wsData = wsRes.data;
        setWorkspace(wsData);

        if (wsData.ownerId === userId || userRes.data.role === "관리자") {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("접근 권한 확인 중 오류:", error);
      }
    };

    checkAccess();
  }, [workspaceId]);

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            관리자
          </h1>
          <p
            className="text-sm text-muted-foreground"
            data-testid="header-subtitle"
          >
            프로젝트와 팀 멤버를 관리합니다
          </p>
        </div>
      </header>

      {/* Admin Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-fit grid-cols-2 mb-6">
            <TabsTrigger value="projects" data-testid="tab-projects">
              프로젝트
            </TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">
              멤버
            </TabsTrigger>
          </TabsList>

          {/* 프로젝트 탭 */}
          <TabsContent value="projects" data-testid="content-projects">
            {projectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-48 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div>
                {activeProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeProjects?.map((project: any) => {
                      // 프로젝트의 모든 작업들 수집
                      const projectGoal =
                        project.goals?.flatMap((goal: any) => goal || []) || [];

                      const projectTasks =
                        project.goals?.flatMap(
                          (goal: any) => goal.tasks || []
                        ) || [];

                      const projectTasksSum =
                        project.goals
                          ?.map((goal: any) =>
                            goal.tasks?.map((task: any) => task?.progress)
                          )
                          ?.reduce(
                            (totalAverageSum: number, progressArray: any[]) => {
                              if (
                                !Array.isArray(progressArray) ||
                                progressArray.length === 0
                              ) {
                                return totalAverageSum;
                              }

                              // progressArray 내부 값들의 합계 계산
                              const sumOfProgress = progressArray.reduce(
                                (sum: number, value: any) => {
                                  const numberValue = +value || 0;
                                  return sum + numberValue;
                                },
                                0
                              );

                              const average =
                                sumOfProgress / progressArray.length;

                              return totalAverageSum + average;
                            },
                            0
                          ) || 0;

                      // 프로젝트 전체 진행률 계산
                      const totalGoal = projectGoal.length;
                      const totalTasks = projectTasks.length;
                      const projectProgress = Math.round(
                        Math.round(projectTasksSum) / totalGoal || 0
                      );

                      return (
                        <Card
                          key={project.id}
                          className="relative text-white"
                          data-testid={`card-project-${project.id}`}
                        >
                          {/* D-day */}
                          <div className="absolute top-4 left-4">
                            <span className="text-sm font-medium text-slate-300">
                              {project.deadline
                                ? formatDeadline(project.deadline)
                                : "D-∞"}
                            </span>
                          </div>

                          <CardContent className="p-6 pt-12">
                            {/* 원형 진행률 */}
                            <div className="flex items-center justify-center mb-6">
                              <div className="relative w-24 h-24">
                                <svg
                                  className="w-24 h-24 transform -rotate-90"
                                  viewBox="0 0 100 100"
                                >
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    stroke={
                                      projectProgress === 0
                                        ? "hsl(210, 40%, 25%)"
                                        : "hsl(215, 28%, 17%)"
                                    }
                                    strokeWidth="6"
                                    fill="transparent"
                                  />
                                  {projectProgress > 0 && (
                                    <circle
                                      cx="50"
                                      cy="50"
                                      r="40"
                                      stroke="hsl(217, 91%, 60%)"
                                      strokeWidth="6"
                                      fill="transparent"
                                      strokeDasharray={`${2 * Math.PI * 40}`}
                                      strokeDashoffset={`${
                                        2 *
                                        Math.PI *
                                        40 *
                                        (1 - projectProgress / 100)
                                      }`}
                                      strokeLinecap="round"
                                    />
                                  )}
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-xs text-slate-400">
                                      진행률
                                    </div>
                                    <div
                                      className="text-lg font-bold"
                                      data-testid={`text-progress-${project.id}`}
                                    >
                                      {projectProgress}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 프로젝트 정보 */}
                            <div className="text-center mb-6">
                              <div className="text-blue-400 text-lg font-semibold mb-1">
                                {project.name}
                              </div>
                              <div className="text-white text-sm font-medium mb-2">
                                {project.description || "프로젝트 설명 없음"}
                              </div>
                              <div className="text-slate-300 text-sm">
                                총 작업 개수: {totalTasks}
                              </div>
                            </div>

                            {/* 작업 리스트 */}
                            <div className="space-y-2 max-h-[132px] overflow-y-auto">
                              {projectTasks.map((task: any) => {
                                return (
                                  <div
                                    key={task.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <div
                                      className={`w-2 h-2 rounded-full ${getTaskStatusColor(
                                        task.status
                                      )}`}
                                    ></div>
                                    <span className="truncate text-slate-200 pr-4">
                                      {task.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-xl bg-muted/10 border-muted-foreground/20">
                    <div className="flex flex-col gap-3 text-center">
                      <p className="text-2xl font-medium">
                        진행 중인 프로젝트가 없습니다.
                      </p>
                      <p className="text-muted-foreground text-lg mt-1">
                        새로운 프로젝트를 생성하여 관리를 시작해보세요.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* 멤버 탭 */}
          <TabsContent value="members" data-testid="content-members">
            {usersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-48 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(usersWithStats as SafeUserWithStats[])?.map(
                  (user: SafeUserWithStats) => (
                    <Card
                      key={user.id}
                      className="relative hover:shadow-lg transition-shadow duration-200"
                      data-testid={`card-user-${user.id}`}
                    >
                      {/* 경고 표시 */}
                      <div className="flex justify-end pt-6 pr-6">
                        <Badge
                          variant="destructive"
                          className={
                            (user.overdueTaskCount ?? 0) > 0
                              ? "gap-1"
                              : "invisible opacity-0 transition-opacity duration-300"
                          }
                          data-testid={`badge-user-warning-${user.id}`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          기한 초과
                        </Badge>
                      </div>

                      <CardHeader className="pt-3">
                        {/* 사용자 정보 */}
                        <div className="flex items-center justify-center mb-4">
                          <Avatar className="w-16 h-16">
                            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                              {user.initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <CardTitle
                          className="text-center"
                          data-testid={`text-user-name-${user.id}`}
                        >
                          {user.name}
                        </CardTitle>
                      </CardHeader>

                      <CardContent>
                        {/* 작업 통계 */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              작업 개수
                            </span>
                            <span
                              className="font-medium"
                              data-testid={`text-user-task-count-${user.id}`}
                            >
                              {user.taskCount || 0}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              완료된 작업
                            </span>
                            <span className="font-medium text-green-500">
                              {user.completedTaskCount || 0}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              진행중 작업
                            </span>
                            <span className="font-medium text-blue-500">
                              {(user.taskCount || 0) -
                                (user.completedTaskCount || 0) -
                                (user.overdueTaskCount || 0) || 0}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              기한 초과 작업
                            </span>
                            <span className="font-medium text-red-500">
                              {user.overdueTaskCount || 0}
                            </span>
                          </div>

                          {/* 진행률 바 */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                진행률
                              </span>
                              <span
                                className="font-medium"
                                data-testid={`text-user-progress-${user.id}`}
                              >
                                {user?.taskCount && user?.completedTaskCount
                                  ? Math.round(
                                      (user.completedTaskCount /
                                        user.taskCount) *
                                        100
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                user?.taskCount && user?.completedTaskCount
                                  ? Math.round(
                                      (user.completedTaskCount /
                                        user.taskCount) *
                                        100
                                    )
                                  : 0
                              }
                              className="h-2"
                            />
                          </div>

                          {isAuthorized &&
                            user.id !== currentUserId &&
                            user.id !== workspace?.ownerId && (
                              <div className="pt-3 border-t">
                                {workspace?.ownerId === currentUserId ||
                                user.role !== "관리자" ? (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                        data-testid={`button-delete-user-${user.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        멤버 삭제
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          멤버 삭제 확인
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          정말로 "{user.name}" 멤버를
                                          삭제하시겠습니까? 이 작업은 되돌릴 수
                                          없으며, 해당 멤버는 모든 프로젝트와
                                          작업에서 제거됩니다.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          취소
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteUser(user.id)
                                          }
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          data-testid={`button-confirm-delete-user-${user.id}`}
                                        >
                                          삭제
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                ) : (
                                  null
                                )}
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
