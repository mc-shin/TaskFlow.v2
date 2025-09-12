import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FolderOpen, Calendar, Settings, Activity, AlertTriangle } from "lucide-react";

export default function Admin() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users/with-stats"],
  });

  // 관리자 대시보드 통계 카드들
  const dashboardStats = [
    {
      title: "총 프로젝트",
      value: projects?.length || 0,
      icon: FolderOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      title: "총 팀 멤버",
      value: users?.length || 0,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    {
      title: "전체 작업",
      value: stats?.total || 0,
      icon: Activity,
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    {
      title: "완료된 작업",
      value: stats?.completed || 0,
      icon: Calendar,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            관리자
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            시스템 전체를 관리합니다
          </p>
        </div>
        <Button variant="outline" data-testid="button-settings">
          <Settings className="w-4 h-4 mr-2" />
          설정
        </Button>
      </header>
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold" data-testid={`stat-${index}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 시스템 상태 및 알림 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>시스템 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">데이터베이스</span>
                  <Badge variant="default">정상</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API 서버</span>
                  <Badge variant="default">정상</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">백업 상태</span>
                  <Badge variant="secondary">완료</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">마지막 업데이트</span>
                  <span className="text-sm text-muted-foreground">2024-01-12 09:30</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                시스템 알림
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium">정기 점검 예정</p>
                  <p className="text-xs text-muted-foreground">2024-01-15 새벽 2:00~4:00</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium">새 기능 배포</p>
                  <p className="text-xs text-muted-foreground">칸반 보드 개선사항이 적용되었습니다</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium">백업 완료</p>
                  <p className="text-xs text-muted-foreground">모든 데이터가 안전하게 백업되었습니다</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 빠른 작업 */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex-col" data-testid="button-user-management">
                <Users className="w-6 h-6 mb-2" />
                사용자 관리
              </Button>
              <Button variant="outline" className="h-20 flex-col" data-testid="button-project-management">
                <FolderOpen className="w-6 h-6 mb-2" />
                프로젝트 관리
              </Button>
              <Button variant="outline" className="h-20 flex-col" data-testid="button-system-logs">
                <Activity className="w-6 h-6 mb-2" />
                시스템 로그
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}