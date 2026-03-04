import React, { useState } from "react";
import { Search } from "lucide-react";
// 각 카테고리별 컴포넌트 임포트 (아래에서 작성)
import BusinessDashboard from "@/pages/business-dashboard";

export default function Business() {

  // 탭에 따라 렌더링할 컴포넌트를 결정하는 함수
  const renderContent = () => {
    return <BusinessDashboard />;
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
      </header>

      {/* 선택된 탭에 따른 컴포넌트 렌더링 */}
      <main className="flex-1 min-h-0 overflow-hidden">{renderContent()}</main>
    </div>
  );
}
