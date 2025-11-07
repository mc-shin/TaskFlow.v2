import { Home, Users, Settings, List, Calendar, GitBranch, Star, Archive, MessageSquare, CheckSquare, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { SafeUser } from "@shared/schema";

export function Sidebar() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard', 'work-management', 'meeting']);
  const [location, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [workspaceName, setWorkspaceName] = useState("Nes");

  // Get current user information
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 0,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    
    if (userId && users) {
      const user = (users as SafeUser[]).find(u => u.id === userId);
      setCurrentUser(user || null);
    }
    
    // localStorage에서 워크스페이스 이름 로드
    const storedWorkspaceName = localStorage.getItem("workspaceName");
    if (storedWorkspaceName) {
      setWorkspaceName(storedWorkspaceName);
    }
    
    // localStorage 변경 이벤트 리스너 추가 (실시간 업데이트)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'workspaceName' && e.newValue) {
        setWorkspaceName(e.newValue);
      }
    };
    
    // 수동 이벤트 리스너 (같은 탭에서의 변경 감지)
    const handleWorkspaceNameChange = () => {
      const newWorkspaceName = localStorage.getItem("workspaceName");
      if (newWorkspaceName && newWorkspaceName !== workspaceName) {
        setWorkspaceName(newWorkspaceName);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('workspaceNameUpdated', handleWorkspaceNameChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('workspaceNameUpdated', handleWorkspaceNameChange);
    };
  }, [users, workspaceName]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isExpanded = (section: string) => expandedSections.includes(section);

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
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
          <span className="font-semibold text-lg" data-testid="text-logo">{workspaceName}</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" data-testid="nav-menu">
        {/* 대시보드 섹션 */}
        <div>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-2 h-auto text-left"
            onClick={() => toggleSection('dashboard')}
            data-testid="button-dashboard-section"
          >
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span className="font-medium">대시보드</span>
            </div>
            {isExpanded('dashboard') ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </Button>
          
          {isExpanded('dashboard') && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href="/workspace/app/team">
                <Button 
                  variant={location === "/workspace/app/team" ? "default" : "ghost"} 
                  className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground h-8"
                  data-testid="link-team"
                >
                  <Users className="h-4 w-4" />
                  <span>팀</span>
                </Button>
              </Link>
              {currentUser?.role === "관리자" && (
                <Link href="/workspace/app/admin">
                  <Button 
                    variant={location === "/workspace/app/admin" ? "default" : "ghost"} 
                    className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground h-8"
                    data-testid="link-admin"
                  >
                    <Settings className="h-4 w-4" />
                    <span>관리자</span>
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
            onClick={() => toggleSection('work-management')}
            data-testid="button-work-management-section"
          >
            <div className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span className="font-medium">작업관리</span>
            </div>
            {isExpanded('work-management') ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </Button>
          
          {isExpanded('work-management') && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href="/workspace/app/list">
                <Button 
                  variant={location === "/workspace/app/list" ? "default" : "ghost"} 
                  className="w-full justify-start space-x-3 h-8"
                  data-testid="link-list"
                >
                  <List className="h-4 w-4" />
                  <span>리스트</span>
                </Button>
              </Link>
              <Link href="/workspace/app/kanban">
                <Button 
                  variant={location === "/workspace/app/kanban" ? "default" : "ghost"} 
                  className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground h-8"
                  data-testid="link-kanban"
                >
                  <GitBranch className="h-4 w-4" />
                  <span>칸반</span>
                </Button>
              </Link>
              <Link href="/workspace/app/priority">
                <Button 
                  variant={location === "/workspace/app/priority" ? "default" : "ghost"} 
                  className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground h-8"
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
            onClick={() => toggleSection('meeting')}
            data-testid="button-meeting-section"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">미팅</span>
            </div>
            {isExpanded('meeting') ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </Button>
          
          {isExpanded('meeting') && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href="/workspace/app/meeting">
                <Button 
                  variant={location === "/workspace/app/meeting" ? "default" : "ghost"} 
                  className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground h-8"
                  data-testid="link-meeting"
                >
                  <Calendar className="h-4 w-4" />
                  <span>미팅</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border" data-testid="user-profile">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm text-primary-foreground font-medium">
              {currentUser?.initials || localStorage.getItem("userInitials") || "사"}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium" data-testid="text-username">
              {currentUser?.name || localStorage.getItem("userName") || "사용자"}
            </div>
            <div className="text-xs text-muted-foreground" data-testid="text-user-role">
              {currentUser?.role || "팀원"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
