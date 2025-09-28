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

export function WorkspaceAppShell() {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setLocation("/workspace");
        return;
      }

      try {
        // 현재 로그인된 사용자의 실제 정보 가져오기 (워크스페이스 멤버만)
        const response = await fetch('/api/users?workspace=true');
        let users: any[] = [];
        if (response.ok) {
          users = await response.json();
        }

        // 이메일 매핑 체크
        let currentUser = users.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase());
        
        if (!currentUser) {
          // fallback 매핑 시도 (기존 데이터 호환성)
          const emailToUsername: { [key: string]: string } = {
            'hyejin@example.com': 'hyejin',
            'hyejung@example.com': 'hyejung',
            'chamin@example.com': 'chamin'
          };
          
          const mappedUsername = emailToUsername[userEmail];
          if (mappedUsername) {
            currentUser = users.find((u: any) => u.username === mappedUsername);
          }
        }

        // 신규가입자이지만 이전에 초대를 수락한 경우는 접근 허용
        const hasAcceptedInvitation = localStorage.getItem(`hasAcceptedInvitation_${userEmail}`) === 'true';

        if (!currentUser && !hasAcceptedInvitation) {
          // 워크스페이스 멤버가 아니고 초대를 수락한 적도 없으면 접근 차단
          setLocation("/workspace");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('워크스페이스 접근 권한 확인 중 오류:', error);
        setLocation("/workspace");
      }
    };

    checkAccess();
  }, [setLocation]);

  // 권한 확인 중이면 로딩 상태
  if (isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">워크스페이스 접근 권한을 확인 중...</p>
        </div>
      </div>
    );
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
          <Route path="/workspace/app/list-horizontal" component={ListHorizontal} />
          <Route path="/workspace/app/kanban" component={Kanban} />
          <Route path="/workspace/app/priority" component={Priority} />
          <Route path="/workspace/app/archive" component={Archive} />
          <Route path="/workspace/app/meeting" component={Meeting} />
          <Route path="/workspace/app/meeting/new" component={NewMeeting} />
          <Route path="/workspace/app/meeting/:id" component={MeetingDetail} />
          <Route path="/workspace/app/detail/project/:id" component={ProjectDetail} />
          <Route path="/workspace/app/detail/goal/:id" component={GoalDetail} />
          <Route path="/workspace/app/detail/task/:id" component={TaskDetail} />
          <Route path="/workspace/app/*" component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}