import { Switch, Route, useLocation, useParams } from "wouter";
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
import MyPage from "@/pages/mypage";
import Diagnostic from "@/pages/diagnostic";
import Reporting from "@/pages/reporting";

export function WorkspaceAppShell() {
  const [, setLocation] = useLocation();
  const { id } = useParams(); // ✅ [추가] URL의 :id 값을 가져옵니다.
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const basePath = `/workspace/${id}`;

  useEffect(() => {
    const checkAccess = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setLocation("/workspace");
        return;
      }

      try {
        // 1. 현재 유저의 ID를 가져옵니다.
        const userRes = await api.get(
          `/api/users/by-email/${encodeURIComponent(userEmail)}`
        );
        const currentUserId = userRes.data.id;

        // 2. 현재 워크스페이스의 정보를 가져옵니다. (ownerId 확인용)
        const wsRes = await api.get(`/api/workspaces/${id}`);
        const workspace = wsRes.data;

        // 3. 초대 수락 여부 확인 (기존 로직)
        const serverInvsRes = await api.get(
          `/api/invitations/email/${encodeURIComponent(userEmail)}`
        );
        const hasServerAccepted = serverInvsRes.data.some(
          (inv: any) => inv.status === "accepted"
        );

        if (workspace.ownerId === currentUserId || hasServerAccepted) {
          setIsAuthorized(true);
        } else {
          console.warn("권한 없음: 튕겨냅니다.");
          setLocation("/workspace");
        }
      } catch (error) {
        console.error("접근 권한 확인 중 오류:", error);
        setLocation("/workspace");
      }
    };

    if (id) checkAccess();
  }, [id, setLocation]);

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
      <Sidebar workspaceId={id} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path={`${basePath}`} component={Team} />
          <Route path={`${basePath}/admin`} component={Admin} />
          <Route path={`${basePath}/diagnostic`} component={Diagnostic} />
          <Route path={`${basePath}/team`} component={Team} />
          <Route path={`${basePath}/my-tasks`} component={MyTasks} />
          <Route path={`${basePath}/list`} component={ListTree} />
          {/* <Route path={`${basePath}/list-tree`} component={ListTree} /> */}
          <Route
            path={`${basePath}/list-horizontal`}
            component={ListHorizontal}
          />
          <Route path={`${basePath}/kanban`} component={Kanban} />
          <Route path={`${basePath}/priority`} component={Priority} />
          <Route path={`${basePath}/archive`} component={Archive} />
          <Route path={`${basePath}/meeting`} component={Meeting} />
          <Route path={`${basePath}/reporting`} component={Reporting} />
          <Route path={`${basePath}/meeting/new`} component={NewMeeting} />
          <Route
            path={`${basePath}/meeting/:meetingId`}
            component={MeetingDetail}
          />
          <Route
            path={`${basePath}/detail/project/:projectId`}
            component={ProjectDetail}
          />
          <Route
            path={`${basePath}/detail/goal/:goalId`}
            component={GoalDetail}
          />
          <Route
            path={`${basePath}/detail/task/:taskId`}
            component={TaskDetail}
          />
          <Route path={`${basePath}/mypage`} component={MyPage} />
          <Route path={`${basePath}/*`} component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}
