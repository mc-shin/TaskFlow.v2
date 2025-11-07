import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Team from "@/pages/team";
import MyTasks from "@/pages/my-tasks";
import ListTree from "@/pages/list-tree";
import ListHorizontal from "@/pages/list-horizontal";
import Kanban from "@/pages/kanban";
import Priority from "@/pages/priority";
import Archive from "@/pages/archive";
import Meeting from "@/pages/meeting";
import NewMeeting from "@/pages/new-meeting";
import MeetingDetail from "@/pages/meeting-detail";
import ProjectDetail from "@/pages/project-detail";
import GoalDetail from "@/pages/goal-detail";
import TaskDetail from "@/pages/task-detail";
import NotFound from "@/pages/not-found";
import api from "@/api/api-index";

export function WorkspaceAppShell() {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        // setLocation("/workspace");
        setLocation("/workspace");
        return;
      }

      try {
        // 현재 로그인된 사용자의 실제 정보 가져오기 (워크스페이스 멤버만)
        // const response = await fetch("/api/users?workspace=true");

        // 🚩 [2] fetch 코드를 Axios로 교체
        // -----------------------------------------------------------------
        const response = await api.get("/api/users", {
          // 쿼리 파라미터를 params 객체로 분리하여 전달합니다.
          // Axios가 자동으로 URL에 ?workspace=true를 붙여줍니다.
          params: {
            workspace: true,
          },
        });
        // -----------------------------------------------------------------

        let users: any[] = [];
        // if (response.ok) {
        //   users = await response.json();
        // }

        // 이메일 매핑 체크
        // let currentUser = users.find(
        //   (u: any) => u.email?.toLowerCase() === userEmail.toLowerCase()
        // );

        // if (!currentUser) {
        //   // fallback 매핑 시도 (기존 데이터 호환성)
        //   const emailToUsername: { [key: string]: string } = {
        //     "hyejin@example.com": "hyejin",
        //     "hyejung@example.com": "hyejung",
        //     "chamin@example.com": "chamin",
        //   };

        //   const mappedUsername = emailToUsername[userEmail];
        //   if (mappedUsername) {
        //     currentUser = users.find((u: any) => u.username === mappedUsername);
        //   }
        // }

        // 관리자 사용자는 항상 접근 허용
        const isAdminUser =
          userEmail.includes("admin") || userEmail === "admin@qubicom.co.kr";
        // if (isAdminUser && currentUser) {
        //   setIsAuthorized(true);
        //   return;
        // }  // 나중에 다시 살려야함

        // ⭐⭐⭐ [권한 우회 로직]: 관리자 테스트 사용자는 무조건 접근 허용 ⭐⭐⭐
        if (isAdminUser) {
          // WorkspacePage와의 일관성을 위해 초대 수락 플래그 강제 설정
          localStorage.setItem(`hasAcceptedInvitation_${userEmail}`, "true");
          setIsAuthorized(true);
          return;
        }
        // ⭐⭐⭐ [권한 우회 로직]: 관리자 테스트 사용자는 무조건 접근 허용 끝 ⭐⭐⭐

        // 초대를 수락한 기록 확인 (localStorage)
        const hasAcceptedInvitation =
          localStorage.getItem(`hasAcceptedInvitation_${userEmail}`) === "true";

        // 서버에서 실제 초대 수락 상태 확인
        let hasServerAcceptedInvitation = false;
        try {
          // const serverInvitationsResponse = await fetch(
          //   `/api/invitations/email/${encodeURIComponent(userEmail)}`
          // );
          // if (serverInvitationsResponse.ok) {
          //   const serverInvitations = await serverInvitationsResponse.json();
          //   hasServerAcceptedInvitation = serverInvitations.some(
          //     (inv: any) => inv.status === "accepted"
          //   );
          // }

          // 🚩 [2] fetch 코드를 Axios로 교체
          // ----------------------------------------------------
          // Axios는 URL 인코딩을 자동으로 처리하므로, 직접 encodeURIComponent를 사용할 필요가 없습니다.
          // URL 인코딩이 필요한 경우, 쿼리 파라미터(params)를 사용하면 Axios가 자동으로 처리합니다.
          // 이 경우처럼 경로에 이메일이 포함될 때는 안전을 위해 직접 인코딩된 문자열을 사용하는 것이 좋습니다.
          const serverInvitationsResponse = await api.get(
            `/api/invitations/email/${encodeURIComponent(userEmail)}`
          );

          // [3] Axios는 2xx 응답(성공) 시에만 다음 라인으로 진행하고,
          // 응답 데이터는 response.data에 JSON 파싱된 상태로 들어 있습니다.
          const serverInvitations = serverInvitationsResponse.data;

          hasServerAcceptedInvitation = serverInvitations.some(
            (inv: any) => inv.status === "accepted"
          );
          // ----------------------------------------------------
        } catch (error) {
          console.error("서버 초대 상태 확인 오류:", error);
        }

        // 워크스페이스 멤버이거나 초대를 수락한 사용자만 접근 허용
        if (
          // !currentUser &&
          !hasAcceptedInvitation &&
          !hasServerAcceptedInvitation
        ) {
          // 워크스페이스 멤버가 아니고 초대를 수락한 적도 없으면 접근 차단
          setLocation("/workspace");
          return;
        }

        // 백엔드에 등록되지 않았지만 초대를 수락한 경우는 접근 허용 (신규 가입자)
        if (
          // !currentUser &&
          hasAcceptedInvitation ||
          hasServerAcceptedInvitation
        ) {
          setIsAuthorized(true);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("워크스페이스 접근 권한 확인 중 오류:", error);
        setLocation("/workspace");
      }
    };

    checkAccess();
  }, [setLocation]);

  // 권한 확인 중이면 바로 권한 없는 상태로 처리 (로딩 화면 제거)
  if (isAuthorized === null) {
    return null;
  }

  // 권한이 없으면 빈 컴포넌트 (이미 리다이렉트됨)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/workspace/app" component={Team} />
          <Route path="/workspace/app/admin" component={Admin} />
          <Route path="/workspace/app/team" component={Team} />
          <Route path="/workspace/app/my-tasks" component={MyTasks} />
          <Route path="/workspace/app/list" component={ListTree} />
          <Route path="/workspace/app/list-tree" component={ListTree} />
          <Route
            path="/workspace/app/list-horizontal"
            component={ListHorizontal}
          />
          <Route path="/workspace/app/kanban" component={Kanban} />
          <Route path="/workspace/app/priority" component={Priority} />
          <Route path="/workspace/app/archive" component={Archive} />
          <Route path="/workspace/app/meeting" component={Meeting} />
          <Route path="/workspace/app/meeting/new" component={NewMeeting} />
          <Route path="/workspace/app/meeting/:id" component={MeetingDetail} />
          <Route
            path="/workspace/app/detail/project/:id"
            component={ProjectDetail}
          />
          <Route path="/workspace/app/detail/goal/:id" component={GoalDetail} />
          <Route path="/workspace/app/detail/task/:id" component={TaskDetail} />
          <Route path="/workspace/app/*" component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}
