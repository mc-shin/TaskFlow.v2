import React, { useState } from "react";
import { Search } from "lucide-react";
// 각 카테고리별 컴포넌트 임포트 (아래에서 작성)
import BusinessDashboard from "@/pages/business-dashboard";
// import PublicIntegrated from './business/PublicIntegrated';
// import RailSpecialized from './business/RailSpecialized';
// import TelcoThree from './business/TelcoThree';
// import RegionalSpecialized from './business/RegionalSpecialized';

export default function Business() {
  const [activeTab, setActiveTab] = useState("전체");
  const categories = [
    "전체",
    "공공/통합",
    "철도 특화",
    "통신 3사",
    "지역 특화",
  ];

  // 탭에 따라 렌더링할 컴포넌트를 결정하는 함수
  const renderContent = () => {
    switch (activeTab) {
      case "전체":
        return (
          <BusinessDashboard onCardClick={(name: any) => setActiveTab(name)} />
        );

      // 주석 처리된 부분들을 나중에 해제할 때도 props 관리가 필요합니다.
      // case "공공/통합": return <PublicIntegrated />;

      default:
        return (
          <BusinessDashboard onCardClick={(name: any) => setActiveTab(name)} />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-xl font-semibold">지원사업 통합 조회</h1>
          <p className="text-sm text-muted-foreground">
            현재 공고 중인 다양한 지원사업 정보를 한곳에서 확인하고 탐색하세요
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="통합 검색..."
              className="pl-9 h-10 w-[250px] rounded-md border border-input bg-background text-sm"
            />
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="bg-card border-b border-border px-6 py-2 flex gap-2 overflow-x-auto">
        {categories.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 선택된 탭에 따른 컴포넌트 렌더링 */}
      <main className="flex-1 overflow-auto">{renderContent()}</main>
    </div>
  );
}
