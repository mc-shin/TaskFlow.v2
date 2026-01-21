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
  ChevronLeft,
  ChevronRight,
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

export default function Diagnostic() {
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
      const response = await api.get(
        `/api/workspaces/${workspaceId}/users/with-stats`
      );
      return response.data;
    },
    enabled: !!workspaceId,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/api/workspaces/${workspaceId}/tasks`);
      return response.data;
    },
    enabled: !!workspaceId,
  });

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

  interface DiagnosisResult {
    id?: string;
    model: string;
    result: string;
    createdAt?: string;
    success?: boolean;
  }

  // Diagnostic 함수 내부 상단에 추가
  const [projectResult, setProjectResult] = useState<DiagnosisResult | null>(
    null
  );
  const [memberResult, setMemberResult] = useState<DiagnosisResult | null>(
    null
  );

  const {
    data: diagnosisHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["/api/workspaces", workspaceId, "diagnoses"],
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/diagnoses`
      );
      return response.data;
    },
    enabled: !!workspaceId,
  });

  // AI 진단 요청 뮤테이션
  const diagnoseProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/api/ai/project", data);
      return response.data;
    },
    onSuccess: (data) => {
      setProjectResult(data);
      refetchHistory(); // 👈 새로운 진단이 저장되었으니 목록을 다시 불러옵니다.
      toast({
        title: "진단 완료",
        description: "새로운 리포트가 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "진단 실패",
        description: "AI 호출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 진단 실행 함수
  const handleStartDiagnosis = () => {
    if (activeProjects.length === 0) return;

    const summaryData = activeProjects.map((p) => ({
      name: p.name,
      progress: p.progressPercentage,
      deadline: p.deadline,
      status: p.status,
    }));

    diagnoseProjectMutation.mutate({
      message: JSON.stringify(summaryData), // 배열을 문자열로 변환하여 전달
      type: "diagnose",
      workspaceId: workspaceId, // 현재 페이지의 워크스페이스 ID
    });
  };

  const diagnoseMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/api/ai/member", data);
      return response.data;
    },
    onSuccess: (data) => {
      setMemberResult(data);
      refetchHistory();
      toast({
        title: "진단 완료",
        description: "멤버 분석 리포트가 생성되었습니다.",
      });
    },
  });

  // 3. 진단 실행 함수 (데이터 정제 후 전달)
  const handleMemberDiagnosis = () => {
    if (!usersWithStats || usersWithStats.length === 0) return;

    const memberSummary = usersWithStats.map((u: any) => ({
      name: u.name,
      taskCount: u.taskCount || 0,
      completedTaskCount: u.completedTaskCount || 0,
      overdueTaskCount: u.overdueTaskCount || 0,
      progress: u.progressPercentage,
    }));

    diagnoseMemberMutation.mutate({
      message: JSON.stringify(memberSummary),
      type: "member-diagnose",
      workspaceId: workspaceId,
    });
  };

  const [projectPage, setProjectPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);

  const itemsPerPage = 5; // 한 페이지에 보여줄 기록 수

  // 전체 페이지 수 계산
  const projectTotalPages = Math.ceil(
    (diagnosisHistory?.length || 0) / itemsPerPage
  );
  const memberTotalPages = Math.ceil(
    (usersWithStats?.length || 0) / itemsPerPage
  );

  // 현재 페이지에 해당하는 데이터만 추출
  const currentData = diagnosisHistory?.slice(
    (projectPage - 1) * itemsPerPage,
    projectPage * itemsPerPage
  );

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            AI 진단 리포트
          </h1>
          <p
            className="text-sm text-muted-foreground"
            data-testid="header-subtitle"
          >
            AI가 프로젝트 데이터와 팀 현황을 분석하여 잠재적 리스크와 해결책을
            제시합니다
          </p>
        </div>
      </header>

      {/* Admin Content */}
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-fit grid-cols-2 mb-6">
            <TabsTrigger value="projects" data-testid="tab-projects">
              프로젝트 진단 시작
            </TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">
              멤버 진단 시작
            </TabsTrigger>
          </TabsList>

          {/* 프로젝트 진단 시작 탭 */}
          <TabsContent value="projects" data-testid="content-projects">
            {projectsLoading || diagnoseProjectMutation.isPending ? (
              /* 로딩 화면 (기존 코드와 동일) */
              <div className="flex flex-col items-center justify-center h-[500px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-lg font-medium text-muted-foreground italic">
                  AI가 프로젝트 데이터를 정밀 분석 중입니다...
                </p>
              </div>
            ) : projectResult ? (
              /* 진단 결과 리포트 화면 (기존 코드와 동일) */
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <AlertTriangle className="text-orange-500" /> 종합 리스크
                    진단 결과
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setProjectResult(null)}
                  >
                    목록으로 돌아가기
                  </Button>
                </div>

                <Card className="border-l-4 border-l-primary shadow-lg">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> AI 분석 리포트
                      요약
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {projectResult.result.split("\n").map((line, i) => (
                        <p key={i} className="mb-2 text-base leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>사용 모델: {projectResult.model}</span>
                      <span>
                        진단 일시:{" "}
                        {new Date(
                          projectResult.createdAt || new Date()
                        ).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* 초기 화면: 진단 시작하기 + 과거 기록 목록 */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                {/* 왼쪽: 진단 실행 카드 */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-muted/5 p-12">
                  <div className="text-center space-y-4">
                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      새로운 AI 리스크 진단
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      현재 활성화된 {activeProjects.length}개의 프로젝트
                      데이터를 분석하여
                      <br />
                      지연 리스크와 리소스 최적화 방안을 제안합니다.
                    </p>
                    <Button
                      size="lg"
                      className="mt-4 px-8"
                      onClick={handleStartDiagnosis}
                    >
                      AI 진단 리포트 생성
                    </Button>
                  </div>
                </div>

                {/* 오른쪽: 과거 진단 내역 사이드바 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" /> 최근 진단 기록
                  </h3>

                  {/* 높이 고정 영역 */}
                  <div className="h-[600px] flex flex-col justify-between">
                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                      {currentData?.map((history: any) => (
                        <Card
                          key={history.id}
                          className="p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-md border-muted"
                          onClick={() => setProjectResult(history)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {new Date(history.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2 text-foreground/80 leading-snug">
                            {history.result.substring(0, 100)}...
                          </p>
                        </Card>
                      ))}

                      {(!diagnosisHistory || diagnosisHistory.length === 0) && (
                        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dotted rounded-lg bg-muted/5">
                          저장된 진단 기록이 없습니다.
                        </div>
                      )}
                    </div>

                    {/* 페이지네이션 컨트롤러 */}
                    {projectTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-2">
                        <span className="text-xs text-muted-foreground">
                          {projectPage} / {projectTotalPages} 페이지
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setProjectPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={projectPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setProjectPage((prev) =>
                                Math.min(prev + 1, projectTotalPages)
                              )
                            }
                            disabled={projectPage === projectTotalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 멤버 진단 시작 탭 */}
          <TabsContent value="members" data-testid="content-members">
            {usersLoading || diagnoseMemberMutation.isPending ? (
              /* 로딩 화면: 멤버 데이터를 분석 중일 때 */
              <div className="flex flex-col items-center justify-center h-[500px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-lg font-medium text-muted-foreground italic">
                  AI가 팀원들의 업무 효율과 부하도를 분석 중입니다...
                </p>
              </div>
            ) : memberResult ? (
              /* 진단 결과 리포트 화면: 결과가 있을 때 */
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="text-blue-500" /> 팀 멤버 역량 및 부하
                    진단 결과
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setMemberResult(null)}
                  >
                    목록으로 돌아가기
                  </Button>
                </div>

                <Card className="border-l-4 border-l-blue-500 shadow-lg">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" /> AI 팀
                      매니지먼트 리포트
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {/* 결과 텍스트를 줄바꿈 기준으로 렌더링 */}
                      {memberResult.result
                        .split("\n")
                        .map((line: string, i: number) => (
                          <p
                            key={i}
                            className="mb-2 text-base leading-relaxed whitespace-pre-wrap"
                          >
                            {line}
                          </p>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>분석 모델: {memberResult.model}</span>
                      <span>
                        진단 일시:{" "}
                        {new Date(
                          memberResult.createdAt || new Date()
                        ).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* 초기 화면: 진단 시작하기 + 과거 기록 목록 */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                {/* 왼쪽: 멤버 진단 실행 카드 */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-muted/5 p-12">
                  <div className="text-center space-y-4">
                    <div className="bg-blue-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      팀 멤버 성과 및 부하 진단
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      현재 워크스페이스 내 {usersWithStats?.length || 0}명의
                      멤버의
                      <br />
                      업무 수행 통계를 분석하여
                      <br />
                      개별 맞춤형 관리 전략을 제안합니다.
                    </p>
                    <Button
                      size="lg"
                      className="mt-4 px-8 bg-blue-600 hover:bg-blue-700"
                      onClick={handleMemberDiagnosis}
                      disabled={!usersWithStats || usersWithStats.length === 0}
                    >
                      멤버 분석 리포트 생성
                    </Button>
                  </div>
                </div>

                {/* 오른쪽: 과거 멤버 진단 내역 사이드바 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" /> 최근 진단 기록
                  </h3>

                  <div className="h-[600px] flex flex-col justify-between">
                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                      {/* 멤버 진단 데이터만 필터링하여 표시 (type으로 구분) */}
                      {diagnosisHistory
                        ?.filter(
                          (h: any) => h.type === "member-integrated-diagnose"
                        )
                        .slice(
                          (memberPage - 1) * itemsPerPage,
                          memberPage * itemsPerPage
                        )
                        .map((history: any) => (
                          <Card
                            key={history.id}
                            className="p-4 cursor-pointer hover:border-blue-500/50 transition-all hover:shadow-md border-muted"
                            onClick={() => setMemberResult(history)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(history.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2 text-foreground/80 leading-snug">
                              {history.result.substring(0, 100)}...
                            </p>
                          </Card>
                        ))}

                      {(!diagnosisHistory ||
                        diagnosisHistory.filter(
                          (h: any) => h.type === "member-integrated-diagnose"
                        ).length === 0) && (
                        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dotted rounded-lg bg-muted/5">
                          저장된 멤버 진단 기록이 없습니다.
                        </div>
                      )}
                    </div>

                    {/* 페이지네이션 (멤버 진단용 페이지 수 별도 계산 필요 시 처리) */}
                    {memberTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-2">
                        <span className="text-xs text-muted-foreground">
                          {memberPage} / {memberTotalPages} 페이지
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setMemberPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={memberPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setMemberPage((prev) =>
                                Math.min(prev + 1, memberTotalPages)
                              )
                            }
                            disabled={memberPage === memberTotalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
