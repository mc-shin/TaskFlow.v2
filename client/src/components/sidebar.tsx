import { Home, Calendar, BarChart3, Settings, Users, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo/Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg" data-testid="text-logo">하이더</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2" data-testid="nav-menu">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          메뉴
        </div>
        
        <Button 
          variant="default" 
          className="w-full justify-start space-x-3"
          data-testid="link-home"
        >
          <Home className="h-4 w-4" />
          <span>홈</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground"
          data-testid="link-calendar"
        >
          <Calendar className="h-4 w-4" />
          <span>일정</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground"
          data-testid="link-list"
        >
          <BarChart3 className="h-4 w-4" />
          <span>리스트</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground"
          data-testid="link-settings"
        >
          <Settings className="h-4 w-4" />
          <span>설정</span>
        </Button>
        
        <div className="pt-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            팀
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start space-x-3 text-muted-foreground hover:text-accent-foreground"
            data-testid="link-team"
          >
            <Users className="h-4 w-4" />
            <span>팀 관리</span>
          </Button>
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border" data-testid="user-profile">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm text-primary-foreground font-medium">사</span>
          </div>
          <div>
            <div className="text-sm font-medium" data-testid="text-username">사용자</div>
            <div className="text-xs text-muted-foreground" data-testid="text-user-role">관리자</div>
          </div>
        </div>
      </div>
    </div>
  );
}
