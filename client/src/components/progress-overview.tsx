import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";

// 1. Stats 객체의 타입을 정의합니다.
interface StatsData {
  total: number;
  completed: number;
}

export function ProgressOverview() {
  const { id: workspaceId } = useParams();

  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: [`/api/workspaces/${workspaceId}/stats`],
  enabled: !!workspaceId, // ID가 있을 때만 호출
});

  if (isLoading || !stats) {
    return (
      <div className="mb-8" data-testid="progress-loading">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">전체</h2>
          <span className="text-sm text-muted-foreground">로딩 중...</span>
        </div>
        <div className="flex items-center space-x-8">
          <div className="w-24 h-24 bg-muted animate-pulse rounded-full"></div>
        </div>
      </div>
    );
  }

  const total = stats.total || 0;
  const completed = stats.completed || 0;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="mb-8" data-testid="progress-overview">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" data-testid="text-total-title">
          전체
        </h2>
        <span
          className="text-sm text-muted-foreground"
          data-testid="text-progress-ratio"
        >
          {completed}/{total}
        </span>
      </div>

      <div className="flex items-center space-x-8">
        {/* Circular Progress */}
        <div className="relative w-24 h-24" data-testid="chart-progress">
          <svg className="w-24 h-24 progress-circle" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(217, 32%, 17%)"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-lg font-bold"
              data-testid="text-progress-center"
            >
              {completed}/{total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
