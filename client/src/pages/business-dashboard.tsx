import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Database,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  X,
  Building2,
  Tag,
  Info,
  Calendar,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import api from "@/api/api-index";
import { useQuery } from "@tanstack/react-query";

const SOURCE_DATA = [
  "나라장터",
  // "알리오",
  "중소벤처기업부",
  // "기업마당",
  // "누리장터",
  // "철도산업정보센터",
  // "국가철도공단",
  // "한국철도공사",
  // "SR",
  // "SKT",
  // "KT",
  // "LG U+",
  // "통신공사협회",
  // "한국전력공사",
  // "한국토지주택공사",
  // "한국수력원자력",
  // "한국도로공사",
  // "이지비즈",
  "성남산업진흥원",
  // "성남시청",
];

interface NoticeItem {
  id: string;
  title: string;
  org: string;
  amount?: string;
  deadline: string;
  date: string;
  source: string;
  sourcetype: string;
}

export default function BusinessDashboard() {
  const [data, setData] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showFilter, setShowFilter] = useState(true);
  const [progress, setProgress] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [isOnlyFavorites, setIsOnlyFavorites] = useState(false);
  // 1. 입력 중인 필터 상태 (UI용)
  const [tempFilter, setTempFilter] = useState({
    sources: [] as string[],
    startDate: "",
    endDate: "",
    keyword: "",
  });

  // 2. 실제 적용된 필터 상태 (데이터 처리용)
  const [appliedFilter, setAppliedFilter] = useState({
    sources: [] as string[],
    startDate: "",
    endDate: "",
    keyword: "",
  });

  // 3. 버튼 클릭 시 호출될 함수
  const handleSearch = () => {
    setAppliedFilter(tempFilter);
  };

  // 4. 초기화 함수
  const handleReset = () => {
    const resetValue = { sources: [], startDate: "", endDate: "", keyword: "" };
    setTempFilter(resetValue);
    setAppliedFilter(resetValue);
    setIsOnlyFavorites(false);
  };

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      // 1. Source 필터
      const matchSource =
        appliedFilter.sources.length === 0 ||
        appliedFilter.sources.includes(item.source);

      // 2. 날짜 필터
      const itemDate = item.date;
      const matchDate =
        (!appliedFilter.startDate || itemDate >= appliedFilter.startDate) &&
        (!appliedFilter.endDate || itemDate <= appliedFilter.endDate);

      // 3. 키워드 필터 [추가]
      const searchTarget = `${item.title} ${item.org}`.toLowerCase(); // 제목과 기관명에서 검색
      const matchKeyword =
        !appliedFilter.keyword ||
        searchTarget.includes(appliedFilter.keyword.toLowerCase());

      const matchFavorite = !isOnlyFavorites || favorites.includes(item.id);

      // return matchSource && matchDate && matchKeyword;
      return matchSource && matchDate && matchKeyword && matchFavorite;
    });
  }, [data, appliedFilter, isOnlyFavorites, favorites]);

  // 1. 스크롤이 발생하는 부모 요소의 Ref
  const parentRef = useRef<HTMLDivElement>(null);

  // 2. 가상화 설정
  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 105, // min-height 기반 예상 높이
    overscan: 5, // 화면 밖 미리 렌더링 개수
  });

  // const fetchPublicData = async () => {
  //   setLoading(true);
  //   try {
  //     // 여러 API를 동시에 호출
  //     const [bidsRes, mssRes] = await Promise.allSettled([
  //       api.get("/api/bids"),
  //       api.get("/api/mss-business"),
  //     ]);

  //     // 성공한 데이터만 추출하여 합치기
  //     const bidsData = bidsRes.status === "fulfilled" ? bidsRes.value.data : [];
  //     const mssData = mssRes.status === "fulfilled" ? mssRes.value.data : [];

  //     const combinedData = [...bidsData, ...mssData];

  //     // 날짜 기준 내림차순 정렬 (YYYY-MM-DD 형식 문자열 비교)
  //     const sortedData = combinedData.sort((a, b) => {
  //       return (b.date || "").localeCompare(a.date || "");
  //     });

  //     setData(sortedData);
  //   } catch (error) {
  //     console.error("통합 데이터 로드 실패:", error);
  //     setData([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  //2026-03-03
  // const fetchPublicData = async () => {
  //   setLoading(true);
  //   try {
  //     const [bidsRes, mssRes] = await Promise.allSettled([
  //       api.get("/api/bids"),
  //       api.get("/api/mss-business"),
  //     ]);

  //     const bidsData = bidsRes.status === "fulfilled" ? bidsRes.value.data : [];
  //     const mssData = mssRes.status === "fulfilled" ? mssRes.value.data : [];
  //     const combinedData = [...bidsData, ...mssData];

  //     const sortedData = combinedData.sort((a, b) =>
  //       (b.date || "").localeCompare(a.date || ""),
  //     );

  //     setData(sortedData);
  //   } catch (error) {
  //     console.error("데이터 로드 실패:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  ////////

  // useEffect(() => {
  //   fetchPublicData();
  // }, []);

  // 2026-03-03
  // useEffect(() => {
  //   const fetchInitialData = async () => {
  //     setLoading(true);
  //     try {
  //       // 로컬 스토리지 대신 서버 DB API 호출
  //       const response = await api.get("/api/notices");
  //       setData(response.data);
  //     } catch (error) {
  //       console.error("데이터 초기 로드 실패:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchInitialData();
  // }, []);
  useEffect(() => {
    const fetchInitialData = async () => {
      // 이미 데이터가 있는 상태에서 다시 불러오는 걸 방지하려면 조건을 걸 수 있지만,
      // 첫 로드 시에는 필수입니다.
      setLoading(true);
      try {
        // 캐시 방지를 위해 타임스탬프를 붙여서 항상 최신 DB 값을 요청
        const response = await api.get(`/api/notices?t=${Date.now()}`);

        // 서버 응답이 배열인지 확인 후 정렬하여 저장
        const serverData = Array.isArray(response.data) ? response.data : [];
        // const sortedData = serverData.sort((a: any, b: any) =>
        //   (b.date || "").localeCompare(a.date || ""),
        // );

        // setData(sortedData);
        setData(serverData);
      } catch (error) {
        console.error("데이터 초기 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);
  //////////////////

  // const handleUpdate = async () => {
  //   setLoading(true);
  //   setProgress(0);

  //   // 1. 부드러운 애니메이션을 위한 헬퍼 함수 (10% 올리는 데 10초 소요)
  //   const animateIncrement = (
  //     startValue: number,
  //     endValue: number,
  //     duration: number,
  //   ) => {
  //     return new Promise<void>((resolve) => {
  //       const startTime = performance.now();

  //       const step = (currentTime: number) => {
  //         const elapsed = currentTime - startTime;
  //         const progressFraction = Math.min(elapsed / duration, 1); // 0 ~ 1 사이의 값

  //         // 현재 구간의 값 계산 (예: 0 -> 10)
  //         const currentProgress =
  //           startValue + (endValue - startValue) * progressFraction;
  //         setProgress(currentProgress);

  //         if (progressFraction < 1) {
  //           requestAnimationFrame(step); // 다음 프레임 요청
  //         } else {
  //           resolve(); // 10초 완료 시 종료
  //         }
  //       };
  //       requestAnimationFrame(step);
  //     });
  //   };

  //   try {
  //     // 2. 백엔드 API 호출을 미리 시작 (비동기)
  //     const apiPromise = api.get("/api/crawl");

  //     // 3. 총 9번 반복
  //     for (let i = 0; i < 10; i++) {
  //       const start = i * 10;
  //       const end = (i + 1) * 10;

  //       await animateIncrement(start, end, 3300);
  //     }

  //     // 4. 애니메이션이 끝난 후 (또는 진행 중 완료된) API 응답 확인
  //     const response = await apiPromise;
  //     const result = response.data;

  //     if (result.success && result.data) {
  //       setData((prevData) => {
  //         const normalized = result.data.map((item: any) => ({
  //           ...item,
  //           id: item.id || `snip-${item.url.split("portlet=")[1]}`,
  //           date: item.date.replace(/\./g, "-"),
  //           deadline: (item.deadline || "").replace(/\./g, "-") + " 00:00",
  //         }));

  //         const combined = [...prevData, ...normalized];
  //         return combined.sort((a, b) =>
  //           (b.date || "").localeCompare(a.date || ""),
  //         );
  //       });

  //       // 데이터 반영 후 종료
  //       setTimeout(() => {
  //         setLoading(false);
  //         setProgress(0);
  //       }, 500);
  //     }
  //   } catch (error: any) {
  //     console.error("크롤링 호출 에러:", error.response?.data || error.message);
  //     setLoading(false);
  //     setProgress(0);
  //   }
  // };

  //2026-03-03
  // const handleUpdate = async () => {
  //   setLoading(true);
  //   setProgress(1);
  //   setData([]);

  //   const animateIncrement = (
  //     startValue: number,
  //     endValue: number,
  //     duration: number,
  //   ) => {
  //     return new Promise<void>((resolve) => {
  //       const startTime = performance.now();
  //       const step = (currentTime: number) => {
  //         const elapsed = currentTime - startTime;
  //         const progressFraction = Math.min(elapsed / duration, 1);
  //         const currentProgress =
  //           startValue + (endValue - startValue) * progressFraction;
  //         setProgress(currentProgress);

  //         if (progressFraction < 1) {
  //           requestAnimationFrame(step);
  //         } else {
  //           resolve();
  //         }
  //       };
  //       requestAnimationFrame(step);
  //     });
  //   };

  //   // 1. 모든 API 호출을 동시에 시작
  //   const apiPromise = api.get("/api/crawl");
  //   const bidsPromise = api.get("/api/bids");
  //   const mssPromise = api.get("/api/mss-business");

  //   try {
  //     // 2. 진행바 애니메이션 (사용자 대기 유도)
  //     for (let i = 0; i < 10; i++) {
  //       await animateIncrement(i * 10, (i + 1) * 10, 3300);
  //     }

  //     // 3. 모든 API 응답을 기다림
  //     const [crawlRes, bidsRes, mssRes] = await Promise.allSettled([
  //       apiPromise,
  //       bidsPromise,
  //       mssPromise,
  //     ]);

  //     // 4. 각 결과 데이터 추출
  //     const crawlData =
  //       crawlRes.status === "fulfilled" ? crawlRes.value.data.data : [];
  //     const bidsData = bidsRes.status === "fulfilled" ? bidsRes.value.data : [];
  //     const mssData = mssRes.status === "fulfilled" ? mssRes.value.data : [];

  //     // 5. 크롤링 데이터 정규화 및 통합
  //     const normalizedCrawl = crawlData.map((item: any) => ({
  //       ...item,
  //       id: item.id || `snip-${item.url.split("portlet=")[1]}`,
  //       date: item.date.replace(/\./g, "-"),
  //       deadline: (item.deadline || "").replace(/\./g, "-") + " 00:00",
  //     }));

  //     const combined = [...normalizedCrawl, ...bidsData, ...mssData];
  //     const uniqueData = Array.from(
  //       new Map(combined.map((item) => [item.id, item])).values(),
  //     );

  //     // 🚩 6. 서버 스키마 구조에 맞춰 데이터 재가공 (11개 컬럼 + content)
  //     const formattedData = uniqueData.map((item: any) => {
  //       const {
  //         id,
  //         category,
  //         date,
  //         deadline,
  //         org,
  //         source,
  //         sourcetype,
  //         status,
  //         title,
  //         type,
  //         url,
  //         ...rest
  //       } = item;

  //       return {
  //         id,
  //         category: category || "",
  //         date: date || "",
  //         deadline: deadline || "",
  //         org: org || "",
  //         source: source || "",
  //         sourcetype: sourcetype || "",
  //         status: status || "",
  //         title: title || "",
  //         type: type || "",
  //         url: url || "",
  //         content: rest, // 나머지 데이터는 jsonb로
  //       };
  //     });

  //     // 🚩 7. 서버 DB에 동기화 저장 (POST)
  //     await api.post("/api/notices/sync", { notices: formattedData });

  //     // 🚩 8. 저장이 완료된 후 DB에서 정렬된 최신 데이터 다시 가져오기 (GET)
  //     const finalResponse = await api.get("/api/notices");
  //     setData(finalResponse.data);

  //     setTimeout(() => {
  //       setLoading(false);
  //       setProgress(0);
  //     }, 500);
  //   } catch (error) {
  //     console.error("통합 업데이트 실패:", error);
  //     setLoading(false);
  //     setProgress(0);
  //   }
  // };

  const handleUpdate = async () => {
    setLoading(true);
    setProgress(1);
    // 주의: 여기서 setData([])를 하면 기존 데이터가 사라져서 깜빡임이 생길 수 있습니다.
    // 업데이트 중임을 알리는 UI가 따로 있다면 유지하고, 없다면 비우지 않는 것이 자연스럽습니다.

    const animateIncrement = (
      startValue: number,
      endValue: number,
      duration: number,
    ) => {
      return new Promise<void>((resolve) => {
        const startTime = performance.now();
        const step = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progressFraction = Math.min(elapsed / duration, 1);
          setProgress(startValue + (endValue - startValue) * progressFraction);
          if (progressFraction < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    };

    const apiPromise = api.get("/api/crawl");
    const bidsPromise = api.get("/api/bids");
    const mssPromise = api.get("/api/mss-business");

    try {
      // 1. 애니메이션 진행 (기존 33초가 너무 길다면 이 시간을 조정하세요)
      for (let i = 0; i < 10; i++) {
        await animateIncrement(i * 10, (i + 1) * 10, 3300);
      }

      // 2. 데이터 수집 완료
      const [crawlRes, bidsRes, mssRes] = await Promise.allSettled([
        apiPromise,
        bidsPromise,
        mssPromise,
      ]);

      const crawlData =
        crawlRes.status === "fulfilled" ? crawlRes.value.data.data : [];
      const bidsData = bidsRes.status === "fulfilled" ? bidsRes.value.data : [];
      const mssData = mssRes.status === "fulfilled" ? mssRes.value.data : [];

      // 3. 데이터 정규화 및 통합
      const normalizedCrawl = crawlData.map((item: any) => ({
        ...item,
        id: item.id || `snip-${item.url.split("portlet=")[1]}`,
        date: item.date.replace(/\./g, "-"),
        deadline: (item.deadline || "").replace(/\./g, "-") + " 00:00",
      }));

      const combined = [...normalizedCrawl, ...bidsData, ...mssData];
      const uniqueData = Array.from(
        new Map(combined.map((item) => [item.id, item])).values(),
      );

      // 🚩 핵심: DB용 포맷으로 가공
      const formattedData = uniqueData.map((item: any) => {
        const {
          id,
          category,
          date,
          deadline,
          org,
          source,
          sourcetype,
          status,
          title,
          type,
          url,
          amount,
          industry,
          opening,
          time,
          ...rest
        } = item;
        return {
          id,
          category: category || "",
          date: date || "",
          deadline: deadline || "",
          org: org || "",
          source: source || "",
          sourcetype: sourcetype || "",
          status: status || "",
          title: title || "",
          type: type || "",
          url: url || "",
          amount: amount || "",
          industry: industry || "",
          opening: opening || "",
          time: time || "",
          content: rest,
        };
      });

      // 🚩 4. [선 조치] 화면에 즉시 표시 (서버 통신 전)
      // 날짜순 정렬 후 바로 UI 반영
      // const sortedForUI = [...formattedData].sort((a, b) =>
      //   b.date.localeCompare(a.date),
      // );
      const sortedForUI = [...formattedData].sort((a, b) => {
        // 1. 날짜 비교
        const dateDiff = (b.date || "").localeCompare(a.date || "");
        if (dateDiff !== 0) return dateDiff;

        // 2. 날짜가 같을 경우 ID 비교 (백엔드 desc(notices.id)와 일치시킴)
        return (b.id || "").localeCompare(a.id || "");
      });
      setData(sortedForUI);

      // UI 로딩 종료
      setLoading(false);
      setProgress(0);

      // 🚩 5. [후 조치] 백그라운드에서 서버 DB 동기화
      // 이 작업은 await를 하지 않거나, 별도의 비동기 블록으로 처리하여 UI를 막지 않습니다.
      (async () => {
        try {
          await api.post("/api/notices/sync", { notices: formattedData });
          console.log("백그라운드 DB 동기화 완료");

          // B. 저장 완료 후 서버에서 '진짜 최신' 데이터를 다시 가져옴 (캐시 방지 타임스탬프 추가)
          // const finalResponse = await api.get(`/api/notices?t=${Date.now()}`);

          // // C. 서버 데이터로 최종 상태 업데이트 (이제 새로고침해도 똑같음)
          // setData(finalResponse.data);
        } catch (dbError) {
          console.error("백그라운드 동기화 실패:", dbError);
        }
      })();
    } catch (error) {
      console.error("업데이트 실패:", error);
      setLoading(false);
      setProgress(0);
    }
  };

  ///////
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

  // 1. 초기 로드: 즐겨찾기 목록 가져오기
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!userId) {
        setFavorites([]); // 로그아웃 상태면 비움
        return;
      }

      try {
        // api.get은 내부적으로 JSON 파싱을 완료하여 data에 담아줍니다.
        const response = await api.get(`/api/favorites/${userId}`);
        setFavorites(response.data);
      } catch (error) {
        console.error("즐겨찾기 로드 실패:", error);
      }
    };

    fetchFavorites();
  }, [userId]);

  // 2. 즐겨찾기 토글: 추가 또는 삭제
  const toggleFavorite = async (noticeId: string) => {
    if (!userId) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }

    // [중복 클릭 방지] 이미 통신 중이라면 함수를 종료하여 연타를 막음
    if (isPending) return;

    // 1. 현재 상태 백업 (에러 발생 시 복구용)
    const previousFavorites = [...favorites];
    const isCurrentlyFavorite = favorites.includes(noticeId);

    // 2. [UI 선반영] 즉시 화면 업데이트
    setFavorites((prev) =>
      isCurrentlyFavorite
        ? prev.filter((id) => id !== noticeId)
        : [...prev, noticeId],
    );

    // 3. 통신 시작 상태 표시
    setIsPending(true);

    try {
      // 4. 서버 통신
      const response = await api.post("/api/favorites/toggle", {
        userId,
        noticeId,
      });

      if (!response.data.success) {
        throw new Error("서버 저장 실패");
      }

      // 성공 시 별도 처리 불필요 (이미 UI 반영됨)
    } catch (error) {
      // 5. [롤백] 실패 시 원래대로 되돌림
      console.error("즐겨찾기 업데이트 실패:", error);
      setFavorites(previousFavorites);
      alert("연결이 원활하지 않아 반영되지 않았습니다.");
    } finally {
      // 6. [잠금 해제] 성공하든 실패하든 다시 클릭 가능하게 함
      setIsPending(false);
    }
  };

  return (
    // [배경] 흰색을 완전히 버리고 사이드바와 동일한 딥 네이비 적용
    <div className="flex flex-col h-full bg-card text-slate-200 overflow-hidden">
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* [A] 왼쪽: 콘텐츠 영역 */}
        <div
          className={`transition-all duration-500 ease-in-out p-4 overflow-y-auto ${
            selectedItem
              ? "w-[60%] flex-[0_0_60%] border-r border-white/5"
              : "w-full h-full flex-[0_0_100%]"
          }`}
        >
          <div className="mx-auto w-full h-full min-h-0">
            <section className="h-full flex flex-col bg-[#1E293B]/30 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
              {/* 1. 상단 타이틀 및 탭 바 (고정 높이) */}
              <div className="max-h-[89px] p-6 border-b border-white/5 bg-[#1E293B]/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0B1224] rounded-2xl text-white shadow-inner border border-white/5">
                    <Database size={24} />
                  </div>
                  <h2 className="text-xl font-black text-white">
                    실시간 통합 공고
                  </h2>
                </div>

                {/* 필터 컨트롤 영역 */}
                {!selectedItem && showFilter && (
                  <div className="flex items-center gap-3 flex-1 justify-end max-w-5xl animate-in fade-in slide-in-from-top-1 duration-300">
                    {!loading && (
                      <>
                        <button
                          onClick={handleUpdate}
                          disabled={loading}
                          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#3B82F6]/20 active:scale-95"
                        >
                          조회
                        </button>
                      </>
                    )}

                    {loading && progress > 0 && (
                      <div className="flex items-center gap-3 w-9/12">
                        <span className="text-sm font-bold text-gray-300">
                          조회 중
                        </span>

                        {/* 바 컨테이너 */}
                        <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${progress}%`,
                              transition: "none",
                            }}
                          />
                        </div>

                        {/* 퍼센트 수치 (한국어 표기) */}
                        <span className="text-sm font-black text-blue-500 min-w-[70px] tabular-nums">
                          {Math.round(progress)}% 완료
                        </span>
                      </div>
                    )}

                    {!loading && (
                      <>
                        {/* <button
                          onClick={() => setIsOnlyFavorites(!isOnlyFavorites)}
                          disabled={loading}
                          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#3B82F6]/20 active:scale-95"
                        >
                          즐겨찾기
                        </button> */}
                        <button
                          onClick={() => setIsOnlyFavorites(!isOnlyFavorites)}
                          disabled={loading}
                          className={`${isOnlyFavorites ? "bg-[#F59E0B] hover:bg-[#D97706] shadow-[#F59E0B]/20" : "bg-[#3B82F6] hover:bg-[#2563EB] shadow-[#3B82F6]/20"} text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-lg active:scale-95`}
                        >
                          즐겨찾기
                        </button>

                        {/* (1) Source 멀티 셀렉트 */}
                        <div className="relative group">
                          <div className="flex min-w-[127.02px] min-h-[40px] items-center gap-2 bg-[#0B1224] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 cursor-pointer hover:border-[#3B82F6]/50 transition-all">
                            <Filter size={16} className="text-[#3B82F6]" />
                            <span className="min-w-[47.02px] font-bold">
                              {tempFilter.sources.length === 0
                                ? "모든 출처"
                                : `출처 ${tempFilter.sources.length}개`}
                            </span>
                            <ChevronDown size={14} />
                          </div>

                          {/* 드롭다운 (Hover 시 표시) */}
                          <div className="grid grid-cols-2 gap-1 absolute top-full right-0 mt-2 w-80 bg-[#161F30] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                            {SOURCE_DATA.map((src) => (
                              <label
                                key={src}
                                className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer group/item transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded border-white/20 bg-[#0B1224] text-[#3B82F6] focus:ring-0 cursor-pointer"
                                  checked={tempFilter.sources.includes(src)}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...tempFilter.sources, src]
                                      : tempFilter.sources.filter(
                                          (s) => s !== src,
                                        );
                                    setTempFilter((prev) => ({
                                      ...prev,
                                      sources: next,
                                    }));
                                  }}
                                />
                                <span className="text-[13px] font-medium text-slate-400 group-hover/item:text-white truncate">
                                  {src}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* (2) 날짜 범위 선택 */}
                        <div className="flex items-center gap-2 bg-[#0B1224] border border-white/10 rounded-xl px-4 py-1.5 font-bold">
                          <input
                            type="date"
                            value={tempFilter.startDate}
                            className="w-[110px] bg-transparent border-none text-slate-300 outline-none text-xs p-1 cursor-pointer appearance-none"
                            onChange={(e) =>
                              setTempFilter((prev) => ({
                                ...prev,
                                startDate: e.target.value,
                              }))
                            }
                          />
                          <span className="text-slate-700 font-bold">~</span>
                          <input
                            type="date"
                            value={tempFilter.endDate}
                            className="w-[110px] bg-transparent border-none text-slate-300 outline-none text-xs p-1 cursor-pointer appearance-none"
                            onChange={(e) =>
                              setTempFilter((prev) => ({
                                ...prev,
                                endDate: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="flex-1 max-w-[240px] min-h-[40px] relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3B82F6] transition-colors">
                            <Search size={16} />
                          </div>
                          <input
                            type="text"
                            placeholder="공고명 또는 기관명 검색"
                            value={tempFilter.keyword}
                            className="w-full bg-[#0B1224] border border-white/10 rounded-xl pl-11 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-[#3B82F6]/50 transition-all placeholder:text-slate-600 font-medium"
                            onChange={(e) =>
                              setTempFilter((prev) => ({
                                ...prev,
                                keyword: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSearch()
                            } // 엔터키로 바로 검색 가능
                          />
                        </div>

                        {/* (3) 실행 버튼 그룹 */}
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            onClick={handleSearch}
                            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#3B82F6]/20 active:scale-95"
                          >
                            <Search size={16} />
                            검색하기
                          </button>

                          <button
                            onClick={handleReset}
                            className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            title="필터 초기화"
                          >
                            <RefreshCw size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. 컬럼 헤더 (고정 높이) */}
              <div className="flex items-center px-8 py-4 bg-[#1E293B]/20 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">
                <div className="w-[140px] shrink-0 text-center">Source</div>
                <div className="flex-1 px-4 text-center">Title</div>
                <div
                  className={`w-[180px] shrink-0 text-center transition-all duration-500 ease-in-out ${selectedItem ? "pl-8" : "pr-9"}`}
                >
                  Budget
                </div>
                <div className="w-[170px] shrink-0 text-right pr-10">
                  Deadline
                </div>
              </div>

              {/* 3. 리스트 아이템 영역 (스크롤 가능 영역) */}
              {loading ? (
                /* 1. 로딩 상태 화면 */
                <div className="flex flex-col w-full h-full bg-[#0B0F1A]/30">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center px-8 py-7 border-b border-white/5 animate-pulse"
                    >
                      <div className="w-[140px] flex items-center gap-3">
                        <div className="w-[3px] h-9 bg-slate-800 rounded-full" />
                        <div className="flex flex-col gap-2">
                          <div className="w-10 h-2 bg-slate-800 rounded" />
                          <div className="w-20 h-4 bg-slate-800 rounded" />
                        </div>
                      </div>
                      <div className="flex-1 ml-4 flex flex-col gap-3">
                        <div className="w-2/3 h-5 bg-slate-800 rounded" />
                        <div className="w-1/3 h-3 bg-slate-800 rounded" />
                      </div>
                      <div className="w-[180px] flex justify-end">
                        <div className="w-24 h-6 bg-slate-800 rounded" />
                      </div>
                      <div className="w-[170px] flex justify-end">
                        <div className="w-20 h-8 bg-slate-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredData.length === 0 ? (
                /* 2. 데이터가 없을 때 (검색 결과 없음 포함) */
                <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
                  <div className="mb-4 opacity-20">
                    <Search size={48} />
                  </div>
                  <p className="text-lg font-medium">조회된 공고가 없습니다.</p>
                  <p className="text-sm">
                    필터를 변경하거나 검색어를 확인해 보세요.
                  </p>
                </div>
              ) : (
                <div
                  ref={parentRef}
                  className="flex-1 min-h-0 overflow-y-scroll divide-y divide-white/5 custom-scrollbar"
                  style={{
                    contain: "strict", // 브라우저 최적화를 위한 힌트
                  }}
                >
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                      const item = filteredData[virtualItem.index];

                      return (
                        <div
                          key={virtualItem.key}
                          onClick={() => {
                            setSelectedItem(item);
                            setShowFilter(false); // 필터 즉시 숨김

                            setIsDetailLoading(true); // 로딩 시작

                            setTimeout(() => {
                              setIsDetailLoading(false); // 400ms 후 콘텐츠 표시
                            }, 400);
                          }}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                          className={`group flex items-center px-8 py-7 transition-all cursor-pointer border-b border-white/5 ${
                            selectedItem?.id === item.id
                              ? "bg-[#3B82F6]/10"
                              : "hover:bg-sidebar-accent"
                          }`}
                        >
                          {/* 1. SOURCE 영역: 구조적 미니멀 스타일 */}
                          <div className="w-[140px] shrink-0 flex items-center group">
                            {/* 1. 수직 바: 텍스트 전체 높이에 맞춰 살짝 길게 설정 */}
                            <div className="w-[3px] h-9 bg-[#3B82F6] rounded-full mr-3 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />

                            <div className="flex flex-col justify-center leading-snug">
                              {/* 2. 카테고리: 가독성을 위해 색상을 살짝 톤다운 (Slate-500) */}
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1 ml-[1px]">
                                {item.sourcetype}
                              </span>

                              {/* 3. 출처: 폰트 크기를 키우고 하이라이트 효과 */}
                              <div className="flex items-center gap-2">
                                <span className="text-[15px] font-black text-white tracking-tight leading-tight">
                                  {item.source}
                                </span>
                                {/* 상태 점: 텍스트 끝에 배치하여 디자인 포인트 부여 */}
                                {favorites.includes(item.id) && (
                                  <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full shadow-[0_0_6px_#3B82F6] animate-in fade-in zoom-in duration-300" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 2. TITLE & INFO 영역: 더 넓은 공간감 확보 */}
                          <div className="flex-1 flex flex-col gap-2 justify-center min-w-0 ml-4">
                            <h4
                              className={`text-[16px] font-bold truncate transition-colors leading-snug ${
                                selectedItem?.id === item.id
                                  ? "text-[#3B82F6]"
                                  : "text-slate-100 group-hover:text-[#3B82F6]"
                              }`}
                            >
                              {item.title}
                            </h4>

                            <div className="flex items-center gap-3 text-slate-500 text-[12px]">
                              <span className="flex-none font-semibold text-slate-400 truncate">
                                {item.org}
                              </span>
                              <span className="text-slate-600">|</span>
                              <span className="truncate">{item.date}</span>
                            </div>
                          </div>

                          {/* 3. BUDGET (180px) - 숫자 포맷팅 적용 */}
                          <div
                            className={`w-[180px] shrink-0 flex items-center justify-end gap-1.5 transition-all duration-500 ease-in-out ${
                              selectedItem ? "pr-0" : "pr-8"
                            }`}
                          >
                            <span
                              className={`text-[15px] font-black ${
                                selectedItem?.id === item.id
                                  ? "text-white"
                                  : "text-slate-200"
                              }`}
                            >
                              {item.amount && item.amount !== "0"
                                ? Number(item.amount).toLocaleString()
                                : "미정"}
                            </span>
                            {item.amount && item.amount !== "0" && (
                              <span className="text-[15px] text-slate-500 font-bold mt-0.5">
                                원
                              </span>
                            )}
                          </div>

                          {/* 4. DEADLINE (170px) - 가독성 강화 */}
                          <div className="w-[170px] shrink-0 flex items-center justify-end gap-3">
                            {/* 날짜 & 시간 컨테이너: flex-col로 두 줄 배치 */}
                            <div className="flex flex-col items-end gap-0.5 min-w-[80px] leading-snug">
                              {/* 첫 번째 줄: 날짜 */}
                              {item.deadline === "공고문 참조" ? (
                                <span className="px-2 py-1.5 text-sm font-bold text-blue-400 bg-blue-900/30 rounded-md border border-blue-800">
                                  공고문 참조
                                </span>
                              ) : (
                                <span
                                  className={`text-[14px] font-black tracking-tight leading-none ${
                                    selectedItem?.id === item.id
                                      ? "text-[#3B82F6]"
                                      : "text-slate-300"
                                  }`}
                                >
                                  {item.deadline?.split(" ")[0]}
                                </span>
                              )}

                              {/* 두 번째 줄: 시간 */}
                              {item.deadline === "공고문 참조" ? (
                                <></>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-1 h-1 rounded-full ${selectedItem?.id === item.id ? "bg-[#3B82F6]" : "bg-slate-600"}`}
                                  />
                                  <span className="text-[12px] font-bold text-slate-500 leading-none">
                                    {item.deadline?.split(" ")[1] || "00:00"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 아이콘 영역 */}
                            <ChevronRight
                              size={16}
                              className={`transition-all shrink-0 ${
                                selectedItem?.id === item.id
                                  ? "translate-x-1 text-[#3B82F6]"
                                  : "text-slate-700 group-hover:text-slate-400"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* [B] 오른쪽: 상세 패널 영역 */}
        {(selectedItem || isClosing) && (
          <aside className="w-full lg:w-[40%] bg-card p-4 flex flex-col min-h-0 animate-in slide-in-from-right duration-500 shadow-2xl">
            {isDetailLoading ? (
              <div className="flex-1 min-h-0 bg-[#1E293B]/30 border border-white/5 rounded-[32px] flex flex-col overflow-hidden shadow-[-20px_0_40px_rgba(0,0,0,0.3)]"></div>
            ) : (
              <div className="flex-1 min-h-0 bg-[#1E293B]/30 border border-white/5 rounded-[32px] flex flex-col overflow-hidden shadow-[-20px_0_40px_rgba(0,0,0,0.3)] duration-500">
                {/* 상세 헤더 (고정) */}
                <div
                  className="flex-1 flex flex-col min-h-0 animate-in fade-in fill-mode-both"
                  style={{
                    animationDelay: "100ms",
                    animationDuration: "100ms",
                  }}
                >
                  <div className="p-6 border-b border-white/5 bg-[#1E293B]/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-[#3B82F6] text-[11px] font-bold text-white rounded-lg uppercase tracking-widest shadow-lg shadow-[#3B82F6]/20">
                        {selectedItem?.category || "입찰공고"}
                      </div>
                      <span className="text-[12px] text-slate-500 font-bold">
                        REF-{selectedItem?.id}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setIsClosing(true); // 1. 닫기 애니메이션 시작
                        setSelectedItem(null); // 2. 애니메이션 끝난 후 데이터 비우기
                        setIsClosing(false); // 3. 상태 리셋

                        setTimeout(() => {
                          setShowFilter(true); // 4. 필터 보이기
                        }, 500); // duration-500과 맞춤
                      }}
                      className="p-2.5 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* 상세 콘텐츠 (스크롤 가능) */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {/* 2. 제목 및 공고기관 */}
                    {selectedItem && isDetailLoading ? (
                      /* 로딩 중일 때 보여줄 스켈레톤 UI (찌그러짐 방지용 고정 높이) */
                      <div className="space-y-8 animate-pulse">
                        <div className="space-y-3">
                          <div className="h-8 bg-white/5 rounded-lg w-full" />
                          <div className="h-8 bg-white/5 rounded-lg w-2/3" />
                        </div>
                        <div className="h-32 bg-white/5 rounded-[28px]" />
                        <div className="h-48 bg-white/5 rounded-[28px]" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4 px-2">
                          <h3 className="min-h-[97.17px] text-[24px] font-bold text-white leading-[1.35] tracking-tight break-keep line-clamp-3 hover:line-clamp-none transition-all duration-300">
                            {selectedItem?.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 text-sm font-semibold">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-[#3B82F6]" />
                              {selectedItem?.org}
                            </div>
                            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                              <Calendar size={16} />
                              <span>공고일: {selectedItem?.date}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3. 주요 금액 및 상태 정보 (Quick Summary) */}
                        <div className="p-6 bg-[#0B1224]/50 border border-white/5 rounded-[28px] relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/5 blur-[60px] -mr-16 -mt-16" />

                          <div className="space-y-5 relative z-10">
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-4">
                              <span className="text-sm font-bold text-slate-500 uppercase">
                                배정예산금액
                              </span>
                              <span className="text-2xl font-extrabold text-white">
                                {selectedItem?.amount
                                  ? `${Number(selectedItem?.amount).toLocaleString()}원`
                                  : "금액 미정"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-sm font-bold text-slate-500 uppercase">
                                  입찰마감
                                </span>
                                <p className="text-sm font-bold text-slate-200">
                                  {selectedItem?.deadline}
                                </p>
                              </div>
                              <div className="space-y-1 text-right">
                                <span className="text-sm font-bold text-slate-500 uppercase">
                                  개찰일시
                                </span>
                                <p className="text-sm font-bold text-[#3B82F6]">
                                  {selectedItem?.opening}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4. 투찰 제한 업종 및 분석 (Condition Analysis) */}
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 px-2">
                            <div className="w-1.5 h-4 bg-[#3B82F6] rounded-full shadow-[0_0_8px_#3B82F6]" />
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Industry & Condition
                            </h4>
                          </div>
                          <div className="p-7 bg-[#1E293B]/20 border border-white/5 rounded-[28px] space-y-4">
                            <div>
                              <span className="text-sm font-bold text-slate-500 block mb-2">
                                투찰가능 업종
                              </span>
                              <p className="text-[14px] text-slate-200 leading-relaxed font-bold break-keep">
                                {selectedItem?.industry || "상세 공고문 참조"}
                              </p>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                              <p className="text-sm text-slate-400 leading-relaxed">
                                본 공고는{" "}
                                <span className="text-white font-semibold">
                                  {selectedItem?.org}
                                </span>
                                에서 주관하는
                                <span className="text-white font-semibold">
                                  {" "}
                                  {selectedItem?.category}
                                </span>{" "}
                                사업으로, 상세한 투찰 자격은 원문을 참조하시기
                                바랍니다.
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 상세 푸터 (고정) */}
                  <div className="p-6 border-t border-white/5 bg-[#1E293B]/50 flex items-center gap-4 shrink-0">
                    <a
                      href={selectedItem?.url}
                      target="_blank"
                      className="flex-[2.5] h-[52px] flex items-center justify-center gap-3 bg-[#1E293B] hover:bg-[#3B82F6] border border-white/10 text-white rounded-2xl text-[14px] font-black transition-all shadow-xl active:scale-[0.98] group"
                    >
                      공고 원문{" "}
                      <ExternalLink
                        size={18}
                        className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                      />
                    </a>
                    <button
                      onClick={() => toggleFavorite(selectedItem?.id)}
                      className={`flex-1 h-[52px] flex items-center justify-center rounded-2xl transition-all border-2 ${
                        favorites.includes(selectedItem?.id)
                          ? "bg-[#3B82F6] border-[#3B82F6] text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                          : "bg-transparent border-white/5 text-slate-500 hover:text-white hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10"
                      }`}
                    >
                      <Tag
                        size={20}
                        // fill={
                        //   favorites.includes(selectedItem?.id)
                        //     ? "currentColor"
                        //     : "none"
                        // }
                        className={
                          favorites.includes(selectedItem?.id)
                            ? "animate-bounce-short"
                            : ""
                        }
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
