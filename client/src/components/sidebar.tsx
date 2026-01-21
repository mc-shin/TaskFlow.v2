import {
  Home,
  Users,
  Settings,
  List,
  Calendar,
  GitBranch,
  Star,
  Archive,
  MessageSquare,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { SafeUser } from "@shared/schema";
import api from "@/api/api-index";
import { Card, CardContent } from "./ui/card";

interface SidebarProps {
  workspaceId?: string;
}

export function Sidebar({ workspaceId }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "dashboard",
    "work-management",
    "meeting",
    "reporting",
  ]);
  const [location, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");

  // ✅ [추가] 공통 경로를 상수로 선언하여 코드 가독성 향상
  const basePath = `/workspace/${workspaceId}`;

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

  const { data: userWorkspaces, isLoading: isLoadingWorkspaces } = useQuery({
    // 쿼리 키에 userId를 포함하여 userId가 변경될 때마다 갱신
    queryKey: ["/api/users/workspaces", userId],

    queryFn: () =>
      api.get(`/api/users/${userId}/workspaces`).then((res) => {
        return Array.isArray(res.data) ? res.data : [];
      }),
    enabled: !!userId,
  });

  useEffect(() => {
    if (userWorkspaces && workspaceId) {
      // 배열에서 현재 ID와 일치하는 객체 찾기
      const currentWorkspace = userWorkspaces.find(
        (ws: any) => String(ws.id) === String(workspaceId)
      );

      if (currentWorkspace) {
        setWorkspaceName(currentWorkspace.name);
        // 필요하다면 localStorage 동기화 (선택 사항)
        localStorage.setItem("workspaceName", currentWorkspace.name);
      } else {
        // 매칭되는 게 없을 때의 처리
        setWorkspaceName("워크스페이스");
      }
    }
  }, [userWorkspaces, workspaceId]); // 데이터나 URL 파라미터가 바뀔 때마다 실행

  // Get current user information
  const { data: users } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    staleTime: 0,
    // refetchInterval: 10000,
  });

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");

    if (userId && users) {
      const user = (users as SafeUser[]).find((u) => u.id === userId);
      setCurrentUser(user || null);
    }

    // localStorage에서 워크스페이스 이름 로드
    const storedWorkspaceName = localStorage.getItem("workspaceName");
    if (storedWorkspaceName) {
      setWorkspaceName(storedWorkspaceName);
    }

    // localStorage 변경 이벤트 리스너 추가 (실시간 업데이트)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "workspaceName" && e.newValue) {
        setWorkspaceName(e.newValue);
      }
    };

    const handleWorkspaceNameChange = () => {
      const newWorkspaceName = localStorage.getItem("workspaceName");
      if (newWorkspaceName) {
        setWorkspaceName(newWorkspaceName);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("workspaceNameUpdated", handleWorkspaceNameChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "workspaceNameUpdated",
        handleWorkspaceNameChange
      );
    };
  }, [users]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const isExpanded = (section: string) => expandedSections.includes(section);

  const isSelected = (path: string) => location === path;

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId && users) {
      const user = users.find((u: any) => String(u.id) === String(storedUserId));
      if (user) {
        setCurrentUser(user);
      }
    }
  }, [users]);

  return (
    <div
      className="w-64 bg-card border-r border-border flex flex-col"
      data-testid="sidebar"
    >
      {/* Logo/Header */}
      <div className="p-4 border-b border-border">
        <div
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          data-testid="link-home-logo"
          onClick={() => {
            // 로그인 상태 확인 후 적절한 페이지로 이동
            const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
            if (isLoggedIn) {
              setLocation("/workspace");
            } else {
              setLocation("/");
            }
          }}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg" data-testid="text-logo">
            {isLoadingWorkspaces ? (
              <CardContent className="h-1 bg-muted rounded animate-pulse"></CardContent>
            ) : (
              <div>{workspaceName}</div>
            )}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" data-testid="nav-menu">
        {/* 대시보드 섹션 */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between p-2 h-auto text-left"
            onClick={() => toggleSection("dashboard")}
            data-testid="button-dashboard-section"
          >
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span className="font-medium">대시보드</span>
            </div>
            {isExpanded("dashboard") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {isExpanded("dashboard") && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href={`${basePath}/team`}>
                <Button
                  variant={
                    location === `${basePath}/team` ? "default" : "ghost"
                  }
                  className={`w-full justify-start space-x-3 h-8 ${
                    location === `${basePath}/team`
                      ? "text-white hover:bg-primary"
                      : "text-muted-foreground hover:text-accent-foreground"
                  }`}
                  data-testid="link-team"
                >
                  <Users className="h-4 w-4" />
                  <span>팀</span>
                </Button>
              </Link>
              {currentUser?.role === "관리자" && (
                <Link href={`${basePath}/admin`}>
                  <Button
                    variant={
                      location === `${basePath}/admin` ? "default" : "ghost"
                    }
                    className={`w-full justify-start space-x-3 h-8 ${
                      location === `${basePath}/admin`
                        ? "bg-primary text-white hover:bg-primary"
                        : "text-muted-foreground hover:text-accent-foreground"
                    }`}
                    data-testid="link-admin"
                  >
                    <Settings className="h-4 w-4" />
                    <span>관리자</span>
                  </Button>
                </Link>
              )}
              {currentUser?.role === "관리자" && (
                <Link href={`${basePath}/diagnostic`}>
                  <Button
                    variant={
                      location === `${basePath}/diagnostic` ? "default" : "ghost"
                    }
                    className={`w-full justify-start space-x-3 h-8 ${
                      location === `${basePath}/diagnostic`
                        ? "bg-primary text-white hover:bg-primary"
                        : "text-muted-foreground hover:text-accent-foreground"
                    }`}
                    data-testid="link-diagnostic"
                  >
                    <FileText className="h-4 w-4" />
                    <span>AI 진단 리포트</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 작업관리 섹션 */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full justify-between p-2 h-auto text-left"
            onClick={() => toggleSection("work-management")}
            data-testid="button-work-management-section"
          >
            <div className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span className="font-medium">작업관리</span>
            </div>
            {isExpanded("work-management") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {isExpanded("work-management") && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href={`${basePath}/list`}>
                <Button
                  variant={
                    location === `${basePath}/list` ? "default" : "ghost"
                  }
                  className={`w-full justify-start space-x-3 h-8 ${
                    location === `${basePath}/list`
                      ? "bg-primary text-white hover:bg-primary"
                      : "text-muted-foreground hover:text-accent-foreground"
                  }`}
                  data-testid="link-list"
                >
                  <List className="h-4 w-4" />
                  <span>리스트</span>
                </Button>
              </Link>
              <Link href={`${basePath}/kanban`}>
                <Button
                  variant={
                    location === `${basePath}/kanban` ? "default" : "ghost"
                  }
                  className={`w-full justify-start space-x-3 h-8 ${
                    location === `${basePath}/kanban`
                      ? "bg-primary text-white hover:bg-primary"
                      : "text-muted-foreground hover:text-accent-foreground"
                  }`}
                  data-testid="link-kanban"
                >
                  <GitBranch className="h-4 w-4" />
                  <span>칸반</span>
                </Button>
              </Link>
              <Link href={`${basePath}/priority`}>
                <Button
                  variant={
                    location === `${basePath}/priority` ? "default" : "ghost"
                  }
                  className={`w-full justify-start space-x-3 h-8 ${
                    location === `${basePath}/priority`
                      ? "bg-primary text-white hover:bg-primary"
                      : "text-muted-foreground hover:text-accent-foreground"
                  }`}
                  data-testid="link-priority"
                >
                  <Star className="h-4 w-4" />
                  <span>우선순위</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* 미팅 섹션 */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full justify-between p-2 h-auto text-left"
            onClick={() => toggleSection("meeting")}
            data-testid="button-meeting-section"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">미팅</span>
            </div>
            {isExpanded("meeting") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {isExpanded("meeting") && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href={`${basePath}/meeting`}>
                <Button
                  variant={
                    location === `${basePath}/meeting` ? "default" : "ghost"
                  }
                  className={`w-full justify-start space-x-3 h-8 ${
                    location === `${basePath}/meeting`
                      ? "bg-primary text-white hover:bg-primary"
                      : "text-muted-foreground hover:text-accent-foreground"
                  }`}
                  data-testid="link-meeting"
                >
                  <Calendar className="h-4 w-4" />
                  <span>미팅</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* 보고 섹션 */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full justify-between p-2 h-auto text-left"
            onClick={() => toggleSection("reporting")}
            data-testid="button-reporting-section"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">보고</span>
            </div>
            {isExpanded("reporting") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {isExpanded("reporting") && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href={`${basePath}/reporting`}>
                <Button
                  variant={
                    location === `${basePath}/reporting` ? "default" : "ghost"
                  }
                  className={`w-full justify-start space-x-3 h-8 ${
                    location === `${basePath}/reporting`
                      ? "bg-primary text-white hover:bg-primary"
                      : "text-muted-foreground hover:text-accent-foreground"
                  }`}
                  data-testid="link-reporting"
                >
                  <Calendar className="h-4 w-4" />
                  <span>주간 보고</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* User Profile */}
      <Link href={`${basePath}/mypage`}>
        <div
          className="p-4 border-t border-border cursor-pointer hover:bg-sidebar-accent"
          data-testid="user-profile"
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm text-primary-foreground font-medium">
                {currentUser?.initials ||
                  localStorage.getItem("userInitials") ||
                  "사"}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium" data-testid="text-username">
                {currentUser?.name ||
                  localStorage.getItem("userName") ||
                  "사용자"}
              </div>
              <div
                className="text-xs text-muted-foreground"
                data-testid="text-user-role"
              >
                {currentUser?.role || "팀원"}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
