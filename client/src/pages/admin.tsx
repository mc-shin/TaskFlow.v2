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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { ProjectWithOwners, SafeUserWithStats } from "@shared/schema";
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

const inviteSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  role: z.enum(["관리자", "팀원"], { message: "역할을 선택해주세요" }),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function Admin() {
  const [activeTab, setActiveTab] = useState("projects");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("하이더");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        handleWorkspaceNameUpdate
      );
    };
  }, []);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    refetchInterval: 10000,
  });

  // const { data: usersWithStats, isLoading: usersLoading } = useQuery({
  //   queryKey: ["/api/users/with-stats", { workspace: true }],
  //   queryFn: () => fetch('/api/users/with-stats?workspace=true').then(res => res.json()),
  //   refetchInterval: 10000,
  // });

  ///////////
  const { data: usersWithStats, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/with-stats", { workspace: true }],
    // 🚩 [수정] queryFn에서 fetch 대신 Axios 클라이언트(api)를 사용하도록 수정
    queryFn: async ({ queryKey }) => {
      // 1. queryKey의 첫 번째 요소(/api/users/with-stats)를 URL로 사용합니다.
      const url = queryKey[0] as string;
      // 2. queryKey의 두 번째 요소({ workspace: true })를 Axios의 params로 전달합니다.
      //    Axios가 자동으로 ?workspace=true로 안전하게 인코딩합니다.
      const response = await api.get(url, {
        params: queryKey[1] as object,
      });

      // 3. Axios는 2xx 응답(성공) 시 JSON 파싱된 데이터를 response.data에 담아 반환합니다.
      return response.data;
    },
    refetchInterval: 10000,
  });
  ///////////

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    refetchInterval: 10000,
  });

  // Get current user email for permission checking
  const currentUserEmail = localStorage.getItem("userEmail") || "";

  // 초대 폼
  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "팀원",
    },
  });

  // 사용자 삭제 뮤테이션
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(
        "DELETE",
        `/api/users/${userId}`,
        {},
        {
          "X-User-Email": currentUserEmail,
        }
      );
    },
    onSuccess: () => {
      // 명시적으로 모든 사용자 관련 쿼리들을 무효화
      console.log("관리자 페이지 멤버 삭제 후 캐시 무효화 시작");

      // 구체적인 쿼리들을 명시적으로 무효화
      queryClient.invalidateQueries({
        queryKey: ["/api/users", { workspace: true }],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users/with-stats", { workspace: true }],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });

      // predicate를 사용한 추가 무효화
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) => {
          const key = queryKey[0] as string;
          console.log("관리자 페이지 캐시 무효화 확인 중:", key);
          return (
            key?.startsWith("/api/users") ||
            key?.startsWith("/api/projects") ||
            key?.startsWith("/api/goals") ||
            key?.startsWith("/api/tasks") ||
            key?.startsWith("/api/meetings")
          );
        },
      });

      console.log("관리자 페이지 멤버 삭제 후 캐시 무효화 완료");

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

  // 초대 보내기 함수
  const handleInviteSubmit = async (data: InviteForm) => {
    // setIsInviteLoading(true);
    // try {
    //   // 이미 해당 워크스페이스에 초대되었는지 확인
    //   const existingInviteResponse = await fetch(
    //     `/api/invitations/email/${encodeURIComponent(data.email)}`
    //   );
    //   if (existingInviteResponse.ok) {
    //     const existingInvites = await existingInviteResponse.json();
    //     const pendingInvite = existingInvites.find(
    //       (invite: any) => invite.status === "pending"
    //     );
    //     if (pendingInvite) {
    //       toast({
    //         title: "초대 실패",
    //         description: "이미 초대가 진행 중인 사용자입니다.",
    //         variant: "destructive",
    //       });
    //       setIsInviteLoading(false);
    //       return;
    //     }
    //   }

    //   // 현재 사용자 정보 가져오기 (admin은 이미 로그인되어 있으므로 기본값 사용)
    //   let currentUser = {
    //     name: "관리자",
    //     email: "admin@qubicom.co.kr",
    //     id: "admin",
    //   };

    //   // 실제 현재 사용자 정보가 있다면 사용
    //   const userEmail = localStorage.getItem("userEmail");
    //   if (userEmail) {
    //     try {
    //       const currentUserResponse = await fetch(
    //         `/api/users/by-email/${encodeURIComponent(userEmail)}`
    //       );
    //       if (currentUserResponse.ok) {
    //         currentUser = await currentUserResponse.json();
    //       }
    //     } catch (error) {
    //       console.log("사용자 정보 조회 실패, 기본값 사용:", error);
    //     }
    //   } else {
    //     // userEmail이 localStorage에 없다면 admin으로 설정
    //     localStorage.setItem("userEmail", "admin@qubicom.co.kr");
    //     localStorage.setItem("userName", "관리자");
    //   }

    //   // 워크스페이스 기반 초대 생성 (projectId 없이)
    //   const invitationResponse = await fetch("/api/invitations", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       inviterEmail: currentUser.email,
    //       inviteeEmail: data.email,
    //       role: data.role,
    //       status: "pending",
    //     }),
    //   });

    //   if (!invitationResponse.ok) {
    //     throw new Error("초대 전송에 실패했습니다.");
    //   }

    //   const invitation = await invitationResponse.json();

    //   // localStorage에 초대 정보 저장 (수신자용)
    //   const receivedInvitations = JSON.parse(
    //     localStorage.getItem(`receivedInvitations_${data.email}`) || "[]"
    //   );
    //   receivedInvitations.push(invitation);
    //   localStorage.setItem(
    //     `receivedInvitations_${data.email}`,
    //     JSON.stringify(receivedInvitations)
    //   );

    //   // 전역 초대 목록에도 추가
    //   const pendingInvitations = JSON.parse(
    //     localStorage.getItem("pendingInvitations") || "[]"
    //   );
    //   pendingInvitations.push(invitation);
    //   localStorage.setItem(
    //     "pendingInvitations",
    //     JSON.stringify(pendingInvitations)
    //   );

    //   // 다른 탭에 알림
    //   window.dispatchEvent(
    //     new StorageEvent("storage", {
    //       key: "pendingInvitations",
    //       newValue: JSON.stringify(pendingInvitations),
    //     })
    //   );

    //   toast({
    //     title: "초대 전송 완료",
    //     description: `${data.email}에게 초대를 전송했습니다.`,
    //   });

    //   // 폼 리셋 및 다이얼로그 닫기
    //   inviteForm.reset();
    //   setIsInviteDialogOpen(false);
    // } catch (error) {
    //   console.error("초대 전송 중 오류:", error);
    //   toast({
    //     title: "초대 전송 실패",
    //     description:
    //       error instanceof Error
    //         ? error.message
    //         : "알 수 없는 오류가 발생했습니다.",
    //     variant: "destructive",
    //   });
    // } finally {
    //   setIsInviteLoading(false);
    // }

    ///////////////////////
    setIsInviteLoading(true);
    try {
      // 🚩 [수정 1] fetch -> api.get (기존 초대 확인)
      // -----------------------------------------------------------------
      let existingInvites: any[] = [];
      try {
        const existingInviteResponse = await api.get(
          `/api/invitations/email/${encodeURIComponent(data.email)}`
        );
        // Axios는 2xx 응답(성공) 시만 이 라인에 도달하며, 데이터는 response.data에 있습니다.
        existingInvites = existingInviteResponse.data;
      } catch (error) {
        // 404 Not Found는 초대가 없음을 의미할 수 있으므로,
        // 4xx 에러가 발생하면 초대가 없는 것으로 간주하고 넘어갑니다.
        if (
          !Axios.isAxiosError(error) ||
          !error.response ||
          error.response.status !== 404
        ) {
          throw error; // 다른 치명적인 에러는 다시 throw
        }
      }
      // -----------------------------------------------------------------

      const pendingInvite = existingInvites.find(
        (invite: any) => invite.status === "pending"
      );
      if (pendingInvite) {
        toast({
          title: "초대 실패",
          description: "이미 초대가 진행 중인 사용자입니다.",
          variant: "destructive",
        });
        setIsInviteLoading(false);
        return;
      }

      // 현재 사용자 정보 가져오기 (admin은 이미 로그인되어 있으므로 기본값 사용)
      let currentUser = {
        name: "관리자",
        email: "admin@qubicom.co.kr",
        id: "admin",
      };

      // 실제 현재 사용자 정보가 있다면 사용
      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        try {
          // 🚩 [수정 2] fetch -> api.get (현재 사용자 정보 조회)
          // -----------------------------------------------------------------
          const currentUserResponse = await api.get(
            `/api/users/by-email/${encodeURIComponent(userEmail)}`
          );
          currentUser = currentUserResponse.data;
          // -----------------------------------------------------------------
        } catch (error) {
          console.log("사용자 정보 조회 실패, 기본값 사용:", error);
        }
      } else {
        // userEmail이 localStorage에 없다면 admin으로 설정
        localStorage.setItem("userEmail", "admin@qubicom.co.kr");
        localStorage.setItem("userName", "관리자");
      }

      // 🚩 [수정 3] fetch -> api.post (초대 생성)
      // -----------------------------------------------------------------
      const invitationResponse = await api.post("/api/invitations", {
        inviterEmail: currentUser.email,
        inviteeEmail: data.email,
        role: data.role,
        status: "pending",
      });

      // Axios는 2xx 응답 시만 다음 라인으로 진행하고, 응답 데이터는 response.data에 있습니다.
      const invitation = invitationResponse.data;
      // -----------------------------------------------------------------

      // localStorage에 초대 정보 저장 (수신자용)
      const receivedInvitations = JSON.parse(
        localStorage.getItem(`receivedInvitations_${data.email}`) || "[]"
      );
      receivedInvitations.push(invitation);
      localStorage.setItem(
        `receivedInvitations_${data.email}`,
        JSON.stringify(receivedInvitations)
      );

      // 전역 초대 목록에도 추가
      const pendingInvitations = JSON.parse(
        localStorage.getItem("pendingInvitations") || "[]"
      );
      pendingInvitations.push(invitation);
      localStorage.setItem(
        "pendingInvitations",
        JSON.stringify(pendingInvitations)
      );

      // 다른 탭에 알림
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "pendingInvitations",
          newValue: JSON.stringify(pendingInvitations),
        })
      );

      toast({
        title: "초대 전송 완료",
        description: `${data.email}에게 초대를 전송했습니다.`,
      });

      // 폼 리셋 및 다이얼로그 닫기
      // inviteForm.reset(); // 주석 처리된 부분이라고 가정
      // setIsInviteDialogOpen(false); // 주석 처리된 부분이라고 가정
    } catch (error) {
      console.error("초대 전송 중 오류:", error);

      // 4xx/5xx Axios 에러 메시지를 표시하도록 개선
      let errorMessage = "알 수 없는 오류가 발생했습니다.";
      if (Axios.isAxiosError(error) && error.response) {
        // 서버에서 보낸 에러 메시지가 있다면 사용 (일반적으로 { message: "..." } 형태)
        errorMessage =
          (error.response.data as { message?: string })?.message ||
          `서버 오류 (${error.response.status})`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "초대 전송 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsInviteLoading(false);
    }
    ////////////////////////
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

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "접속 기록 없음";

    const loginDate = new Date(lastLogin);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - loginDate.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
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
  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행전":
        return "bg-secondary";
      case "진행중":
        return "bg-primary";
      case "완료":
        return "bg-green-600";
      case "이슈":
        return "bg-destructive";
      default:
        return "bg-muted";
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
      case "이슈":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeProjects?.map((project: any) => {
                  // 프로젝트의 모든 작업들 수집
                  const projectTasks =
                    project.goals?.flatMap((goal: any) => goal.tasks || []) ||
                    [];

                  // 프로젝트 전체 진행률 계산
                  const totalTasks = projectTasks.length;
                  const completedTasks = projectTasks.filter(
                    (task: any) => task.status === "완료"
                  ).length;
                  const projectProgress =
                    totalTasks > 0
                      ? Math.round((completedTasks / totalTasks) * 100)
                      : 0;

                  return (
                    <Card
                      key={project.id}
                      className="relative bg-slate-800 text-white border-slate-700"
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
                        <div className="space-y-2">
                          {projectTasks.slice(0, 5).map((task: any) => {
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
                                <span className="truncate text-slate-200">
                                  {task.title}
                                </span>
                              </div>
                            );
                          })}
                          {projectTasks.length > 5 && (
                            <div className="text-xs text-slate-400 text-center mt-2">
                              +{projectTasks.length - 5}개 더
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 멤버 탭 */}
          <TabsContent value="members" data-testid="content-members">
            {/* 멤버 탭 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">팀 멤버</h3>
                <p className="text-sm text-muted-foreground">
                  프로젝트 팀 멤버를 관리합니다
                </p>
              </div>
            </div>

            {usersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-48 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(usersWithStats as SafeUserWithStats[])?.map(
                  (user: SafeUserWithStats) => (
                    <Card
                      key={user.id}
                      className="relative hover:shadow-lg transition-shadow duration-200"
                      data-testid={`card-user-${user.id}`}
                    >
                      {/* 경고 표시 */}
                      {user.hasOverdueTasks && (
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant="destructive"
                            className="gap-1"
                            data-testid={`badge-user-warning-${user.id}`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            기한 초과
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="pb-3">
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

                        <div className="text-center text-sm text-muted-foreground">
                          마지막 접속:{" "}
                          {formatLastLogin(
                            user.lastLoginAt
                              ? user.lastLoginAt.toISOString()
                              : null
                          )}
                        </div>
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
                                {user.progressPercentage || 0}%
                              </span>
                            </div>
                            <Progress
                              value={user.progressPercentage || 0}
                              className="h-2"
                            />
                          </div>

                          {/* 삭제 버튼 - admin@qubicom.co.kr 본인은 삭제 불가, 다른 사용자는 권한에 따라 삭제 가능 */}
                          {user.email !== "admin@qubicom.co.kr" &&
                            (user.role !== "관리자" ||
                              currentUserEmail === "admin@qubicom.co.kr") && (
                              <div className="pt-3 border-t">
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
