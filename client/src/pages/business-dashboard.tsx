import React, { useEffect, useState } from "react";
import {
  Database,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  X,
  Building2,
  Tag,
  Info,
} from "lucide-react";
import api from "@/api/api-index";

interface BusinessDashboardProps {
  onCardClick: (name: string) => void;
}

const BUSINESS_SOURCES = [
  {
    id: 1,
    category: "공공/통합",
    name: "공공/통합",
    type: "API",
    description:
      "나라장터(G2B), 기업마당(Bizinfo) 등 국가 통합 API 데이터 수집",
  },
  {
    id: 2,
    category: "철도 특화",
    name: "철도 특화",
    type: "Scrolling",
    description: "국가철도공단 등 철도 분야 특화 게시판 실시간 데이터 추출",
  },
  {
    id: 3,
    category: "통신 3사",
    name: "통신 3사",
    type: "Scrolling",
    description: "SKT, KT, LGU+ 구매포털 보안 통과 및 공고 수집",
  },
  {
    id: 4,
    category: "지역 특화",
    name: "지역 특화",
    type: "Scrolling",
    description: "이지비즈(경기), 성남산업진흥원 등 지자체 지원 사업",
  },
];

export default function BusinessDashboard({
  onCardClick,
}: BusinessDashboardProps) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSubTab, setCurrentSubTab] = useState("bids");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("공공/통합");

  const fetchPublicData = async (type: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/${type}`);
      setData(response.data);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData(currentSubTab);
  }, [currentSubTab]);

  return (
    // [배경] 흰색을 완전히 버리고 사이드바와 동일한 딥 네이비 적용
    <div className="flex flex-col min-h-screen bg-[#0B1224] font-sans text-slate-200">
      <main className="flex flex-1 overflow-hidden">
        {/* [A] 왼쪽: 콘텐츠 영역 */}
        <div
          className={`transition-all duration-500 ease-in-out p-10 overflow-y-auto ${
            selectedItem
              ? "w-full lg:w-[60%] border-r border-white/5 pr-6"
              : "w-full"
          }`}
        >
          <div className="mx-auto space-y-12">
            {/* 통합 리스트 섹션: 배경을 #1E293B 다크 톤으로 변경 */}
            <section className="bg-[#1E293B]/30 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-[#1E293B]/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0B1224] rounded-2xl text-white shadow-inner border border-white/5">
                    <Database size={24} />
                  </div>
                  <h2 className="text-xl font-black text-white">
                    실시간 통합 공고
                  </h2>
                </div>

                {/* 탭 버튼: 다크 테마에 맞는 색상 조합 */}
                <div className="flex bg-[#0B1224] p-1.5 rounded-2xl border border-white/5">
                  {["bids", "winners", "contracts"].map((id) => (
                    <button
                      key={id}
                      onClick={() => setCurrentSubTab(id)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                        currentSubTab === id
                          ? "bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/20"
                          : "text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {id === "bids"
                        ? "입찰"
                        : id === "winners"
                          ? "낙찰"
                          : "계약"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 리스트 아이템: 화이트 대신 딥 네이비 호버 효과 */}
              <div className="divide-y divide-white/5">
                {data.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group flex items-center justify-between p-7 transition-all cursor-pointer ${
                      selectedItem?.id === item.id
                        ? "bg-[#3B82F6]/10"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-6 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.type === "입찰"
                            ? "bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]"
                            : "bg-emerald-500"
                        }`}
                      />
                      <div className="truncate">
                        <h4
                          className={`text-base font-bold truncate transition-colors ${
                            selectedItem?.id === item.id
                              ? "text-white"
                              : "text-slate-300 group-hover:text-white"
                          }`}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[12px] text-slate-500 mt-1.5 font-bold font-mono uppercase tracking-tight">
                          {item.org} • {item.date}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className={`transition-all ${
                        selectedItem?.id === item.id
                          ? "translate-x-1 text-[#3B82F6]"
                          : "text-slate-700 group-hover:text-slate-400"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* [B] 오른쪽: 상세 패널 영역 (사이드바와 일치하는 완전한 #0B1224) */}
        {selectedItem && (
          <aside className="sticky top-0 w-full lg:w-[40%] bg-[#0B1224] pt-10 pb-10 p-6 flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl">
            {/* 메인 컨테이너: pb-10에 맞춰 내부 여백 및 라운드 유지 */}
            <div className="flex-1 bg-[#1E293B]/30 border border-white/5 rounded-[32px] flex flex-col overflow-hidden shadow-[-20px_0_40px_rgba(0,0,0,0.3)]">
              {/* 카드 상단 헤더: [A]의 헤더와 동일한 높이감 유지 */}
              <div className="p-8 border-b border-white/5 bg-[#1E293B]/50 flex items-center justify-between shrink-0 min-h-[115px]">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-[#3B82F6] text-[10px] font-black text-white rounded-lg uppercase tracking-widest shadow-lg shadow-[#3B82F6]/20">
                    DATA INSIGHT
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono font-bold tracking-tight">
                    REF-{selectedItem.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2.5 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 카드 내부 컨텐츠 영역: 스크롤 영역 간격 최적화 */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* 제목 및 소속 정보: 텍스트 크기를 약간 키워 가독성 확보 */}
                <div className="space-y-4 px-2">
                  <h3 className="text-[28px] font-black text-white leading-[1.2] tracking-tighter">
                    {selectedItem.title}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                    <Building2 size={18} className="text-[#3B82F6]" />
                    {selectedItem.org}
                  </div>
                </div>

                {/* 내부 요약 카드: [A]의 요약 섹션과 시각적 무게감 통일 */}
                <div className="p-9 bg-[#0B1224]/50 border border-white/5 rounded-[28px] space-y-7 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/5 blur-[60px] -mr-16 -mt-16" />

                  <div className="flex items-center gap-2 text-slate-500">
                    <Info size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      Quick Summary
                    </span>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-baseline border-b border-white/5 pb-5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                        추정 사업비
                      </span>
                      <span className="text-3xl font-black text-white">
                        {selectedItem.amount
                          ? `${Number(selectedItem.amount).toLocaleString()}원`
                          : "금액 미정"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                        현재 진행상태
                      </span>
                      <span className="px-5 py-2 bg-[#3B82F6] rounded-xl text-[11px] font-black text-white uppercase shadow-lg shadow-[#3B82F6]/20">
                        {selectedItem.status || "일반공고"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 분석 리포트 섹션: 텍스트 줄간격과 패딩 조정 */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1.5 h-4 bg-[#3B82F6] rounded-full shadow-[0_0_8px_#3B82F6]" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Condition Analysis
                    </h4>
                  </div>
                  <div className="p-8 bg-[#1E293B]/20 border border-white/5 rounded-[28px]">
                    <p className="text-[16px] text-slate-300 leading-relaxed font-bold">
                      본 입찰은{" "}
                      <span className="text-[#3B82F6] border-b-2 border-[#3B82F6]/30 pb-0.5">
                        정보통신공사업 면허
                      </span>{" "}
                      보유가 필수적이며, 최근 3년 내 단일 건 2억 원 이상의 준공
                      실적이 요구됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 하단 액션 버튼 그룹: pb-10에 맞춰 하단 여백 확보 및 버튼 높이 조정 */}
              <div className="p-8 pt-6 border-t border-white/5 bg-[#1E293B]/20 flex gap-4">
                <a
                  href={selectedItem.url}
                  target="_blank"
                  className="flex-[2.5] flex items-center justify-center gap-3 py-5 bg-[#1E293B] hover:bg-[#3B82F6] border border-white/10 text-white rounded-[22px] text-[14px] font-black transition-all shadow-xl active:scale-[0.98]"
                >
                  공고 원문 <ExternalLink size={18} />
                </a>
                <button className="flex-1 flex items-center justify-center bg-transparent border-2 border-white/5 text-slate-500 rounded-[22px] hover:text-white hover:border-white/20 transition-all">
                  <Tag size={22} />
                </button>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
