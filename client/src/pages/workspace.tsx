import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useParams } from "wouter";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Plus,
  Settings,
  Users,
  Calendar,
  LogOut,
  Mail,
  Check,
  X,
  Bell,
  MailOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { ProjectWithDetails } from "@shared/schema";
import api from "@/api/api-index";
import axios, { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SessionTimer } from "@/components/session-timer";

const workspaceSchema = z.object({
  name: z.string().min(1, "워크스페이스 이름을 입력해주세요"),
  description: z.string().optional(),
});

const workspaceSettingsSchema = z.object({
  name: z.string().min(1, "워크스페이스 이름을 입력해주세요"),
  description: z.string().optional(),
});

type WorkspaceForm = z.infer<typeof workspaceSchema>;
type WorkspaceSettingsForm = z.infer<typeof workspaceSettingsSchema>;

export function WorkspacePage() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [userName, setUserName] = useState("사용자");
  const [workspaceName, setWorkspaceName] = useState("TaskFlow");
  const [workspaceDescription, setWorkspaceDescription] =
    useState("주요 업무 관리 워크스페이스");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isUserInfoLoaded, setIsUserInfoLoaded] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    null,
  );
  const { toast } = useToast();

  // 사용자 id 가져오기
  const userEmail = localStorage.getItem("userEmail");
  const { data: userId } = useQuery({
    queryKey: ["users", "byEmail", userEmail],

    queryFn: async () => {
      const encodedEmail = encodeURIComponent(userEmail as string);
      const response = await api.get(`/api/users/by-email/${encodedEmail}`);

      return response.data.id;
    },
    enabled: !!userEmail,
  });

  // 이 쿼리는 모든 워크스페이스 목록을 가져옵니다.
  const { data: userWorkspaces, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["/api/users/workspaces", userId],

    queryFn: () =>
      api.get(`/api/users/${userId}/workspaces`).then((res) => {
        return Array.isArray(res.data) ? res.data : [];
      }),
    enabled: !!userId && isUserInfoLoaded,
  });

  const combinedResults = useQueries({
    queries: (userWorkspaces ?? []).map((workspace: any) => ({
      queryKey: ["workspace-stats", workspace.id],
      queryFn: async () => {
        // 두 요청을 동시에 보냄 (Promise.all)
        const [membersRes, projectsRes] = await Promise.all([
          api.get(`/api/workspaces/${workspace.id}/members`),
          api.get(`/api/workspaces/${workspace.id}/projects`),
        ]);
        return {
          id: workspace.id,
          memberCount: membersRes.data?.length ?? 0,
          projectCount: projectsRes.data?.length ?? 0,
        };
      },
      enabled: !!workspace.id,
    })),
  });

  // 맵핑 로직 간소화
  const statsMap = Object.fromEntries(
    combinedResults.map((res) => [res.data?.id, res.data]),
  );

  // 통합 로딩 상태 (결합된 쿼리 하나만 체크)
  const isFullyLoading =
    !userId ||
    !isUserInfoLoaded ||
    isLoadingWorkspaces ||
    combinedResults.some((res) => res.isLoading) ||
    userWorkspaces === undefined;

  // const isLimitReached = (userWorkspaces?.length ?? 0) >= 3;
  const isLimitReached = !isFullyLoading && (userWorkspaces?.length ?? 0) >= 3;

  // 1. 현재 선택된 워크스페이스 객체 찾기
  const currentWorkspace = userWorkspaces?.find(
    (ws: any) => ws.id === selectedWorkspaceId,
  );

  // 2. 현재 사용자가 이 워크스페이스의 생성자인지 확인
  const isOwner =
    currentWorkspace && userId && currentWorkspace.ownerId === userId;

  useEffect(() => {
    // localStorage에서 사용자 이름 및 워크스페이스 정보 가져오기
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName) {
      setUserName(storedUserName);
    }

    // localStorage에서 워크스페이스 정보 가져오기
    const storedWorkspaceName = localStorage.getItem("workspaceName");
    const storedWorkspaceDescription = localStorage.getItem(
      "workspaceDescription",
    );
    if (storedWorkspaceName) {
      setWorkspaceName(storedWorkspaceName);
    }
    if (storedWorkspaceDescription) {
      setWorkspaceDescription(storedWorkspaceDescription);
    }

    // 현재 로그인된 사용자의 이메일을 가져와서 실제 username 찾기
    const checkInvitations = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setIsUserInfoLoaded(true); // userEmail이 없어도 로딩 완료로 설정
        return;
      }

      try {
        // 현재 로그인된 사용자의 실제 정보 가져오기 (워크스페이스 멤버만)
        const response = await api.get("/api/users?workspace=true");

        const users = await response.data;

        // userEmail을 기반으로 실제 사용자 매핑
        let currentUser;
        const email = userEmail.toLowerCase();

        // 워크스페이스 멤버 목록에서 현재 이메일로 사용자 찾기
        currentUser = users.find((u: any) => u.email?.toLowerCase() === email);

        let isAdmin = false;

        if (currentUser) {
          // 사용자 이름 저장 및 설정
          setUserName(currentUser.name);
          localStorage.setItem("userName", currentUser.name);

          // [추가] 사용자의 워크스페이스 목록을 가져와 생성자(ownerId)인지 확인
          try {
            // ⚠️ API 호출 전 currentUser.id가 존재하는지 확인
            if (!currentUser.id) {
              throw new Error("currentUser ID is missing.");
            }

            const workspaceResponse = await api.get(
              `/api/users/${currentUser.id}/workspaces`,
            );
            const userWorkspaces = workspaceResponse.data;

            const isOwner = userWorkspaces.some(
              (ws: any) => ws.ownerId === currentUser.id,
            );

            isAdmin = isOwner; // 관리자 상태 업데이트
          } catch (workspaceError) {
            console.error(
              "사용자 워크스페이스 목록 가져오기 실패:",
              workspaceError,
            );
            // API 호출 실패 시 관리자 권한은 false로 유지 (isAdmin = false)
          }
        }

        // 관리자 권한 최종 설정
        setIsAdminUser(isAdmin);
        ////////////

        // 신규가입자인지 확인 (백엔드에 등록되지 않은 사용자)
        // 단, 이전에 초대를 수락한 경우는 신규 사용자가 아님
        const hasAcceptedInvitation =
          localStorage.getItem(`hasAcceptedInvitation_${userEmail}`) === "true";

        // 워크스페이스 접근 권한은 초대 수락 여부로만 결정
        if (!currentUser && !hasAcceptedInvitation) {
          setIsNewUser(true);
        } else {
          setIsNewUser(false);
        }

        let pendingInvitations: any[] = [];

        if (currentUser) {
          // 사용자 이름 저장 및 설정
          setUserName(currentUser.name);
          localStorage.setItem("userName", currentUser.name);
        }

        // 서버에서 실제 초대 목록 가져오기 (동기화)
        try {
          const serverInvitationsResponse = await api.get(
            `/api/invitations/email/${encodeURIComponent(userEmail)}`,
          );

          // Axios는 응답 본문을 response.data에 JSON으로 자동 파싱합니다.
          const serverInvitations = serverInvitationsResponse.data;

          // 서버에서 가져온 pending 초대만 사용
          pendingInvitations = serverInvitations.filter(
            (inv: any) => inv.status === "pending",
          );

          // localStorage와 동기화 (서버 데이터를 신뢰할 수 있는 소스로 사용)
          localStorage.setItem(
            `receivedInvitations_${userEmail}`,
            JSON.stringify(serverInvitations),
          );
        } catch (error: unknown) {
          // ⭐️ [수정] catch 블록의 error: unknown 타입을 안전하게 처리
          let logMessage = "초대 목록 동기화 오류 또는 서버 접근 실패";

          if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.response) {
              // 서버에서 응답을 받았지만 2xx가 아닌 경우 (예: 404, 500)
              logMessage += `: HTTP 오류 (${axiosError.response.status}).`;
              // 서버 응답 본문에 메시지가 포함되어 있다면 추가 (선택 사항)
              if (
                axiosError.response.data &&
                (axiosError.response.data as any).message
              ) {
                logMessage += ` 서버 메시지: ${
                  (axiosError.response.data as any).message
                }`;
              }
            } else if (axiosError.request) {
              // 요청은 했지만 응답을 받지 못한 경우 (네트워크 오류, CORS)
              logMessage += `: 서버 응답 없음 (네트워크 오류).`;
            } else {
              // 요청 설정 중 오류가 발생한 경우
              logMessage += `: 요청 설정 오류 (${axiosError.message}).`;
            }
          } else if (error instanceof Error) {
            logMessage += `: 일반 JS 오류 (${error.message}).`;
          } else {
            logMessage += `: 알 수 없는 오류.`;
          }

          // 에러 타입에 관계없이 상세 로그 출력
          console.error(logMessage, error);

          // 서버에서 가져오기 실패/오류 시 localStorage 백업 사용
          console.warn(
            "서버에서 초대 목록을 가져올 수 없습니다. localStorage 데이터를 사용합니다.",
          );

          const receivedInvitationsString = localStorage.getItem(
            `receivedInvitations_${userEmail}`,
          );

          const receivedInvitations = receivedInvitationsString
            ? JSON.parse(receivedInvitationsString)
            : [];

          pendingInvitations = receivedInvitations.filter(
            (inv: any) => inv.status === "pending",
          );
        }

        // 신규 사용자이고 개별 초대 목록이 비어있다면 전역 목록에서 확인
        if (!currentUser && pendingInvitations.length === 0) {
          const globalInvitations = JSON.parse(
            localStorage.getItem("pendingInvitations") || "[]",
          );
          const globalPending = globalInvitations.filter(
            (inv: any) =>
              inv.inviteeEmail === userEmail && inv.status === "pending",
          );

          // 전역에서 찾은 초대가 있다면 개별 목록으로 이동
          if (globalPending.length > 0) {
            localStorage.setItem(
              `receivedInvitations_${userEmail}`,
              JSON.stringify(globalPending),
            );
            pendingInvitations = globalPending;

            // 전역 목록에서 해당 초대들 제거
            const remainingGlobalInvitations = globalInvitations.filter(
              (inv: any) =>
                !(inv.inviteeEmail === userEmail && inv.status === "pending"),
            );
            localStorage.setItem(
              "pendingInvitations",
              JSON.stringify(remainingGlobalInvitations),
            );
          }
        }

        setInvitations(pendingInvitations);

        // 이미 표시된 초대 ID 목록 가져오기
        const shownInvitationsKey = `shownInvitations_${userEmail}`;
        const shownInvitations = JSON.parse(
          localStorage.getItem(shownInvitationsKey) || "[]",
        );

        // 새로운 초대(아직 표시되지 않은 초대)가 있는지 확인
        const newInvitations = pendingInvitations.filter(
          (inv: any) => !shownInvitations.includes(inv.id),
        );

        // 새로운 초대가 있고 다이얼로그가 닫혀있을 때만 다이얼로그 열기
        if (newInvitations.length > 0 && !isInviteDialogOpen) {
          setIsInviteDialogOpen(true);

          // 새로운 초대들을 표시된 목록에 추가
          const updatedShownInvitations = [
            ...shownInvitations,
            ...newInvitations.map((inv: any) => inv.id),
          ];
          localStorage.setItem(
            shownInvitationsKey,
            JSON.stringify(updatedShownInvitations),
          );
        }

        // 사용자 정보 로딩 완료
        setIsUserInfoLoaded(true);
      } catch (error) {
        console.error("초대 확인 중 오류:", error);
        // 오류가 발생해도 로딩 완료로 표시
        setIsUserInfoLoaded(true);
      }
    };

    // 초기 체크
    checkInvitations();

    // localStorage 변경 이벤트 리스너 추가 (같은 브라우저의 다른 탭에서 실시간 업데이트)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        (e.key && e.key.startsWith("receivedInvitations_")) ||
        e.key === "pendingInvitations"
      ) {
        // 초대 관련 localStorage가 변경되면 다시 체크
        checkInvitations();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      // clearInterval(interval);
    };
  }, []);

  const form = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const settingsForm = useForm<WorkspaceSettingsForm>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      name: workspaceName,
      description: workspaceDescription,
    },
  });

  const onSubmit = async (data: WorkspaceForm) => {
    setIsLoading(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast({
          title: "오류",
          description: "로그인 정보가 없습니다.",
          variant: "destructive",
        });
        return;
      }

      const finalData = {
        ...data,
        description: data.description?.trim() || "설명을 입력해주세요",
      };

      const response = await api.post("/api/workspaces", finalData, {
        headers: {
          "X-User-Email": userEmail,
        },
      });

      const newWorkspace = response.data;

      toast({
        title: "워크스페이스 생성 완료",
        description: "새로운 워크스페이스가 생성되었습니다.",
      });

      // 워크스페이스 생성 후 다이얼로그 닫기 및 초기화
      setIsCreateDialogOpen(false);
      form.reset();

      // 데이터 갱신을 위해 쿼리 무효화
      await queryClient.invalidateQueries({
        queryKey: ["/api/users/workspaces", userId],
      });

      // 생성 후 바로 이동
      // handleWorkspaceSelect(newWorkspace.id);
    } catch (error) {
      console.error("Create workspace error:", error);

      let serverMessage = "워크스페이스 생성 중 오류가 발생했습니다.";

      // 🚨 Axios 에러인지 확인하여 안전하게 데이터 추출
      if (axios.isAxiosError(error)) {
        serverMessage = error.response?.data?.message || serverMessage;
      }

      toast({
        title: "워크스페이스 생성 실패",
        description: serverMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSettingsSubmit = async (data: WorkspaceSettingsForm) => {
    if (!selectedWorkspaceId || !userId) return; // userId도 필요합니다.

    setIsSettingsLoading(true);
    try {
      await api.put(`/api/workspaces/${selectedWorkspaceId}`, data);

      await queryClient.invalidateQueries({
        queryKey: ["/api/users/workspaces", userId],
      });

      // 3. UI 및 로컬 업데이트
      localStorage.setItem("workspaceName", data.name);
      setWorkspaceName(data.name);
      window.dispatchEvent(new Event("workspaceNameUpdated"));

      setIsSettingsDialogOpen(false);
      toast({ title: "워크스페이스 정보가 업데이트되었습니다." });
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const handleWorkspaceSelect = (workspaceId: any) => {
    if (!workspaceId) return;

    // 1. 현재 목록(userWorkspaces)에서 선택된 워크스페이스 객체 찾기
    const selectedWS = userWorkspaces?.find((ws) => ws.id === workspaceId);

    // 2. 현재 로그인된 유저 ID와 ownerId 비교
    // 🚨 중요: userId(useQuery 결과)를 신뢰하거나, currentUser.id를 사용
    if (selectedWS && userId) {
      const isAdmin = selectedWS.ownerId === userId;
      setIsAdminUser(isAdmin);

      // 이동 시 필요한 정보를 미리 세팅
      localStorage.setItem("workspaceId", selectedWS.id);
      localStorage.setItem("workspaceName", selectedWS.name);
      localStorage.setItem(
        "workspaceDescription",
        selectedWS.description || "",
      );
    }

    const targetPath = `/workspace/${workspaceId}/team`;
    setLocation(targetPath);
  };

  const handleLogout = () => {
    // 로그아웃 시 localStorage 클리어
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");

    // 랜딩 페이지로 이동
    setLocation("/");
  };

  // const handleInviteResponse = async (
  //   invitationId: string,
  //   action: "accept" | "decline"
  // ) => {
  //   const userEmail = localStorage.getItem("userEmail");
  //   if (!userEmail) return;

  //   try {
  //     // 초대 정보에서 role 가져오기
  //     const invitation = invitations.find((inv) => inv.id === invitationId);
  //     const invitationRole = invitation?.role || "팀원"; // 기본값은 팀원

  //     const response = await api.get("/api/users?workspace=true");

  //     const users = response.data; // Axios는 응답 데이터(JSON 파싱 완료)를 response.data에 담습니다.

  //     const currentUser = users.find(
  //       (u: any) => u.email?.toLowerCase() === userEmail.toLowerCase()
  //     );

  //     const currentEmail = userEmail;

  //     await api.put(`/api/invitations/${invitationId}`, {
  //       // Axios는 두 번째 인수로 body 데이터를 객체 형태로 받습니다.
  //       status: action === "accept" ? "accepted" : "declined",
  //     });

  //     // 받은 초대 목록 업데이트
  //     const receivedInvitations = JSON.parse(
  //       localStorage.getItem(`receivedInvitations_${currentEmail}`) || "[]"
  //     );
  //     const updatedInvitations = receivedInvitations.map((inv: any) =>
  //       inv.id === invitationId
  //         ? { ...inv, status: action === "accept" ? "accepted" : "declined" }
  //         : inv
  //     );
  //     localStorage.setItem(
  //       `receivedInvitations_${currentEmail}`,
  //       JSON.stringify(updatedInvitations)
  //     );

  //     // 로컬 상태 업데이트
  //     setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));

  //     // 표시된 초대 목록에서도 제거 (중복 표시 방지)
  //     const shownInvitationsKey = `shownInvitations_${currentEmail}`;
  //     const shownInvitations = JSON.parse(
  //       localStorage.getItem(shownInvitationsKey) || "[]"
  //     );
  //     const updatedShownInvitations = shownInvitations.filter(
  //       (id: string) => id !== invitationId
  //     );
  //     localStorage.setItem(
  //       shownInvitationsKey,
  //       JSON.stringify(updatedShownInvitations)
  //     );

  //     // 초대를 수락한 경우 수락 플래그 설정
  //     if (action === "accept") {
  //       localStorage.setItem(`hasAcceptedInvitation_${currentEmail}`, "true");
  //       setIsNewUser(false); // 더 이상 신규 사용자가 아님
  //     }

  //     toast({
  //       title: action === "accept" ? "초대 수락" : "초대 거절",
  //       description:
  //         action === "accept"
  //           ? "워크스페이스에 참여했습니다."
  //           : "초대를 거절했습니다.",
  //     });

  //     // 초대를 수락한 경우 워크스페이스 멤버로 추가 및 신규 사용자 플래그 클리어
  //     if (action === "accept") {
  //       try {
  //         // 현재 사용자 ID 가져오기
  //         let inviteeUserId: string | null = null;

  //         if (currentUser) {
  //           inviteeUserId = currentUser.id;

  //           // 기존 사용자의 role 업데이트
  //           try {
  //             await api.patch(`/api/users/${currentUser.id}/role`, {
  //               role: invitationRole,
  //             });
  //           } catch (error) {
  //             console.error("기존 사용자 role 업데이트 실패:", error);
  //           }
  //         } else {
  //           // 신규 사용자의 경우 이메일로 사용자 조회 시도
  //           try {
  //             const userResponse = await api.get(
  //               `/api/users/by-email/${encodeURIComponent(userEmail)}`
  //             );

  //             // Axios는 성공 시 (2xx) 여기까지 오며, 데이터는 .data에 있습니다.
  //             const userData = userResponse.data;
  //             inviteeUserId = userData.id;

  //             // 기존 사용자의 role 업데이트 (hardcoded mapping에 없는 사용자)
  //             try {
  //               await api.patch(`/api/users/${userData.id}/role`, {
  //                 role: invitationRole,
  //               });
  //             } catch (error) {
  //               console.error("기존 사용자 role 업데이트 실패:", error);
  //             }
  //           } catch (error: any) {
  //             // Axios는 404 에러 시 catch 블록으로 진입합니다.
  //           }
  //         }

  //         // 워크스페이스 멤버로 초대 수락 완료
  //         if (inviteeUserId) {
  //           console.log("워크스페이스 멤버로 초대 수락 완료");
  //         }

  //         // 실시간 반영을 위해 관련 캐시 무조건 무효화 (데이터베이스 기준)
  //         queryClient.invalidateQueries({ queryKey: ["/api/users"] });
  //         queryClient.invalidateQueries({
  //           queryKey: ["/api/users", { workspace: true }],
  //         });
  //         queryClient.invalidateQueries({
  //           queryKey: ["/api/users/with-stats"],
  //         });
  //         queryClient.invalidateQueries({
  //           queryKey: ["/api/users/with-stats", { workspace: true }],
  //         });

  //         // 쿼리를 즉시 다시 가져오기 (refetch)
  //         await queryClient.refetchQueries({
  //           queryKey: ["/api/users", { workspace: true }],
  //         });
  //         await queryClient.refetchQueries({
  //           queryKey: ["/api/users/with-stats", { workspace: true }],
  //         });
  //         toast({
  //           title: "워크스페이스 참여 완료",
  //           description: `${workspaceName} 워크스페이스에 참여했습니다.`,
  //         });
  //       } catch (error) {
  //         console.error("최상위 워크스페이스 멤버 추가 중 오류:", error);
  //       }

  //       // 초대 수락 기록 저장 (새로고침 후에도 유지)
  //       localStorage.setItem(`hasAcceptedInvitation_${userEmail}`, "true");
  //       setIsNewUser(false);
  //     }

  //     // 모든 초대를 처리했다면 다이얼로그 닫기
  //     if (invitations.length <= 1) {
  //       setIsInviteDialogOpen(false);
  //     }
  //   } catch (error) {
  //     console.error("초대 응답 처리 중 오류:", error);
  //   }
  // };
  const handleInviteResponse = async (
    invitationId: string,
    action: "accept" | "decline",
  ) => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) return;

    try {
      // 1. 초대 정보 확인
      const invitation = invitations.find((inv) => inv.id === invitationId);
      const invitationRole = invitation?.role || "팀원";

      const response = await api.get("/api/users?workspace=true");
      const users = response.data;

      const currentUser = users.find(
        (u: any) => u.email?.toLowerCase() === userEmail.toLowerCase(),
      );

      const currentEmail = userEmail;

      // 2. 초대 상태 변경 API 호출
      await api.put(`/api/invitations/${invitationId}`, {
        status: action === "accept" ? "accepted" : "declined",
      });

      // 3. 로컬 스토리지 업데이트 (기존 로직 유지)
      const receivedInvitations = JSON.parse(
        localStorage.getItem(`receivedInvitations_${currentEmail}`) || "[]",
      );
      const updatedInvitations = receivedInvitations.map((inv: any) =>
        inv.id === invitationId
          ? { ...inv, status: action === "accept" ? "accepted" : "declined" }
          : inv,
      );
      localStorage.setItem(
        `receivedInvitations_${currentEmail}`,
        JSON.stringify(updatedInvitations),
      );

      // 4. 로컬 UI 상태 업데이트
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));

      const shownInvitationsKey = `shownInvitations_${currentEmail}`;
      const shownInvitations = JSON.parse(
        localStorage.getItem(shownInvitationsKey) || "[]",
      );
      const updatedShownInvitations = shownInvitations.filter(
        (id: string) => id !== invitationId,
      );
      localStorage.setItem(
        shownInvitationsKey,
        JSON.stringify(updatedShownInvitations),
      );

      // 5. 수락 시 처리 로직
      if (action === "accept") {
        try {
          let inviteeUserId: string | null = null;

          const invitation = invitations.find((inv) => inv.id === invitationId);
          const targetWorkspaceId = invitation?.workspaceId;

          if (targetWorkspaceId) {
            await queryClient.invalidateQueries({
              queryKey: ["workspace-members", targetWorkspaceId],
            });
          }

          if (currentUser) {
            inviteeUserId = currentUser.id;
            await api.patch(`/api/users/${currentUser.id}/role`, {
              role: invitationRole,
            });
          } else {
            try {
              const userResponse = await api.get(
                `/api/users/by-email/${encodeURIComponent(userEmail)}`,
              );
              const userData = userResponse.data;
              inviteeUserId = userData.id;
              await api.patch(`/api/users/${userData.id}/role`, {
                role: invitationRole,
              });
            } catch (error) {}
          }

          // 🚩 [핵심 수정 부분] 실시간 반영을 위한 쿼리 무효화 섹션

          // ① 워크스페이스 목록 무효화 (목록 자체를 새로 고침)
          if (inviteeUserId) {
            await queryClient.invalidateQueries({
              queryKey: ["/api/users/workspaces", inviteeUserId],
            });
          }

          // ② ⭐ 워크스페이스 통계 전체 무효화 (ID를 모를 때 사용하는 광범위 무효화)
          // exact: false를 설정하여 "workspace-stats"로 시작하는 모든 쿼리를 다시 가져오게 합니다.
          await queryClient.invalidateQueries({
            queryKey: ["workspace-stats"],
            exact: false,
          });

          // ③ 기타 유저 관련 쿼리 무효화
          queryClient.invalidateQueries({
            queryKey: ["/api/users"],
            exact: false,
          });

          // ④ 활성화된 쿼리 즉시 리프레치 (사용자 경험 개선)
          if (inviteeUserId) {
            await queryClient.refetchQueries({
              queryKey: ["/api/users/workspaces", inviteeUserId],
              type: "active",
            });
          }

          toast({
            title: "워크스페이스 참여 완료",
            description: `${workspaceName} 워크스페이스에 참여했습니다.`,
          });
        } catch (error) {
          console.error("초대 수락 처리 중 오류:", error);
        }

        localStorage.setItem(`hasAcceptedInvitation_${userEmail}`, "true");
        setIsNewUser(false);
      } else {
        toast({
          title: "초대 거절",
          description: "초대를 거절했습니다.",
        });
      }

      // 6. 모든 초대를 처리했다면 다이얼로그 닫기
      if (invitations.length <= 1) {
        setIsInviteDialogOpen(false);
      }
    } catch (error) {
      console.error("초대 응답 처리 중 오류:", error);
    }
  };

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (id: number | string) =>
      api.delete(`/api/workspaces/${id}`, {
        headers: {
          "X-User-Email": localStorage.getItem("userEmail"), // 이메일 전달
        },
      }),
    onSuccess: () => {
      // 1. 성공 시 워크스페이스 목록 캐시 무효화 (UI 자동 갱신)
      queryClient.invalidateQueries({ queryKey: ["/api/users/workspaces"] });

      // 2. 다이얼로그 닫기
      setIsSettingsDialogOpen(false);

      // 3. 성공 토스트 알림
      toast({
        title: "삭제 완료",
        description: "워크스페이스가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error) => {
      // 에러 메시지 추출 (Axios 에러 처리)
      let errorMessage = "워크스페이스 삭제 중 오류가 발생했습니다.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      }

      // 4. 실패 토스트 알림
      toast({
        title: "삭제 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleDeleteWorkspace = () => {
    if (!selectedWorkspaceId) {
      toast({
        title: "삭제 불가",
        description: "삭제할 워크스페이스 선택 정보가 올바르지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    const isConfirmed = confirm(
      "정말로 이 워크스페이스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.",
    );

    if (isConfirmed) {
      deleteWorkspaceMutation.mutate(selectedWorkspaceId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">워크스페이스 관리</h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* 세션 만료 시간 */}
              <SessionTimer /> 
              {/* 초대 보관함 버튼 */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsInviteDialogOpen(true)} // 클릭 시 기존 초대 다이얼로그 열기
                  className="relative text-muted-foreground"
                  data-testid="button-inbox"
                >
                  <Bell className="h-5 w-5" />
                  {/* 처리하지 않은 초대가 있을 때만 빨간 배지 표시 */}
                  {invitations.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </Button>
              </div>
              <div className="flex items-center space-x-2 border-l pl-4">
                {" "}
                {/* 구분을 위한 선 추가 */}
                <span className="text-sm text-muted-foreground font-medium">
                  {userName}님
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="text-muted-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">워크스페이스 선택</h2>
          <p className="text-muted-foreground">
            작업할 워크스페이스를 선택하거나 새로운 워크스페이스를 생성하세요.
          </p>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isFullyLoading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-48 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {isUserInfoLoaded &&
                userWorkspaces?.map((workspace) => (
                  <Card
                    key={workspace.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleWorkspaceSelect(workspace.id)}
                    data-testid={`card-workspace-${workspace.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {workspace.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {workspace.description}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkspaceId(workspace.id);
                            settingsForm.reset({
                              name: workspace.name,
                              description: workspace.description,
                            });
                            setIsSettingsDialogOpen(true);
                          }}
                          data-testid="button-workspace-settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>
                            {statsMap[workspace.id]
                              ? `${statsMap[workspace.id].memberCount}`
                              : 0}
                            명
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {statsMap[workspace.id]
                              ? `${statsMap[workspace.id].projectCount}`
                              : 0}
                            개 프로젝트
                          </span>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {workspace.createdAt.split("T")[0]}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {/* Create New Workspace Card */}
              <div>
                {isUserInfoLoaded && userWorkspaces && isLimitReached ? (
                  <Card className="flex items-center gap-3 h-full min-h-[200px] w-full flex-col justify-center bored rounded-lg">
                    <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] space-y-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                        <h3 className="text-3xl">ℹ️</h3>
                      </div>
                      <div className="text-center">
                        <h3 className="font-medium">
                          워크스페이스 생성 한도 도달
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          생성 한도 초과 (최대 3개)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  isUserInfoLoaded &&
                  userWorkspaces && (
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border-dashed flex items-center gap-3 h-full min-h-[200px] w-full flex-col justify-center bored rounded-lg"
                      data-testid="card-create-workspace"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] space-y-4">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium">새 워크스페이스</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            새로운 워크스페이스를 생성하세요
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* 워크스페이스 설정 다이얼로그 */}
      <Dialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      >
        <DialogContent data-testid="dialog-workspace-settings">
          <DialogHeader>
            <DialogTitle>워크스페이스 설정</DialogTitle>
            <DialogDescription>
              워크스페이스 정보를 수정하세요.
            </DialogDescription>
          </DialogHeader>
          <Form {...settingsForm}>
            <form
              onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}
              className="space-y-4"
            >
              <FormField
                control={settingsForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>워크스페이스 이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: TaskFlow"
                        {...field}
                        data-testid="input-settings-workspace-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택사항)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="워크스페이스에 대한 간단한 설명"
                        {...field}
                        data-testid="input-settings-workspace-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSettingsDialogOpen(false)}
                  data-testid="button-cancel-settings"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSettingsLoading}
                  data-testid="button-save-settings"
                >
                  {isSettingsLoading ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </Form>
          {isOwner && (
            <div className="pt-6 mt-4 border-t border-destructive/20 bg-destructive/5 -mx-6 px-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-red-500">
                    워크스페이스 삭제
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로
                    삭제됩니다.
                  </p>
                </div>
                <Button
                  className="bg-red-500 hover:bg-red-600" // 호버 시 시각적 효과 추가
                  disabled={deleteWorkspaceMutation.isPending}
                  onClick={handleDeleteWorkspace}
                  data-testid="button-delete-workspace"
                >
                  {deleteWorkspaceMutation.isPending ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 초대 알림 다이얼로그 */}
      {/* <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              워크스페이스 초대
            </DialogTitle>
            <DialogDescription>
              새로운 워크스페이스 초대가 도착했습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">
                      {invitation.inviterName ||
                        invitation.inviterEmail?.split("@")[0] ||
                        "관리자"}
                      님이 보낸 초대
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.inviterEmail && (
                        <span className="block text-blue-600 mb-1">
                          발신자: {invitation.inviterEmail}
                        </span>
                      )}
                      {invitation.role} 권한으로 워크스페이스에 초대했습니다.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleInviteResponse(invitation.id, "accept")
                      }
                      className="flex-1"
                      data-testid={`button-accept-invite-${invitation.id}`}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      수락
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleInviteResponse(invitation.id, "decline")
                      }
                      className="flex-1"
                      data-testid={`button-decline-invite-${invitation.id}`}
                    >
                      <X className="h-4 w-4 mr-2" />
                      거절
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {invitations.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">처리할 초대가 없습니다.</p>
            </div>
          )}
        </DialogContent>
      </Dialog> */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Mail className="h-5 w-5 text-primary" />
              초대 보관함
              {invitations.length > 0 && (
                <Badge variant="secondary" className="ml-2 font-bold">
                  {invitations.length}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              워크스페이스에 참여하여 협업을 시작하세요.
            </DialogDescription>
          </DialogHeader>

          {/* 초대 리스트 영역: 최대 높이를 지정하고 초과 시 스크롤 */}
          <div className="max-h-[400px] overflow-y-auto p-6 pt-2 space-y-4">
            {invitations.length > 0 ? (
              invitations.map((invitation) => (
                <Card
                  key={invitation.id}
                  className="p-4 border-2 hover:border-primary/20 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        {/* 워크스페이스 이름 강조 */}
                        <p className="font-bold text-base text-primary">
                          {invitation.workspaceName || "초대받은 워크스페이스"}
                        </p>

                        {/* 발신자 정보: 이름(이메일) 형태 */}
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">
                            {invitation.inviterName || "알 수 없는 사용자"}
                          </span>
                          <span className="ml-1">
                            ({invitation.inviterEmail})
                          </span>
                        </p>
                      </div>

                      <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 text-[10px]">
                        {invitation.role}
                      </Badge>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 bg-primary"
                        onClick={() =>
                          handleInviteResponse(invitation.id, "accept")
                        }
                      >
                        <Check className="h-4 w-4 mr-1" /> 수락
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-muted-foreground/20"
                        onClick={() =>
                          handleInviteResponse(invitation.id, "decline")
                        }
                      >
                        <X className="h-4 w-4 mr-1" /> 거절
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              /* 모든 초대를 처리했을 때의 화면 */
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <MailOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  새로운 초대가 없습니다.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 워크스페이스 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 워크스페이스 생성</DialogTitle>
            <DialogDescription>
              새로운 워크스페이스를 만들어 팀과 함께 작업을 시작하세요.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>워크스페이스 이름 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: My Workspace"
                        {...field}
                        className={
                          fieldState.error
                            ? "border-red-500 focus-visible:ring-0 outline-none"
                            : ""
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택사항)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="워크스페이스에 대한 간단한 설명"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isLoading || isLimitReached}>
                  {isLimitReached
                    ? "생성 한도 초과 (최대 3개)"
                    : "워크스페이스 생성"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
