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
    description: "나라장터(G2B), 기업마당(Bizinfo) 등 국가 통합 API 데이터 수집",
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

export default function BusinessDashboard({ onCardClick }: BusinessDashboardProps) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSubTab, setCurrentSubTab] = useState("bids");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState('공공/통합');

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
            selectedItem ? "w-full lg:w-[60%] border-r border-white/5" : "w-full"
          }`}
        >
          <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* 상단 섹션 헤더 */}
            <section className="space-y-4">
              <div className="flex items-end justify-between border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-[32px] font-black text-white tracking-tight">수집 소스별 현황</h2>
                  <p className="text-slate-500 text-sm mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                    실시간 데이터 파이프라인 연결 상태
                  </p>
                </div>
              </div>

              {/* 소스 카드 그리드: 배경색을 다크하게 변경 */}
              <div className={`grid gap-6 transition-all duration-500 ${
                  selectedItem ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {BUSINESS_SOURCES.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.name);
                      onCardClick(item.name);
                    }}
                    className="group bg-[#1E293B]/40 border border-white/5 rounded-[24px] p-8 cursor-pointer hover:bg-[#1E293B]/80 hover:border-[#3B82F6]/50 transition-all relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-black px-2 py-1 rounded bg-black/40 text-slate-400 border border-white/5 uppercase">
                        {item.type}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#3B82F6] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-10 h-10 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-300 uppercase tracking-widest group-hover:gap-4 transition-all">
                      Check Source <ArrowRight size={14} className="text-[#3B82F6]" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 통합 리스트 섹션: 배경을 #1E293B 다크 톤으로 변경 */}
            <section className="bg-[#1E293B]/30 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-[#1E293B]/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0B1224] rounded-2xl text-white shadow-inner border border-white/5">
                    <Database size={24} />
                  </div>
                  <h2 className="text-xl font-black text-white">실시간 통합 공고</h2>
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
                      {id === "bids" ? "입찰" : id === "winners" ? "낙찰" : "계약"}
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
                      selectedItem?.id === item.id ? "bg-[#3B82F6]/10" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-6 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === "입찰" ? "bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" : "bg-emerald-500"
                      }`} />
                      <div className="truncate">
                        <h4 className={`text-base font-bold truncate transition-colors ${
                          selectedItem?.id === item.id ? "text-white" : "text-slate-300 group-hover:text-white"
                        }`}>
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
                        selectedItem?.id === item.id ? "translate-x-1 text-[#3B82F6]" : "text-slate-700 group-hover:text-slate-400"
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
          <aside className="sticky top-0 h-screen w-full lg:w-[40%] bg-[#0B1224] border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-500 shadow-[-40px_0_80px_rgba(0,0,0,0.6)]">
            {/* 상세 패널 헤더 */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-[#3B82F6] text-[11px] font-black text-white rounded-lg uppercase tracking-[0.2em] shadow-lg shadow-[#3B82F6]/20">
                  Data Insight
                </span>
                <span className="text-[11px] text-slate-500 font-mono font-bold">
                  REF-{selectedItem.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2.5 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* 상세 패널 내용 */}
            <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
              <div className="space-y-6">
                <h3 className="text-[30px] font-black text-white leading-[1.2] tracking-tighter">
                  {selectedItem.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#1E293B]/50 border border-white/5 rounded-xl text-slate-400 text-xs font-bold shadow-inner">
                    <Building2 size={16} className="text-[#3B82F6]" /> {selectedItem.org}
                  </div>
                </div>
              </div>

              {/* 핵심 요약 카드: 내부를 다크 네이비 테마로 통일 */}
              <div className="p-10 bg-[#1E293B]/40 rounded-[40px] text-white border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#3B82F6]/10 blur-[80px] -mr-20 -mt-20 group-hover:bg-[#3B82F6]/20 transition-all duration-700" />
                
                <div className="flex items-center gap-3 text-slate-500">
                  <Info size={18} />
                  <span className="text-[11px] font-black uppercase tracking-[0.25em]">
                    AI Analysis Report
                  </span>
                </div>
                <div className="space-y-8 relative z-10">
                  <div className="flex justify-between items-baseline border-b border-white/5 pb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">추정 사업비</span>
                    <span className="text-3xl font-black text-white">
                      {Number(selectedItem.amount).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">현재 진행상태</span>
                    <span className="px-5 py-2 bg-[#3B82F6] rounded-xl text-xs font-black text-white uppercase tracking-wider shadow-lg shadow-[#3B82F6]/30">
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* 분석 리포트 영역 */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-4 bg-[#3B82F6] rounded-full shadow-[0_0_8px_#3B82F6]" />
                   <h4 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">
                     Condition Analysis
                   </h4>
                </div>
                <div className="p-8 border border-white/5 rounded-[28px] bg-[#0F172A] shadow-inner">
                  <p className="text-[15px] text-slate-300 leading-relaxed font-bold">
                    본 입찰은 <span className="text-[#3B82F6] underline underline-offset-8 decoration-2 decoration-[#3B82F6]/30">정보통신공사업 면허</span> 보유가 필수적이며, 최근 3년 내 단일 건 2억 원 이상의 준공 실적이 요구됩니다.
                  </p>
                </div>
              </div>

              {/* 하단 버튼 그룹 */}
              <div className="flex gap-4 pt-10 sticky bottom-0 bg-[#0B1224] pb-2">
                <a
                  href={selectedItem.url}
                  target="_blank"
                  className="flex-[2] flex items-center justify-center gap-3 py-5 bg-[#1E293B] border border-white/5 text-white rounded-[24px] text-[14px] font-black hover:bg-[#3B82F6] transition-all active:scale-[0.98] shadow-xl"
                >
                  공고 원문 <ExternalLink size={18} />
                </a>
                <button className="flex-1 flex items-center justify-center bg-transparent border-2 border-white/5 text-slate-500 rounded-[24px] hover:text-[#3B82F6] hover:border-[#3B82F6] transition-all">
                  <Tag size={24} />
                </button>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}