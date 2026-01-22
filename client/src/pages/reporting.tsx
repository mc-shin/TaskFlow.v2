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
} from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  VerticalAlign,
  TextRun,
  VerticalMergeType,
  LevelFormat,
} from "docx";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";
import api from "@/api/api-index";
import { useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface WeeklyReportData {
  id: string;
  title: string;
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

export default function Diagnostic() {
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
    currentUser?.email === "cheolhoo.kim@qubicom.co.kr";

  // 2. 보고서 목록 가져오기 (공유 상태 포함)
  const {
    data: diagnosticHistory,
    isLoading: isFetchLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["weekly-reports", workspaceId],
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/weekly-reports`,
      );
      return response.data;
    },
    enabled: !!workspaceId,
    refetchInterval: userAdmin ? false : 5000,
  });

  const shareMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await api.patch(
        `/api/workspaces/${workspaceId}/weekly-reports/${reportId}/share`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["weekly-reports", workspaceId],
      });

      refetchHistory();

      toast({ title: "보고서가 팀원들에게 공유되었습니다." });
      refetchHistory();
    },
  });

  // const sharedReportId = useMemo(() => {
  //   if (!diagnosticHistory || !Array.isArray(diagnosticHistory)) return null;

  //   const shared = diagnosticHistory.find((r: any) => {
  //     // isShared, is_shared, isShared(문자열/불리언) 모두 체크
  //     const val = r.isShared ?? r.is_shared;
  //     return val === true || String(val) === "true";
  //   });

  //   return shared?.id;
  // }, [diagnosticHistory]);
  const sharedReportId = useMemo(() => {
    if (!diagnosticHistory) return null;
    return diagnosticHistory.find((r: any) => {
      const val = r.isShared ?? r.is_shared;
      return val === true || String(val) === "true";
    });
  }, [diagnosticHistory]);

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await api.delete(
        `/api/workspaces/${workspaceId}/weekly-reports/${reportId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["weekly-reports", workspaceId],
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

  const saveMutation = useMutation({
    mutationFn: async (updatedData: WeeklyReportData) => {
      if (!sharedReportId) throw new Error("공유된 보고서가 없습니다.");

      const reportIdStr =
        typeof sharedReportId === "object"
          ? (sharedReportId as any).id
          : sharedReportId;

      const response = await api.post(
        `/api/workspaces/${workspaceId}/weekly-reports/${reportIdStr}/drafts`,
        {
          projects: updatedData.projects,
          weekNumber: "2026-W03", // 필요 시 동적 할당
          userId: userEmail,
          userName: currentUser?.name,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["weekly-report-drafts", sharedReportId, userEmail],
      });
      queryClient.invalidateQueries({
        queryKey: ["weekly-reports", workspaceId],
      });

      localStorage.removeItem(storageKey);

      toast({
        title: "임시 저장 완료",
        description: "작성하신 내용이 서버에 안전하게 보관되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "저장 실패",
        description: error.response?.data?.message || "오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!reportData) return;

    // 1. 유효한 ID 찾기 (공유 ID가 없으면 현재 데이터의 제목으로 찾기)
    // const effectiveId =
    //   sharedReportId ||
    //   diagnosticHistory?.find((h: any) => h.title === reportData.title)?.id;
    const effectiveId = sharedReportId || reportData.id || sharedReportId;

    if (!effectiveId) {
      toast({
        title: "보고서 ID 누락",
        description:
          "대상을 특정할 수 없습니다. 목록에서 보고서를 다시 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 2. 관리자 vs 팀원 분기
    if (userAdmin) {
      // 관리자는 최종 확정(PATCH .../finalize)
      if (
        window.confirm("변경사항을 포함하여 최종 보고서를 확정하시겠습니까?")
      ) {
        finalizeMutation.mutate(reportData);
      }
    } else {
      // 팀원은 드래프트 제출(POST .../drafts)
      // 서버가 projects 배열 전체를 받아서 처리하므로 필터링 없이 보냅니다.
      if (window.confirm("수정한 내용을 제출하시겠습니까?")) {
        saveMutation.mutate(reportData);
      }
    }
  };

  const { data: myDrafts } = useQuery({
    queryKey: ["weekly-report-drafts", sharedReportId, userEmail], // userEmail을 키에 넣어 유저별로 캐시 분리
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/weekly-reports/${sharedReportId}/drafts`,
        { params: { userId: userEmail } }, // 서버에 내 아이디를 알려줌
      );
      return response.data;
    },
    enabled: !!sharedReportId && !!userEmail && !userAdmin,
  });

  const extractWordMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId || "");
      const response = await api.post("/api/ai/extract-word", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["weekly-reports", workspaceId],
      });

      const weekRange = getWeekRange();

      const freshData = {
        ...data.content,
        period: {
          actual: weekRange.actual,
          plan: weekRange.plan,
        },
      };

      setReportData(freshData);
      setIsInitialized(true);

      setSelectedFile(null); // 상태값 비우기
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // 화면의 파일명(input 값) 지우기
      }

      toast({
        title: "보고서 분석 완료",
        description: "내용을 수정하신 후 저장 버튼을 눌러주세요.",
      });
    },
  });

  const mergeAllMutation = useMutation({
    mutationFn: async () => {
      if (!sharedReportId) throw new Error("공유된 보고서가 없습니다.");

      const reportIdStr =
        typeof sharedReportId === "object"
          ? (sharedReportId as any).id
          : sharedReportId;

      const response = await api.get(
        `/api/workspaces/${workspaceId}/weekly-reports/${reportIdStr}/all-drafts`,
      );
      return response.data;
    },
    onSuccess: (allDrafts: any[]) => {
      queryClient.invalidateQueries({
        queryKey: ["weekly-reports", workspaceId],
      });

      if (!reportData) return;

      const mergedProjects = reportData.projects.map((proj: any) => {
        const projectDrafts = allDrafts.filter(
          (d) => d.projectName === proj.name,
        );

        if (projectDrafts.length === 0) return proj;

        const divider = "\n----------------------\n";

        // const changedActuals = projectDrafts
        //   .filter((d) => d.actual?.trim() !== proj.actual?.trim())
        //   .map((d) => `[${d.userName || d.userId}] ${d.actual}`);

        // const changedPlans = projectDrafts
        //   .filter((d) => d.plan?.trim() !== proj.plan?.trim())
        //   .map((d) => `[${d.userName || d.userId}] ${d.plan}`);

        // return {
        //   ...proj,
        //   actual:
        //     changedActuals.length > 0
        //       ? changedActuals.join("\n\n")
        //       : proj.actual,
        //   plan: changedPlans.length > 0 ? changedPlans.join("\n\n") : proj.plan,
        // };

        //2026-01-22
        const changedActuals = projectDrafts
          .filter(
            (d) =>
              d.actual?.trim() !== "" &&
              d.actual?.trim() !== proj.actual?.trim(),
          )
          .map((d) => `[${d.userName || d.userId}]\n${d.actual}`); // 이름 다음 줄바꿈 추가

        const changedPlans = projectDrafts
          .filter(
            (d) =>
              d.plan?.trim() !== "" && d.plan?.trim() !== proj.plan?.trim(),
          )
          .map((d) => `[${d.userName || d.userId}]\n${d.plan}`);

        return {
          ...proj,
          actual:
            changedActuals.length > 0
              ? changedActuals.join(divider) + divider // 팀원 사이와 마지막에 구분선 추가
              : proj.actual,
          plan:
            changedPlans.length > 0
              ? changedPlans.join(divider) + divider
              : proj.plan,
        };
        ////
      });

      setReportData({
        ...reportData,
        projects: mergedProjects,
      });

      toast({
        title: "취합 완료",
        description: "수정된 항목별로 정밀하게 필터링하여 취합되었습니다.",
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (finalData: WeeklyReportData) => {
      const targetId = (finalData as any).id || sharedReportId;
      const response = await api.patch(
        `/api/workspaces/${workspaceId}/weekly-reports/${targetId}/finalize`,
        {
          title: finalData.title, // 제목을 명시적으로 추가
          content: finalData,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      localStorage.removeItem(storageKey);

      queryClient.invalidateQueries({
        queryKey: ["weekly-reports", workspaceId],
      });

      toast({
        title: "최종 저장 완료",
        description: "팀원들의 내용이 포함된 공식 보고서가 업데이트되었습니다.",
      });
    },
  });

  useEffect(() => {
    if (!diagnosticHistory || isInitialized) return;

    const sharedReport = diagnosticHistory.find(
      (r: any) => r.isShared === true || String(r.isShared) === "true",
    );

    // 2. 관리자(Admin)라면 자동 로드를 하지 않고 목록 화면에 머무름
    if (userAdmin) {
      setIsInitialized(true);
      return;
    }

    if (!sharedReport) {
      setIsInitialized(true);
      return;
    }

    const weekRange = getWeekRange();

    // 데이터 로드 우선순위 결정
    const savedTemp = localStorage.getItem(storageKey); // 1. 로컬 임시 저장본

    // 2. 내가 이미 서버에 제출한 드래프트 찾기 (myDrafts 쿼리 결과 활용)
    const myLastDraft = myDrafts && myDrafts.length > 0 ? myDrafts : null;

    // if (savedTemp) {
    //   // 아직 제출 전이거나 수정 중인 데이터가 로컬에 있다면 로드
    //   setReportData(JSON.parse(savedTemp));
    // } else if (!userAdmin && myLastDraft) {
    //   // 팀원이고 서버에 제출한 기록이 있다면, 서버 기록을 UI에 복원
    //   let mergedContent = JSON.parse(JSON.stringify(sharedReport.content));
    //   mergedContent.projects = mergedContent.projects.map((origProj: any) => {
    //     const myUpdate = myLastDraft.find(
    //       (d: any) => d.projectName === origProj.name,
    //     );
    //     return myUpdate
    //       ? { ...origProj, actual: myUpdate.actual, plan: myUpdate.plan }
    //       : origProj;
    //   });
    //   setReportData(mergedContent);
    // } else {
    //   // 관리자이거나 처음 작성하는 팀원인 경우 원본 로드
    //   setReportData(JSON.parse(JSON.stringify(sharedReport.content)));
    // }
    let finalContent: WeeklyReportData;

    if (savedTemp) {
      // 1. 로컬 저장본 로드
      finalContent = JSON.parse(savedTemp);
    } else if (!userAdmin && myLastDraft) {
      // 2. 서버 드래프트 로드 및 병합
      let merged = JSON.parse(JSON.stringify(sharedReport.content));
      merged.projects = merged.projects.map((origProj: any) => {
        const myUpdate = myLastDraft.find(
          (d: any) => d.projectName === origProj.name,
        );
        return myUpdate
          ? { ...origProj, actual: myUpdate.actual, plan: myUpdate.plan }
          : origProj;
      });
      finalContent = merged;
    } else {
      // 3. 최초 원본 로드
      finalContent = JSON.parse(JSON.stringify(sharedReport.content));
    }

    // [핵심 추가] 어떤 경로로 데이터를 가져왔든, 날짜는 현재 시점 기준으로 강제 업데이트
    finalContent.period = {
      actual: weekRange.actual,
      plan: weekRange.plan,
    };

    setReportData(finalContent);

    setIsInitialized(true);
  }, [diagnosticHistory, myDrafts, userAdmin, isInitialized, storageKey]);

  // reportData 변경 시 로컬 스토리지 자동 저장
  useEffect(() => {
    if (reportData && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify(reportData));
    }
  }, [reportData, storageKey, isInitialized]);

  // const handleDownloadWord = async () => {
  //   if (!reportData) return;

  //   try {
  //     // 1. 문서 생성
  //     const doc = new Document({
  //       sections: [
  //         {
  //           properties: {},
  //           children: [
  //             // 보고서 제목
  //             new Paragraph({
  //               text: reportData.title,
  //               heading: HeadingLevel.HEADING_1,
  //               alignment: AlignmentType.CENTER,
  //               spacing: { before: 200, after: 200 },
  //             }),
  //             // 제목 아래 여백 (1번 구조처럼 기간은 표 내부로 이동하므로 여기서는 제거하거나 간소화 가능)
  //             new Paragraph({ text: "", spacing: { after: 200 } }),

  //             // 표(Table) 생성
  //             new Table({
  //               width: { size: 100, type: WidthType.PERCENTAGE },
  //               rows: [
  //                 // 헤더 1행: [프로젝트(병합 시작), 실적, 계획]
  //                 new TableRow({
  //                   tableHeader: true,
  //                   children: [
  //                     new TableCell({
  //                       width: { size: 20, type: WidthType.PERCENTAGE },
  //                       children: [
  //                         new Paragraph({
  //                           text: "프로젝트",
  //                           alignment: AlignmentType.CENTER,
  //                           style: "bold",
  //                         }),
  //                       ],
  //                       shading: { fill: "F2F2F2" },
  //                       verticalAlign: VerticalAlign.CENTER,
  //                       verticalMerge: VerticalMergeType.RESTART, // 세로 병합 시작
  //                     }),
  //                     new TableCell({
  //                       width: { size: 40, type: WidthType.PERCENTAGE },
  //                       children: [
  //                         new Paragraph({
  //                           text: "실적",
  //                           alignment: AlignmentType.CENTER,
  //                           style: "bold",
  //                         }),
  //                       ],
  //                       shading: { fill: "F2F2F2" },
  //                       verticalAlign: VerticalAlign.CENTER,
  //                     }),
  //                     new TableCell({
  //                       width: { size: 40, type: WidthType.PERCENTAGE },
  //                       children: [
  //                         new Paragraph({
  //                           text: "계획",
  //                           alignment: AlignmentType.CENTER,
  //                           style: "bold",
  //                         }),
  //                       ],
  //                       shading: { fill: "F2F2F2" },
  //                       verticalAlign: VerticalAlign.CENTER,
  //                     }),
  //                   ],
  //                 }),

  //                 // 헤더 2행: [프로젝트(병합 계속), 실적 기간, 계획 기간]
  //                 new TableRow({
  //                   tableHeader: true,
  //                   children: [
  //                     new TableCell({
  //                       children: [], // 빈 배열이지만 vMerge가 있어 위와 합쳐짐
  //                       verticalMerge: VerticalMergeType.CONTINUE, // 세로 병합 계속
  //                     }),
  //                     new TableCell({
  //                       children: [
  //                         new Paragraph({
  //                           alignment: AlignmentType.CENTER,
  //                           children: [
  //                             new TextRun({
  //                               text: reportData.period.actual,
  //                               size: 18,
  //                               color: "666666",
  //                             }),
  //                           ],
  //                         }),
  //                       ],
  //                       shading: { fill: "FAFAFA" },
  //                       verticalAlign: VerticalAlign.CENTER,
  //                     }),
  //                     new TableCell({
  //                       children: [
  //                         new Paragraph({
  //                           alignment: AlignmentType.CENTER,
  //                           children: [
  //                             new TextRun({
  //                               text: reportData.period.plan,
  //                               size: 18,
  //                               color: "666666",
  //                             }),
  //                           ],
  //                         }),
  //                       ],
  //                       shading: { fill: "FAFAFA" },
  //                       verticalAlign: VerticalAlign.CENTER,
  //                     }),
  //                   ],
  //                 }),

  //                 // 데이터 행들
  //                 ...reportData.projects.map(
  //                   (p) =>
  //                     new TableRow({
  //                       children: [
  //                         new TableCell({
  //                           width: { size: 20, type: WidthType.PERCENTAGE },
  //                           children: [
  //                             new Paragraph({
  //                               text: p.name,
  //                               alignment: AlignmentType.CENTER,
  //                             }),
  //                           ],
  //                           verticalAlign: VerticalAlign.CENTER,
  //                           shading: { fill: "FAFAFA" },
  //                         }),
  //                         new TableCell({
  //                           width: { size: 40, type: WidthType.PERCENTAGE },
  //                           children: p.actual.split("\n").map(
  //                             (line) =>
  //                               new Paragraph({
  //                                 text: line,
  //                                 spacing: { before: 100, after: 100 },
  //                               }),
  //                           ),
  //                         }),
  //                         new TableCell({
  //                           width: { size: 40, type: WidthType.PERCENTAGE },
  //                           children: p.plan.split("\n").map(
  //                             (line) =>
  //                               new Paragraph({
  //                                 text: line,
  //                                 spacing: { before: 100, after: 100 },
  //                               }),
  //                           ),
  //                         }),
  //                       ],
  //                     }),
  //                 ),
  //               ],
  //             }),
  //           ],
  //         },
  //       ],
  //     });

  //     // 2. Blob 형태로 변환 후 다운로드
  //     const now = new Date();
  //     const timestamp =
  //       now.getFullYear() +
  //       String(now.getMonth() + 1).padStart(2, "0") +
  //       String(now.getDate()).padStart(2, "0") +
  //       "_" +
  //       String(now.getHours()).padStart(2, "0") +
  //       String(now.getMinutes()).padStart(2, "0") +
  //       String(now.getSeconds()).padStart(2, "0");

  //     const fileName = `${reportData.title.replace(/\s+/g, "_")}_주간보고서_${timestamp}.docx`;

  //     const blob = await Packer.toBlob(doc);
  //     saveAs(blob, fileName);

  //     toast({
  //       title: "다운로드 성공",
  //       description: "워드 파일이 생성되었습니다.",
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     toast({ title: "다운로드 실패", variant: "destructive" });
  //   }
  // };
  const handleDownloadWord = async () => {
    if (!reportData) return;

    try {
      // 1. 공통 레벨 설정 (size: 20은 10pt를 의미합니다)
      const commonLevels = [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 440, hanging: 440 } },
            run: { font: "맑은 고딕", size: 20 },
          },
        },
        {
          level: 1,
          format: "ganada" as any,
          text: "%2.",
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 880, hanging: 440 } },
            run: { font: "맑은 고딕", size: 20 },
          },
        },
        {
          level: 2,
          format: LevelFormat.DECIMAL,
          text: "%3)",
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 1320, hanging: 440 } },
            run: { font: "맑은 고딕", size: 20 },
          },
        },
        {
          level: 3,
          format: "ganada" as any,
          text: "%4)",
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 1760, hanging: 440 } },
            run: { font: "맑은 고딕", size: 20 },
          },
        },
        {
          level: 4,
          format: LevelFormat.DECIMAL_ENCLOSED_CIRCLE,
          text: "%5",
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 2200, hanging: 440 } },
            run: { font: "맑은 고딕", size: 20 },
          },
        },
        {
          level: 5,
          format: LevelFormat.DECIMAL,
          text: "\u326E",
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 2640, hanging: 440 } },
            run: { font: "맑은 고딕", size: 20 },
          },
        },
      ];

      const numberingConfigs: any[] = [];
      reportData.projects.forEach((_, pIdx) => {
        numberingConfigs.push({
          reference: `ref-actual-${pIdx}`,
          levels: commonLevels,
        });
        numberingConfigs.push({
          reference: `ref-plan-${pIdx}`,
          levels: commonLevels,
        });
      });

      const parseLineToNumberedParagraph = (line: string, ref: string) => {
        const trimmed = line.trim();
        let level = 0;
        let cleanText = trimmed;

        if (/^\d+\./.test(trimmed)) {
          level = 0;
          cleanText = trimmed.replace(/^\d+\.\s*/, "");
        } else if (/^[가-힣ㄱ-ㅎ]\./.test(trimmed)) {
          level = 1;
          cleanText = trimmed.replace(/^[가-힣ㄱ-ㅎ]\.\s*/, "");
        } else if (/^\d+\)/.test(trimmed)) {
          level = 2;
          cleanText = trimmed.replace(/^\d+\)\s*/, "");
        } else if (/^[가-힣ㄱ-ㅎ]\)/.test(trimmed)) {
          level = 3;
          cleanText = trimmed.replace(/^[가-힣ㄱ-ㅎ]\)\s*/, "");
        } else if (/^[①-⑮]/.test(trimmed)) {
          level = 4;
          cleanText = trimmed.replace(/^[①-⑮]\s*/, "");
        } else if (/^[㉮-㉿]/.test(trimmed)) {
          level = 5;
          cleanText = trimmed.replace(/^[㉮-㉿]\s*/, "");
        }

        return new Paragraph({
          text: cleanText,
          numbering: { reference: ref, level: level },
          spacing: { before: 100, after: 100 },
          // 개별 문단 텍스트에도 10pt 적용
          style: "Normal",
        });
      };

      // 3. 워드 문서 생성
      const doc = new Document({
        // [중요] 문서 전체 기본 폰트 및 사이즈 설정
        styles: {
          default: {
            document: {
              run: {
                size: 20, // 10pt
                font: "맑은 고딕",
              },
            },
          },
        },
        numbering: { config: numberingConfigs },
        sections: [
          {
            children: [
              new Paragraph({
                text: reportData.title,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
                // 제목은 별도 폰트 지정이 필요할 수 있습니다.
              }),
              new Paragraph({ text: "", spacing: { after: 200 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    tableHeader: true,
                    children: [
                      new TableCell({
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            text: "프로젝트",
                            alignment: AlignmentType.CENTER,
                            // 스타일 속성이 아닌 run을 통해 볼드와 폰트 적용
                            children: [
                              new TextRun({
                                text: "프로젝트",
                                bold: true,
                                size: 20,
                                font: "맑은 고딕",
                              }),
                            ],
                          }),
                        ],
                        shading: { fill: "F2F2F2" },
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                      new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: "실적",
                                bold: true,
                                size: 20,
                                font: "맑은 고딕",
                              }),
                            ],
                          }),
                        ],
                        shading: { fill: "F2F2F2" },
                      }),
                      new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: "계획",
                                bold: true,
                                size: 20,
                                font: "맑은 고딕",
                              }),
                            ],
                          }),
                        ],
                        shading: { fill: "F2F2F2" },
                      }),
                    ],
                  }),
                  // 데이터 행들
                  ...reportData.projects.map(
                    (p, pIdx) =>
                      new TableRow({
                        children: [
                          new TableCell({
                            width: { size: 20, type: WidthType.PERCENTAGE },
                            children: [
                              new Paragraph({
                                text: p.name,
                                alignment: AlignmentType.CENTER,
                              }),
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                            shading: { fill: "FAFAFA" },
                          }),
                          new TableCell({
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            children: p.actual
                              .split("\n")
                              .filter((l) => l.trim() !== "")
                              .map((l) =>
                                parseLineToNumberedParagraph(
                                  l,
                                  `ref-actual-${pIdx}`,
                                ),
                              ),
                          }),
                          new TableCell({
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            children: p.plan
                              .split("\n")
                              .filter((l) => l.trim() !== "")
                              .map((l) =>
                                parseLineToNumberedParagraph(
                                  l,
                                  `ref-plan-${pIdx}`,
                                ),
                              ),
                          }),
                        ],
                      }),
                  ),
                ],
              }),
            ],
          },
        ],
      });

      const now = new Date();
      const timestamp =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        "_" +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0");
      const fileName = `${reportData.title.replace(/\s+/g, "_")}_주간보고서_${timestamp}.docx`;
      const blob = await Packer.toBlob(doc);
      const { saveAs } = await import("file-saver");
      saveAs(blob, fileName);

      toast({
        title: "다운로드 성공",
        description: "워드 파일이 생성되었습니다.",
      });
    } catch (error) {
      console.error("Word Download Error:", error);
      toast({ title: "다운로드 실패", variant: "destructive" });
    }
  };
  const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0(일) ~ 6(토)
    const hours = now.getHours();

    let baseDate = new Date(now);

    // 월요일(1) 오전 12시 이전이거나 일요일(0)이면 지난주로 계산
    if (day === 0 || (day === 1 && hours < 12)) {
      baseDate.setDate(now.getDate() - 7);
    }

    const baseDay = baseDate.getDay();
    const diffToMon = baseDay === 0 ? 6 : baseDay - 1;

    const thisMon = new Date(baseDate);
    thisMon.setDate(baseDate.getDate() - diffToMon);

    const thisSun = new Date(thisMon);
    thisSun.setDate(thisMon.getDate() + 6);

    const nextMon = new Date(thisMon);
    nextMon.setDate(thisMon.getDate() + 7);

    const nextSun = new Date(nextMon);
    nextSun.setDate(nextMon.getDate() + 6);

    // 결과 예시: 2026.1.19
    const formatDate = (d: Date) =>
      `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;

    return {
      actual: `${formatDate(thisMon)} ~ ${formatDate(thisSun)}`,
      plan: `${formatDate(nextMon)} ~ ${formatDate(nextSun)}`,
    };
  };

  const [projectPage, setProjectPage] = useState(1);

  const itemsPerPage = 5;

  const projectTotalPages = Math.ceil(
    (diagnosticHistory?.length || 0) / itemsPerPage,
  );

  const currentData = diagnosticHistory?.slice(
    (projectPage - 1) * itemsPerPage,
    projectPage * itemsPerPage,
  );

  const handleTextChange = (
    idx: number,
    field: "actual" | "plan",
    value: string,
  ) => {
    setReportData((prev) => {
      if (!prev || !prev.projects) return prev; // 안전장치

      const newProjects = [...prev.projects];
      newProjects[idx] = {
        ...newProjects[idx],
        [field]: value,
      };

      return { ...prev, projects: newProjects };
    });
  };

  const updateProjectData = (idx: number, field: string, value: string) => {
    setReportData((prev) => {
      if (!prev) return prev;
      const newProjects = [...prev.projects];
      newProjects[idx] = { ...newProjects[idx], [field]: value };
      return { ...prev, projects: newProjects };
    });
  };

  // const addSymbol = (idx: number, field: "actual" | "plan", symbol: string) => {
  //   setReportData((prev) => {
  //     if (!prev) return prev;

  //     const indentMap: Record<string, string> = {
  //       "1.": "",
  //       "가.": "  ",
  //       "1)": "    ",
  //       "가)": "      ",
  //       "①": "        ",
  //       "㉮": "          ",
  //     };

  //     const indent = indentMap[symbol] || "";
  //     const currentText = prev.projects[idx][field] || "";
  //     const lines = currentText.split("\n");
  //     let lastLine = lines[lines.length - 1];

  //     // 기호 정규식 수정 (숫자, 한글, 특수문자 모두 포함)
  //     const symbolRegex = /^(\s*)([0-9]+|[가-힣]|[①-⑮㉮-㉿])([\.\)]?)(\s*)/;

  //     // 위쪽 맥락을 살펴서 다음 심볼 결정
  //     const nextSymbolOnly = getNextNumber(currentText, indent, symbol);

  //     // 기호 뒤에 붙는 구분자(. 또는 )) 유지 로직
  //     const delimiterMatch = symbol.match(/[\.\)]/);
  //     const delimiter = delimiterMatch ? delimiterMatch[0] : "";

  //     if (symbolRegex.test(lastLine)) {
  //       const pureText = lastLine.replace(symbolRegex, "");
  //       lines[lines.length - 1] =
  //         `${indent}${nextSymbolOnly}${delimiter} ${pureText}`;
  //     } else if (lastLine.trim() === "") {
  //       lines[lines.length - 1] = `${indent}${nextSymbolOnly}${delimiter} `;
  //     } else {
  //       lines.push(`${indent}${nextSymbolOnly}${delimiter} `);
  //     }

  //     const newProjects = [...prev.projects];
  //     newProjects[idx] = { ...newProjects[idx], [field]: lines.join("\n") };
  //     return { ...prev, projects: newProjects };
  //   });
  // };
  const addSymbol = (idx: number, field: "actual" | "plan", symbol: string) => {
    setReportData((prev) => {
      if (!prev) return prev;

      const indentMap: Record<string, string> = {
        "1.": "",
        "가.": "  ",
        "1)": "    ",
        "가)": "      ",
        "①": "        ",
        "㉮": "          ",
      };

      const indent = indentMap[symbol] || "";
      const currentText = prev.projects[idx][field] || "";
      const lines = currentText.split("\n");

      // 1. 현재 커서가 위치한 textarea 찾기 및 줄 번호 계산
      const textarea = document.activeElement as HTMLTextAreaElement;
      let targetLineIndex = lines.length - 1; // 기본값은 마지막 줄

      if (
        textarea &&
        (textarea.tagName === "TEXTAREA" || textarea.tagName === "INPUT")
      ) {
        const cursorPos = textarea.selectionStart;
        let accumulatedLength = 0;

        // 커서 위치를 기준으로 현재 몇 번째 줄인지 찾음
        for (let i = 0; i < lines.length; i++) {
          const lineEnd = accumulatedLength + lines[i].length;
          if (cursorPos >= accumulatedLength && cursorPos <= lineEnd + i) {
            // +i는 줄바꿈(\n) 포함
            targetLineIndex = i;
            break;
          }
          accumulatedLength += lines[i].length + 1;
        }
      }

      // 2. 해당 줄의 기호 교체 로직
      const symbolRegex = /^(\s*)([0-9]+|[가-힣]|[①-⑮㉮-㉿])([\.\)]?)(\s*)/;
      const delimiter = symbol.match(/[\.\)]/)?.[0] || "";
      const pureSymbol = symbol.replace(/[\.\)]/g, "");

      const targetLine = lines[targetLineIndex];

      if (symbolRegex.test(targetLine)) {
        // 기호가 이미 있으면 기호와 들여쓰기만 교체 (내용 유지)
        const pureContent = targetLine.replace(symbolRegex, "");
        lines[targetLineIndex] =
          `${indent}${pureSymbol}${delimiter} ${pureContent}`;
      } else {
        // 기호가 없으면 앞에 추가
        lines[targetLineIndex] =
          `${indent}${pureSymbol}${delimiter} ${targetLine.trim()}`;
      }

      // 3. 전체 텍스트 재정렬 (가. -> 5. 등으로 연쇄 변경)
      const finalReordered = reorderText(lines.join("\n"));

      const newProjects = [...prev.projects];
      newProjects[idx] = { ...newProjects[idx], [field]: finalReordered };
      return { ...prev, projects: newProjects };
    });
  };

  // const handleKeyDown = (
  //   e: React.KeyboardEvent<HTMLTextAreaElement>,
  //   idx: number,
  //   field: "actual" | "plan",
  // ) => {
  //   if (e.key === "Enter" && !e.nativeEvent.isComposing && !e.shiftKey) {
  //     const target = e.currentTarget;
  //     const cursorPos = target.selectionStart;
  //     const textBeforeCursor = target.value.substring(0, cursorPos);
  //     const lines = textBeforeCursor.split("\n");
  //     const lastLine = lines[lines.length - 1];

  //     const match = lastLine.match(
  //       /^(\s*)([0-9]+|[가-힣]|[①-⑮㉮-㉿])([\.\)]?)(\s+)/,
  //     );

  //     if (match) {
  //       const [_, indent, symbol, delimiter, space] = match;
  //       if (lastLine.trim() === `${symbol}${delimiter}`) return;

  //       e.preventDefault();

  //       // getAutoNextSymbol을 사용하여 다음 기호 계산
  //       const nextSymbolOnly = getNextNumber(textBeforeCursor, indent, symbol);
  //       const autoText = `\n${indent}${nextSymbolOnly}${delimiter}${space}`;

  //       setReportData((prev) => {
  //         if (!prev) return prev;
  //         const currentContent = prev.projects[idx][field];
  //         const newText =
  //           currentContent.substring(0, cursorPos) +
  //           autoText +
  //           currentContent.substring(cursorPos);
  //         const newProjects = [...prev.projects];
  //         newProjects[idx] = { ...newProjects[idx], [field]: newText };
  //         return { ...prev, projects: newProjects };
  //       });

  //       setTimeout(() => {
  //         target.setSelectionRange(
  //           cursorPos + autoText.length,
  //           cursorPos + autoText.length,
  //         );
  //       }, 0);
  //     }
  //   }
  // };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    idx: number,
    field: "actual" | "plan",
  ) => {
    const target = e.currentTarget;
    const cursorPos = target.selectionStart;
    const fullText = target.value;
    const isShift = e.shiftKey;

    // --- 1. Tab 키 처리 (들여쓰기 조절 및 기호 자동 변환) ---
    // if (e.key === "Tab") {
    //   e.preventDefault();
    //   const lines = fullText.split("\n");

    //   // 현재 커서 위치의 줄 인덱스 찾기
    //   let accumulated = 0;
    //   const lineIndex = lines.findIndex((line) => {
    //     const start = accumulated;
    //     accumulated += line.length + 1;
    //     return cursorPos >= start && cursorPos <= start + line.length;
    //   });

    //   if (lineIndex !== -1) {
    //     const line = lines[lineIndex];
    //     const isShift = e.shiftKey;

    //     // 들여쓰기 변경 (2칸 기준)
    //     const newLine = isShift ? line.replace(/^  /, "") : "  " + line;
    //     lines[lineIndex] = newLine;

    //     // 전체 재정렬 (reorderText 내부의 규칙에 따라 기호 타입도 함께 변경됨)
    //     const reorderedText = reorderText(lines.join("\n"));
    //     updateProjectData(idx, field, reorderedText);

    //     // 커서 위치 보정 (들여쓰기 변화량만큼)
    //     const diff = newLine.length - line.length;
    //     setTimeout(() => {
    //       target.setSelectionRange(cursorPos + diff, cursorPos + diff);
    //     }, 0);
    //   }
    //   return;
    // }
    if (e.key === "Tab") {
      e.preventDefault();
      const originalText = target.value;
      const lines = originalText.split("\n");
      const cursorPos = target.selectionStart;

      let accumulated = 0;
      const lineIndex = lines.findIndex((line) => {
        const start = accumulated;
        accumulated += line.length + 1;
        return cursorPos >= start && cursorPos <= start + line.length;
      });

      if (lineIndex !== -1) {
        const oldLine = lines[lineIndex];
        // 공백 제거/추가
        const newLine = isShift
          ? oldLine.replace(/^ {1,2}/, "")
          : "  " + oldLine;
        lines[lineIndex] = newLine;

        const fullNewText = lines.join("\n");
        const reorderedText = reorderText(fullNewText);

        // 상태 업데이트
        updateProjectData(idx, field, reorderedText);

        // ★ [핵심] 커서 위치 재계산
        // 현재 줄의 시작 위치를 다시 찾아서, 기호+공백(2칸) 뒤로 커서를 보냅니다.
        setTimeout(() => {
          const newLines = reorderedText.split("\n");
          let newPos = 0;
          for (let i = 0; i < lineIndex; i++) {
            newPos += newLines[i].length + 1;
          }

          // 해당 줄의 기호 부분을 찾아서 그 뒤(공백 포함)로 커서 이동
          const targetLine = newLines[lineIndex];
          const markerMatch = targetLine.match(
            /^(\s*)([0-9]+|[가-힣]|[①-⑮㉮-㉿])([\.\)]?)\s*/,
          );
          const markerLength = markerMatch ? markerMatch[0].length : 0;

          target.setSelectionRange(
            newPos + markerLength,
            newPos + markerLength,
          );
        }, 10); // 브라우저 렌더링을 위해 약간의 지연시간 부여
      }
    }

    // --- 2. Enter 키 처리 (다음 번호 생성) ---
    if (e.key === "Enter" && !e.nativeEvent.isComposing && !e.shiftKey) {
      const textBeforeCursor = fullText.substring(0, cursorPos);
      const lines = textBeforeCursor.split("\n");
      const lastLine = lines[lines.length - 1];

      // 기호 패턴 매칭
      const match = lastLine.match(
        /^(\s*)([0-9]+|[가-힣]|[①-⑮㉮-㉿])([\.\)]?)(\s+)/,
      );

      if (match) {
        const [_, indent, symbol, delimiter, space] = match;

        // 내용 없이 기호만 있는 상태에서 Enter 치면 종료 (선택 사항)
        if (lastLine.trim() === `${symbol}${delimiter}`) return;

        e.preventDefault();

        // 다음 기호 계산 및 자동 삽입 문자열 생성
        const nextSymbolOnly = getNextNumber(textBeforeCursor, indent, symbol);
        const autoText = `\n${indent}${nextSymbolOnly}${delimiter}${space}`;

        // 텍스트 삽입 후 전체 재정렬 (중간 삽입 시 아래쪽 번호 밀림 방지)
        const newText =
          fullText.substring(0, cursorPos) +
          autoText +
          fullText.substring(cursorPos);
        const reorderedText = reorderText(newText);

        updateProjectData(idx, field, reorderedText);

        setTimeout(() => {
          target.setSelectionRange(
            cursorPos + autoText.length,
            cursorPos + autoText.length,
          );
        }, 0);
      }
    }
  };

  const getNextNumber = (
    allText: string,
    currentIndent: string,
    targetSymbolType: string,
  ) => {
    const lines = allText.split("\n");
    const hangulSeq = "가나다라마바사아자차카타파하";
    const currentLevel = currentIndent.length; // 공백 개수로 레벨 판단

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.trim() === "") continue;

      const lineIndent = line.match(/^(\s*)/)?.[0] || "";
      const lineLevel = lineIndent.length;

      // 핵심 로직: 현재 레벨보다 상위 레벨(공백이 더 적음)을 만나면 루프 종료
      if (lineLevel < currentLevel) {
        break;
      }

      // 같은 레벨일 때만 번호 추적
      if (lineLevel === currentLevel) {
        const trimmedLine = line.substring(lineLevel);
        const numMatch = trimmedLine.match(/^(\d+)([\.\)])\s/);
        const korMatch = trimmedLine.match(/^([가-힣])([\.\)])\s/);
        const specialMatch = trimmedLine.match(/^([①-⑮㉮-㉿])\s/);

        if (/\d/.test(targetSymbolType) && numMatch) {
          return String(parseInt(numMatch[1]) + 1);
        }
        if (/[가-힣]/.test(targetSymbolType) && korMatch) {
          const idx = hangulSeq.indexOf(korMatch[1]);
          return idx !== -1 && idx < hangulSeq.length - 1
            ? hangulSeq[idx + 1]
            : targetSymbolType;
        }
        if (/[①-⑮㉮-㉿]/.test(targetSymbolType) && specialMatch) {
          return String.fromCharCode(specialMatch[1].charCodeAt(0) + 1);
        }
      }
    }

    // 상위 레벨을 만났거나, 이전에 같은 레벨이 없으면 초기값(1, 가, ①) 반환
    if (/\d/.test(targetSymbolType)) return "1";
    if (/[가-힣]/.test(targetSymbolType)) return "가";
    if (/[①-⑮㉮-㉿]/.test(targetSymbolType))
      return targetSymbolType === "㉮" ? "㉮" : "①";

    return targetSymbolType.replace(/[\.\)]/g, "");
  };

  // const reorderText = (text: string) => {
  //   const lines = text.split("\n");
  //   const hangulSeq = "가나다라마바사아자차카타파하";
  //   const counters: Record<number, number> = {};

  //   const getStandardSymbolType = (level: number) => {
  //     if (level === 0) return "1.";
  //     if (level === 2) return "가.";
  //     if (level === 4) return "1)";
  //     if (level === 6) return "가)";
  //     if (level === 8) return "①";
  //     return "㉮";
  //   };

  //   return lines.map((line) => {
  //     // 1. 정규식 수정: 기호와 구분자 이후의 모든 공백을 제거하고 순수 내용(content)만 캡처
  //     const match = line.match(/^(\s*)([0-9]+|[가-힣]|[①-⑮㉮-㉿])([\.\)]?)\s*(.*)/);
  //     if (!match) return line;

  //     let [_, indent, symbol, delimiter, content] = match;
  //     const level = indent.length;

  //     // 하위 레벨 카운터 초기화
  //     Object.keys(counters).forEach((l) => {
  //       if (parseInt(l) > level) counters[parseInt(l)] = 0;
  //     });

  //     counters[level] = (counters[level] || 0) + 1;
  //     const count = counters[level];

  //     // 2. 표준 기호 타입 결정
  //     const standardType = getStandardSymbolType(level);

  //     let newSymbol = "";
  //     let newDelimiter = standardType.match(/[\.\)]/) ? standardType.match(/[\.\)]/)?.[0] : "";

  //     if (/\d/.test(standardType)) {
  //       newSymbol = String(count);
  //     } else if (/[가-힣]/.test(standardType)) {
  //       newSymbol = hangulSeq[count - 1] || "가";
  //     } else if (/[①-⑮]/.test(standardType)) {
  //       newSymbol = String.fromCharCode("①".charCodeAt(0) + count - 1);
  //       newDelimiter = ""; // 원문자는 구분자 없음
  //     } else if (/[㉮-㉿]/.test(standardType)) {
  //       newSymbol = String.fromCharCode("㉮".charCodeAt(0) + count - 1);
  //       newDelimiter = "";
  //     }

  //     // 3. ★ 핵심 수정: 기호+구분자 바로 뒤에 공백 " "을 강제로 추가
  //     // content는 앞뒤 공백을 제거(trim)하여 중복 공백 방지
  //     const processedContent = content.trim();

  //     // 최종 결과 반환 (내용이 없어도 기호+구분자+공백은 유지됨)
  //     return `${indent}${newSymbol}${newDelimiter} ${processedContent}`;
  //   }).join("\n");
  // };
  const reorderText = (text: string) => {
    const lines = text.split("\n");
    const hangulSeq = "가나다라마바사아자차카타파하";
    let counters: Record<number, number> = {};

    const getStandardSymbolType = (level: number) => {
      if (level <= 1) return "1.";
      if (level <= 3) return "가.";
      if (level <= 5) return "1)";
      if (level <= 7) return "가)";
      if (level <= 9) return "①";
      return "㉮";
    };

    return lines
      .map((line) => {
        if (line.includes("----------------------")) {
          counters = {};
          return line;
        }

        // 기호까지만 매칭
        const match = line.match(/^(\s*)([0-9]+|[가-힣]|[①-⑮㉮-㉿])([\.\)]?)/);
        if (!match) return line;

        const [fullMarker, indent, symbol, oldDelimiter] = match;
        const level = indent.length;
        const rawContent = line.substring(fullMarker.length).trim();

        Object.keys(counters).forEach((l) => {
          if (parseInt(l) > level) delete counters[parseInt(l)];
        });
        counters[level] = (counters[level] || 0) + 1;
        const count = counters[level];

        const standardType = getStandardSymbolType(level);
        let newSymbol = "";
        let newDelimiter = standardType.match(/[\.\)]/)?.[0] || "";

        if (standardType.includes("1")) {
          newSymbol = String(count);
        } else if (standardType.includes("가")) {
          newSymbol = hangulSeq[count - 1] || "가";
        } else if (standardType === "①" || standardType === "㉮") {
          newSymbol = String.fromCharCode(
            standardType.charCodeAt(0) + count - 1,
          );
          newDelimiter = "";
        }

        // ★ 공백을 확실하게 2칸("  ") 삽입하여 '다)  ' 형태를 만듭니다.
        return `${indent}${newSymbol}${newDelimiter}  ${rawContent}`;
      })
      .join("\n");
  };

  if (isFetchLoading || usersLoading || !isInitialized) {
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
          <h1 className="text-xl font-semibold">주간 보고서 관리</h1>
          <p className="text-sm text-muted-foreground">
            기존 워드 보고서를 불러와 웹에서 수정하고 관리하세요
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
                      onClick={() => {
                        const currentId = diagnosticHistory?.find(
                          (h: any) => h.id === reportData.id,
                        )?.id;
                        if (currentId) handleDelete(currentId);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" /> 삭제하기
                    </Button>
                    <Button
                      variant="default"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        // 현재 선택된 보고서의 ID를 찾아 공유 (history에서 현재 reportData와 매칭되는 ID 사용)
                        const currentId = diagnosticHistory?.find(
                          (h: any) => h.id === reportData.id,
                        )?.id;
                        if (currentId) shareMutation.mutate(currentId);
                      }}
                    >
                      <Users className="mr-2 h-4 w-4" /> 팀원에게 공유하기
                    </Button>
                  </>
                )}
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSave} // 정의한 함수를 연결
                >
                  {saveMutation.isPending || finalizeMutation.isPending ? (
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {userAdmin ? "최종 확정 및 저장" : "보고서 제출하기"}
                </Button>
                {userAdmin && (
                  <>
                    <Button
                      onClick={() => mergeAllMutation.mutate()}
                      disabled={mergeAllMutation.isPending}
                      // variant="outline"
                      className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-500 hover:text-white"
                    >
                      {mergeAllMutation.isPending
                        ? "취합 중..."
                        : "팀원 내용 취합하기"}
                    </Button>
                    {/* 워드 다운로드 버튼 추가 */}
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleDownloadWord}
                    >
                      <Download className="mr-2 h-4 w-4" /> 워드로 내보내기
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setReportData(null)}
                    >
                      목록으로 돌아가기
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Card className="overflow-hidden border-slate-300 shadow-xl">
              <CardHeader className="border-b border-slate-300">
                <Input
                  readOnly={!userAdmin}
                  className={`text-2xl font-bold text-center border-none bg-transparent ${
                    !userAdmin ? "cursor-default opacity-80" : ""
                  }`}
                  value={reportData.title}
                  onChange={(e) =>
                    userAdmin &&
                    setReportData({ ...reportData, title: e.target.value })
                  }
                />
              </CardHeader>

              <CardContent className="p-0">
                <table className="w-full border-collapse">
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
                      <th className="border-r border-slate-300 p-2">
                        <div className="flex flex-col h-full justify-center">
                          <Textarea
                            readOnly={!userAdmin}
                            className={`font-bold border-none shadow-none focus-visible:ring-0 text-center bg-transparent resize-none min-h-[32px] overflow-hidden text-xs text-muted-foreground ${
                              !userAdmin ? "cursor-default opacity-80" : ""
                            }`}
                            rows={1}
                            value={reportData.period.actual}
                            onChange={(e) =>
                              userAdmin &&
                              setReportData({
                                ...reportData,
                                period: {
                                  ...reportData.period,
                                  actual: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </th>
                      <th className="border-r border-slate-300 p-2">
                        <div className="flex flex-col h-full justify-center">
                          <Textarea
                            readOnly={!userAdmin}
                            className={`font-bold border-none shadow-none focus-visible:ring-0 text-center bg-transparent resize-none min-h-[32px] overflow-hidden text-xs text-muted-foreground ${
                              !userAdmin ? "cursor-default opacity-80" : ""
                            }`}
                            rows={1}
                            value={reportData.period.plan}
                            onChange={(e) =>
                              userAdmin &&
                              setReportData({
                                ...reportData,
                                period: {
                                  ...reportData.period,
                                  plan: e.target.value,
                                },
                              })
                            }
                          />
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
                        <td className="border-r border-slate-300 p-2 bg-slate-50/30 min-w-[140px]">
                          <div className="flex flex-col h-full items-center justify-center">
                            <Textarea
                              className="font-bold border-none shadow-none focus-visible:ring-0 text-center bg-transparent resize-none min-h-[40px] overflow-hidden"
                              rows={5} // 내용에 따라 자동 조절되도록 설정
                              value={project.name}
                              onChange={(e) => {
                                const newProjects = [...reportData.projects];
                                newProjects[idx].name = e.target.value;
                                setReportData({
                                  ...reportData,
                                  projects: newProjects,
                                });
                              }}
                            />
                          </div>
                        </td>
                        {/* 실적 */}
                        <td className="border-r border-slate-300 p-2">
                          {/* 1. 기호 삽입 버튼 툴바 */}
                          {/* <div className="flex flex-wrap gap-2 mb-2 p-1">
                            {["1.", "가.", "1)", "가)", "①", "㉮"].map(
                              (sym) => (
                                <button
                                  key={sym}
                                  type="button"
                                  onClick={() => addSymbol(idx, "actual", sym)}
                                  className="w-9 y-9 px-2 py-2 text-xs border border-slate-300 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                  {sym}
                                </button>
                              ),
                            )}
                          </div> */}
                          <div className="flex items-center justify-between mb-3 p-2 bg-slate-50 rounded-md border border-slate-200">
                            <div className="flex items-center gap-2 text-[13px] text-slate-600">
                              <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold">
                                TIP
                              </span>
                              <p>
                                <span className="font-semibold text-slate-800">
                                  문단 번호 자동 조절
                                </span>{" "}
                                /
                                <kbd className="ml-1 px-1.5 py-0.5 text-[11px] font-sans font-semibold bg-white border border-slate-300 rounded shadow-sm text-slate-900">
                                  Tab
                                </kbd>{" "}
                                또는
                                <kbd className="ml-1 px-1.5 py-0.5 text-[11px] font-sans font-semibold bg-white border border-slate-300 rounded shadow-sm text-slate-900">
                                  Shift + Tab
                                </kbd>
                                을 누르세요.
                              </p>
                            </div>
                            <div className="text-[11px] text-slate-400 italic">
                              1. → 가. → 1) → 가) → ① → ㉮ 순서로 변경됩니다.
                            </div>
                          </div>

                          {/* 2. 메인 입력창 */}
                          <Textarea
                            className="min-h-[500px] border-none shadow-none focus-visible:ring-0 resize-none text-sm"
                            value={project.actual}
                            onChange={(e) =>
                              handleTextChange(idx, "actual", e.target.value)
                            }
                            // ★ 여기에 추가합니다
                            // onFocus={(e) => {
                            //   // 내용이 아예 없거나 공백만 있을 경우 초기값 셋팅
                            //   if (
                            //     !project.actual ||
                            //     project.actual.trim() === ""
                            //   ) {
                            //     // 1. 뒤에 공백을 두 칸 넣어 가독성을 확보합니다.
                            //     handleTextChange(idx, "actual", "1.  ");

                            //     // 커서를 맨 뒤로 보냅니다.
                            //     const val = e.target.value;
                            //     setTimeout(() => {
                            //       e.target.setSelectionRange(
                            //         val.length + 4,
                            //         val.length + 4,
                            //       );
                            //     }, 0);
                            //   }
                            // }}
                            onFocus={(e) => {
                              const currentVal = project.actual || "";

                              // 1. 아예 비어있거나 공백만 있는 경우 -> '1.  ' 셋팅
                              if (currentVal.trim() === "") {
                                handleTextChange(idx, "actual", "1.  ");
                                setTimeout(() => {
                                  e.target.setSelectionRange(4, 4);
                                }, 0);
                              }
                              // 2. 내용이 있는데(취합 후), 마지막이 줄바꿈이거나 번호 형식이 아닐 경우
                              else if (userAdmin) {
                                // 관리자일 때만 자동 번호 추가를 원할 경우 조건 추가
                                const trimmedVal = currentVal.trimEnd();

                                // 마지막 줄이 숫자/기호로 시작하는 번호 형식이 아닌지 체크 (정규식)
                                // 예: '내용입니다' 로 끝나면 새 줄에 '1. ' 추가
                                const lines = trimmedVal.split("\n");
                                const lastLine = lines[lines.length - 1];
                                const bulletRegex =
                                  /^(\d+\.|[가-힣]\.|[①-⑮]|\d+\)|[가-힣]\))/;

                                if (!bulletRegex.test(lastLine.trim())) {
                                  const newVal = trimmedVal + "\n\n1.  ";
                                  handleTextChange(idx, "actual", newVal);

                                  setTimeout(() => {
                                    e.target.setSelectionRange(
                                      newVal.length,
                                      newVal.length,
                                    );
                                    // 포커스 시 자동으로 스크롤을 맨 아래로 내림
                                    e.target.scrollTop = e.target.scrollHeight;
                                  }, 0);
                                }
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault(); // 브라우저 기본 동작 중단 (충돌 방지)

                              // 1. 클립보드 데이터 가져오기
                              const pastedText =
                                e.clipboardData.getData("text");
                              const target = e.currentTarget;

                              // 2. 현재 상태값과 커서 위치 파악
                              const currentText = target.value;
                              const selectionStart = target.selectionStart;
                              const selectionEnd = target.selectionEnd;

                              // 3. 기존 텍스트 사이에 붙여넣은 내용 합성
                              const combinedText =
                                currentText.substring(0, selectionStart) +
                                pastedText +
                                currentText.substring(selectionEnd);

                              // 4. ★ 정렬 로직 적용 (실시간 정렬 유지)
                              const formattedText = reorderText(combinedText);

                              // 5. 상태 업데이트
                              handleTextChange(idx, "actual", formattedText);

                              // 6. 커서 위치 보정
                              // 정렬 후 텍스트 길이가 변할 수 있으므로 0ms 지연 후 위치 조정
                              setTimeout(() => {
                                const newCursorPos =
                                  selectionStart + pastedText.length;
                                target.setSelectionRange(
                                  newCursorPos,
                                  newCursorPos,
                                );
                              }, 0);
                            }}
                            onKeyDown={(e) => {
                              // 기존에 있던 번호 자동 조절 로직 실행
                              handleKeyDown(e, idx, "actual");

                              // 엔터 키 처리
                              if (e.key === "Enter" && !e.shiftKey) {
                                const target = e.currentTarget;

                                // setTimeout을 사용하여 줄바꿈이 입력된 '직후'에 실행되도록 합니다.
                                setTimeout(() => {
                                  // 1. 스크롤을 맨 아래로 이동
                                  target.scrollTo({
                                    top: target.scrollHeight,
                                    behavior: "smooth", // 부드러운 움직임을 원치 않으면 제거 가능
                                  });

                                  // 2. 만약 내용이 너무 길어 behavior: "smooth"가 안 먹힐 경우를 대비한 강제 이동
                                  target.scrollTop = target.scrollHeight;
                                }, 0); // 10ms 정도의 아주 짧은 지연시간이면 충분합니다.
                              }
                            }}
                            placeholder="내용을 입력하세요."
                          />
                        </td>
                        {/* 계획 */}
                        {/* <td className="p-2">
                          <Textarea
                            className="min-h-[60px] border-none shadow-none focus-visible:ring-0 resize-none text-sm"
                            rows={5}
                            value={project.plan}
                            onChange={(e) => {
                              const newProjects = [...reportData.projects];
                              newProjects[idx].plan = e.target.value;
                              setReportData({
                                ...reportData,
                                projects: newProjects,
                              });
                            }}
                          />
                        </td> */}
                        <td className="border-r border-slate-300 p-2">
                          {/* 1. 기호 삽입 버튼 툴바 */}
                          {/* <div className="flex flex-wrap gap-2 mb-2 p-1">
                            {["1.", "가.", "1)", "가)", "①", "㉮"].map(
                              (sym) => (
                                <button
                                  key={sym}
                                  type="button"
                                  onClick={() => addSymbol(idx, "plan", sym)}
                                  className="w-9 y-9 px-2 py-2 text-xs border border-slate-300 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                  {sym}
                                </button>
                              ),
                            )}
                          </div> */}
                          <div className="flex items-center justify-between mb-3 p-2 bg-slate-50 rounded-md border border-slate-200">
                            <div className="flex items-center gap-2 text-[13px] text-slate-600">
                              <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold">
                                TIP
                              </span>
                              <p>
                                <span className="font-semibold text-slate-800">
                                  문단 번호 자동 조절
                                </span>{" "}
                                /
                                <kbd className="ml-1 px-1.5 py-0.5 text-[11px] font-sans font-semibold bg-white border border-slate-300 rounded shadow-sm text-slate-900">
                                  Tab
                                </kbd>{" "}
                                또는
                                <kbd className="ml-1 px-1.5 py-0.5 text-[11px] font-sans font-semibold bg-white border border-slate-300 rounded shadow-sm text-slate-900">
                                  Shift + Tab
                                </kbd>
                                을 누르세요.
                              </p>
                            </div>
                            <div className="text-[11px] text-slate-400 italic">
                              1. → 가. → 1) → 가) → ① → ㉮ 순서로 변경됩니다.
                            </div>
                          </div>

                          {/* 2. 메인 입력창 */}
                          <Textarea
                            className="min-h-[500px] border-none shadow-none focus-visible:ring-0 resize-none text-sm"
                            value={project.plan}
                            onChange={(e) =>
                              handleTextChange(idx, "plan", e.target.value)
                            }
                            // ★ 여기에 추가합니다
                            onFocus={(e) => {
                              // 내용이 아예 없거나 공백만 있을 경우 초기값 셋팅
                              if (!project.plan || project.plan.trim() === "") {
                                // 1. 뒤에 공백을 두 칸 넣어 가독성을 확보합니다.
                                handleTextChange(idx, "plan", "1.  ");

                                // 커서를 맨 뒤로 보냅니다.
                                const val = e.target.value;
                                setTimeout(() => {
                                  e.target.setSelectionRange(
                                    val.length + 4,
                                    val.length + 4,
                                  );
                                }, 0);
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault(); // 브라우저 기본 동작 중단 (충돌 방지)

                              // 1. 클립보드 데이터 가져오기
                              const pastedText =
                                e.clipboardData.getData("text");
                              const target = e.currentTarget;

                              // 2. 현재 상태값과 커서 위치 파악
                              const currentText = target.value;
                              const selectionStart = target.selectionStart;
                              const selectionEnd = target.selectionEnd;

                              // 3. 기존 텍스트 사이에 붙여넣은 내용 합성
                              const combinedText =
                                currentText.substring(0, selectionStart) +
                                pastedText +
                                currentText.substring(selectionEnd);

                              // 4. ★ 정렬 로직 적용 (실시간 정렬 유지)
                              const formattedText = reorderText(combinedText);

                              // 5. 상태 업데이트
                              handleTextChange(idx, "plan", formattedText);

                              // 6. 커서 위치 보정
                              // 정렬 후 텍스트 길이가 변할 수 있으므로 0ms 지연 후 위치 조정
                              setTimeout(() => {
                                const newCursorPos =
                                  selectionStart + pastedText.length;
                                target.setSelectionRange(
                                  newCursorPos,
                                  newCursorPos,
                                );
                              }, 0);
                            }}
                            // onKeyDown={(e) => handleKeyDown(e, idx, "plan")}
                            onKeyDown={(e) => {
                              // 기존에 있던 번호 자동 조절 로직 실행
                              handleKeyDown(e, idx, "plan");

                              // 엔터 키 처리
                              if (e.key === "Enter" && !e.shiftKey) {
                                const target = e.currentTarget;

                                // setTimeout을 사용하여 줄바꿈이 입력된 '직후'에 실행되도록 합니다.
                                setTimeout(() => {
                                  // 1. 스크롤을 맨 아래로 이동
                                  target.scrollTo({
                                    top: target.scrollHeight,
                                    behavior: "smooth", // 부드러운 움직임을 원치 않으면 제거 가능
                                  });

                                  // 2. 만약 내용이 너무 길어 behavior: "smooth"가 안 먹힐 경우를 대비한 강제 이동
                                  target.scrollTop = target.scrollHeight;
                                }, 0); // 10ms 정도의 아주 짧은 지연시간이면 충분합니다.
                              }
                            }}
                            placeholder="내용을 입력하세요."
                          />
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
              <div className="h-[600px] flex flex-col justify-between">
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {currentData?.map((history: any) => (
                    <Card
                      key={history.id}
                      className="h-[95.5px] p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-md border-muted"
                      // onClick={() => setReportData(history.content)}
                      onClick={() => {
                        const weekRange = getWeekRange(); // 클릭 시점의 날짜 계산
                        // const selectedData = JSON.parse(
                        //   JSON.stringify(history.content),
                        // );
                        const selectedData = {
                          ...JSON.parse(JSON.stringify(history.content)),
                          id: history.id, // [중요] 보고서의 실제 DB ID를 객체에 포함
                        };
                        selectedData.period = {
                          actual: weekRange.actual,
                          plan: weekRange.plan,
                        };
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
                {projectTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-2">
                    <span className="text-xs text-muted-foreground">
                      {projectPage} / {projectTotalPages} 페이지 페이지
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
                            Math.min(prev + 1, projectTotalPages),
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
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <FileText className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">
              관리자가 공유한 보고서가 아직 없습니다.
            </p>
            <p className="text-sm text-muted-foreground/60">
              공유되면 자동으로 화면이 전환됩니다.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
