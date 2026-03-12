import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  RefreshCcw,
  Download,
  FileSearch,
  CheckCircle2,
  Save,
  ChevronRight,
  ChevronLeft,
  Clock,
  AlertTriangle,
  X,
  Users,
  Loader2,
  Share2,
  Calendar,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";
import api from "@/api/api-index";
import { useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface WeeklyReportData {
  id: string;
  title: string;
  updatedAt?: Date;
  isReShared: boolean;
  period: {
    actual: string;
    plan: string;
  };
  projects: {
    name: string;
    actual: string;
    plan: string;
  }[];
}

export default function ReportList() {
  const { id: workspaceId } = useParams();
  const { toast } = useToast();

  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userEmail = localStorage.getItem("userEmail");
  const storageKey = `temp_report_${workspaceId}_${userEmail}`; // 이메일 추가

  const { data: usersWithStats, isLoading: usersLoading } = useQuery({
    queryKey: ["users-stats", workspaceId],
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/users/with-stats`,
      );
      return response.data;
    },
    enabled: !!workspaceId,
  });

  const currentUser = usersWithStats?.find(
    (user: any) => user.email === userEmail,
  );

  const userAdmin =
    currentUser?.email === "admin@qubicom.co.kr" ||
    currentUser?.email === "hslee@qubicom.co.kr" ||
    currentUser?.email === "cheolhoo.kim@qubicom.co.kr" ||
    currentUser?.email === "hdkim@qubicom.co.kr";

  // 2. 보고서 목록 가져오기 (공유 상태 포함)
  const {
    data: diagnosticHistory,
    isLoading: isFetchLoading,
    isFetching: isRefetching,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["weekly-reports-save", workspaceId],
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/weekly-reports-save`,
      );
      return response.data;
    },
    enabled: !!workspaceId,
    refetchInterval: userAdmin ? false : 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await api.delete(
        `/api/workspaces/${workspaceId}/weekly-reports-save/${reportId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["weekly-reports-save", workspaceId],
      });

      localStorage.removeItem(storageKey);

      toast({
        title: "삭제 완료",
        description: "보고서가 정상적으로 삭제되었습니다.",
      });

      setReportData(null); // 보고서 상세 보기 중이었다면 목록으로 이동
      setIsInitialized(false);

      refetchHistory(); // 목록 새로고침
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    },
  });

  // 삭제 핸들러
  const handleDelete = (reportId: string) => {
    if (
      window.confirm(
        "정말로 이 보고서를 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.",
      )
    ) {
      deleteMutation.mutate(reportId);
    }
  };

  const extractWordMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId || "");
      const response = await api.post("/api/ai/extract-word-save", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["weekly-reports-save", workspaceId],
      });

      const freshData = {
        ...data.content,
        id: data.id,
        updatedAt: data.updatedAt,
      };

      setReportData(freshData);
      console.log('freshData', freshData)
      setIsInitialized(true);

      setSelectedFile(null); // 상태값 비우기
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // 화면의 파일명(input 값) 지우기
      }

      toast({
        title: "보고서 분석 완료",
        description: "선택하신 보고서 내용이 추가 되었습니다.",
      });
    },
  });

  // 2026-02-04: 무한 로딩 방지 및 자동 복구 로직
  useEffect(() => {
    // 가드 로직: 이미 초기화됐거나, 필요한 데이터가 아직 로딩 중이면 실행하지 않음
    if (isInitialized || isFetchLoading || !diagnosticHistory) return;

    // 관리자가 아닌 경우 myDrafts가 로드될 때까지 대기 (데이터 일관성 확인)
    const processInitialization = () => {
      // 3. 아무것도 해당 안 되면 초기화 완료 처리 (화면에는 안내문 노출)
      setIsInitialized(true);
    };

    processInitialization();
  }, [
    isInitialized,
    isFetchLoading,
    diagnosticHistory,
    userAdmin,
    storageKey,
    // 🚩 reportData는 여기에 절대 넣지 마세요 (무한 로딩의 원인)
  ]);
  ////

  const [reportPage, setReportPage] = useState(1);

  const itemsPerReportPage = userAdmin ? 5 : 8;

  const reportTotalPages = Math.ceil(
    (diagnosticHistory?.length || 0) / itemsPerReportPage,
  );

  const currentReportData = diagnosticHistory?.slice(
    (reportPage - 1) * itemsPerReportPage,
    reportPage * itemsPerReportPage,
  );

  // reportData 변경 시 로컬 스토리지 자동 저장
  useEffect(() => {
    if (reportData && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify(reportData));
    }
  }, [reportData, storageKey, isInitialized]);

  // 모든 Mutation의 로딩 상태를 하나로 결합
  const isAnyPending = deleteMutation.isPending;

  if (
    isFetchLoading ||
    usersLoading ||
    !isInitialized ||
    (reportData && !isInitialized)
  ) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <RefreshCcw className="animate-spin w-10 h-10 text-primary" />
        <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold">주간 보고서 조회 및 등록</h1>
          <p className="text-sm text-muted-foreground">
            주간 보고서를 업로드하고 회차별 상세 자료를 자유롭게 조회하세요
          </p>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {reportData ? (
          <div className="max-w-none mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle2 className="text-green-500" /> 분석된 보고서 내용
              </h2>
              <div className="flex gap-2">
                {userAdmin && (
                  <>
                    <Button
                      variant="outline"
                      className="bg-red-500 border-red-500 hover:bg-red-700"
                      disabled={isAnyPending}
                      onClick={() => {
                        const currentId = diagnosticHistory?.find(
                          (h: any) => h.id === reportData.id,
                        )?.id;
                        if (currentId) handleDelete(currentId);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" /> 삭제하기
                    </Button>
                  </>
                )}
                <Button
                  disabled={isAnyPending}
                  variant="outline"
                  onClick={() => setReportData(null)}
                >
                  목록으로 돌아가기
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden border-slate-300 shadow-xl">
              <CardHeader className="border-b border-slate-300">
                <div className="text-sm font-bold text-center">
                  {reportData.title || ""}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <table className="w-full border-collapse relative">
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th
                        rowSpan={2}
                        className="w-[20%] border-r border-slate-300 p-2 text-sm font-bold bg-slate-50/30"
                      >
                        프로젝트
                      </th>
                      <th className="w-[40%] border-r border-slate-300 p-2 text-sm font-bold">
                        실적
                      </th>
                      <th className="w-[40%] p-2 text-sm font-bold">계획</th>
                    </tr>

                    <tr className="border-b border-slate-300">
                      {/* 실적 기간/상세 */}
                      <th className="border-r border-slate-300 p-2 bg-slate-50/10">
                        <div className="flex justify-center items-center min-h-[32px] text-sm font-bold text-muted-foreground text-center whitespace-pre-wrap">
                          {reportData.period.actual || ""}
                        </div>
                      </th>
                      {/* 계획 기간/상세 */}
                      <th className="p-2 bg-slate-50/10">
                        <div className="flex justify-center items-center min-h-[32px] text-sm font-bold text-muted-foreground text-center whitespace-pre-wrap">
                          {reportData.period.plan || ""}
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportData?.projects?.map((project, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-200 last:border-0"
                      >
                        {/* 프로젝트명 */}
                        <td className="border-r border-slate-300 p-4 bg-slate-50/30 min-w-[140px] text-center font-bold">
                          {project.name}
                        </td>

                        {/* 실적 */}
                        <td className="border-r border-slate-300 p-4 align-top">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed ">
                            {project.actual || "-"}
                          </div>
                        </td>

                        {/* 계획 */}
                        <td className="border-r border-slate-300 p-4 align-top">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed ">
                            {project.plan || "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        ) : userAdmin ? (
          /* 초기 화면: 진단 시작하기 + 과거 기록 목록 */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 왼쪽: 진단 실행 카드 */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-muted/5 p-12">
              <div className="text-center space-y-4">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">주간 보고서 불러오기</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  작성하신 .docx 파일을 업로드하면 AI가 구조를 분석하여
                  <br />
                  편집 가능한 형태로 변환해 드립니다.
                </p>
                <div className="flex flex-col items-center gap-4 mt-6">
                  <div
                    className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-[hsl(222,50%,18%)] transition-colors"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest(".delete-btn")) {
                        document.getElementById("file-upload")?.click();
                      }
                    }}
                  >
                    {selectedFile && (
                      <button
                        type="button"
                        className="delete-btn absolute top-2 right-2 p-1.5 bg-white border border-slate-200 hover:bg-red-50 rounded-full transition-colors z-20 group shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        <X className="w-4 h-4 text-slate-500 group-hover:text-red-600" />
                      </button>
                    )}

                    <div className="flex flex-col items-center justify-center pt-5 pb-6 cursor-pointer w-full h-full">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <div className="text-sm text-slate-500 flex flex-col items-center gap-1">
                        {selectedFile ? (
                          <>
                            <span className="font-semibold text-primary text-center px-8 line-clamp-1">
                              {selectedFile.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              클릭하여 파일 변경
                            </span>
                          </>
                        ) : (
                          "클릭하여 .docx 파일 업로드"
                        )}
                      </div>
                    </div>

                    <input
                      id="file-upload"
                      type="file"
                      ref={fileInputRef}
                      accept=".docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <Button
                    size="lg"
                    className="px-8"
                    disabled={!selectedFile || extractWordMutation.isPending}
                    onClick={() =>
                      selectedFile && extractWordMutation.mutate(selectedFile)
                    }
                  >
                    {extractWordMutation.isPending ? (
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSearch className="mr-2 h-4 w-4" />
                    )}
                    {extractWordMutation.isPending
                      ? "분석 중..."
                      : "보고서 분석 시작"}
                  </Button>
                </div>
              </div>
            </div>

            {/* 오른쪽: 과거 진단 내역 사이드바 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" /> 최근 보고서 기록
              </h3>

              {/* 높이 고정 영역 */}
              {!deleteMutation.isPending && !isRefetching ? (
                <div className="h-[600px] flex flex-col justify-between">
                  <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {currentReportData?.map((history: any) => (
                      <Card
                        key={history.id}
                        className="h-[95.5px] p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-md border-muted"
                        onClick={() => {
                          const selectedData = {
                            ...JSON.parse(JSON.stringify(history.content)),
                            id: history.id, // [중요] 보고서의 실제 DB ID를 객체에 포함
                            // period: history.content.period,
                          };;
                          setReportData(selectedData);
                        }}
                      >
                        <div className="flex">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {new Date(history.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center h-full">
                          <p className="text-sm line-clamp-2 text-foreground/80 leading-snug">
                            {history.content.title}
                          </p>
                        </div>
                      </Card>
                    ))}

                    {(!diagnosticHistory || diagnosticHistory.length === 0) && (
                      <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dotted rounded-lg bg-muted/5">
                        저장된 보고서 기록이 없습니다.
                      </div>
                    )}
                  </div>

                  {/* 페이지네이션 컨트롤러 */}
                  {reportTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t mt-2">
                      <span className="text-xs text-muted-foreground">
                        {reportPage} / {reportTotalPages} 페이지 페이지
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setReportPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={reportPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setReportPage((prev) =>
                              Math.min(prev + 1, reportTotalPages),
                            )
                          }
                          disabled={reportPage === reportTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/5">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        보고서를 삭제하고 있습니다
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        잠시만 기다려 주세요...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 상단 헤더: 어두운 배경에서 돋보이는 발광 포인트 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 pb-6 border-b-2 border-white/10">
              <div className="mt-6 sm:mt-0 flex items-center gap-6 bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border shadow-2xl">
                <div className="px-4 border-r border-white/10 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest mb-1">
                    Total Logs
                  </span>
                  <span className="text-xl font-black text-white leading-none">
                    {diagnosticHistory?.length || 0}
                  </span>
                </div>
                <div className="px-4 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest mb-1">
                    Sequence
                  </span>
                  <span className="text-xl font-black text-blue-400 leading-none">
                    {reportPage}{" "}
                    <span className="text-sm text-slate-600">
                      / {reportTotalPages}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* 메인 리스트: 다크 모드용 유리 질감 카드 */}
            {!isRefetching ? (
              <div className="min-h-[600px] flex flex-col">
                {currentReportData && currentReportData.length > 0 ? (
                  <div className="min-h-[424px] grid-rows-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentReportData.map((history: any) => (
                      <Card
                        key={history.id}
                        className="group relative flex flex-col h-full p-0 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-sm"
                        onClick={() => {
                          const selectedData = {
                            ...JSON.parse(JSON.stringify(history.content)),
                            id: history.id,
                            // period: history.content.period,
                          };
                          setReportData(selectedData);
                        }}
                      >
                        {/* 호버 시 나타나는 상단 그라데이션 라인 */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="p-6 flex flex-col h-full bg-white/[0.03]">
                          <div className="flex items-start justify-between mb-6">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-all duration-500">
                              <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">
                                Verified
                              </div>
                              <div className="text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                                {new Date(
                                  history.createdAt,
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {/* 제목: 어두운 배경에서 텍스트 대비 강화 */}
                          <h4 className="text-[17px] font-bold text-slate-200 leading-snug group-hover:text-white transition-colors line-clamp-2 mb-4">
                            {history.content.title || "제목 없는 데이터 로그"}
                          </h4>

                          <div className="mt-auto pt-4 border-t border-white/15 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              ID-{history.id.toString().slice(-8)}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-blue-500 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                              ACCESS <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-white/[0.03]">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <Inbox className="w-8 h-8 text-slate-700" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">
                      기록된 데이터가 존재하지 않습니다.
                    </p>
                    <p className="text-slate-600 text-sm mt-2 font-medium">
                      관리자의 업로드를 대기 중입니다.
                    </p>
                  </div>
                )}

                {/* 페이지네이션: 다크 테마용 플로팅 컨트롤러 */}
                {reportTotalPages > 1 && (
                  <div className="mt-10 mb-10 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-3 p-2 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                        onClick={() =>
                          setReportPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={reportPage === 1}
                      >
                        <ChevronLeft className="h-5 h-5" />
                      </Button>

                      <div className="flex items-center gap-2.5 px-4">
                        {[...Array(reportTotalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setReportPage(i + 1)}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              reportPage === i + 1
                                ? "w-10 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                : "w-2 bg-white/10 hover:bg-white/30"
                            }`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                        onClick={() =>
                          setReportPage((prev) =>
                            Math.min(prev + 1, reportTotalPages),
                          )
                        }
                        disabled={reportPage === reportTotalPages}
                      >
                        <ChevronRight className="h-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center gap-6">
                <div className="w-14 h-14 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-blue-500 tracking-[0.4em] uppercase animate-pulse">
                  Accessing Archive
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
