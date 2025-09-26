import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parse, differenceInDays } from "date-fns";
import type { ProjectWithDetails } from "@shared/schema";

export default function Priority() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
    refetchInterval: 10000, // 실시간 업데이트를 위해 10초마다 자동 갱신
  });

  // D-day 계산 함수
  const formatDDay = (deadline: string | null) => {
    if (!deadline) return null;
    
    try {
      const deadlineDate = parse(deadline, 'yyyy-MM-dd', new Date());
      const today = new Date();
      const diffDays = differenceInDays(deadlineDate, today);
      
      if (diffDays < 0) {
        return `D+${Math.abs(diffDays)}`;
      } else if (diffDays === 0) {
        return "D-day";
      } else {
        return `D-${diffDays}`;
      }
    } catch {
      return null;
    }
  };

  // 우선순위별로 작업을 그룹화
  const groupTasksByPriority = () => {
    if (!projects) return { "1": [], "2": [], "3": [], "4": [] };
    
    const tasksByPriority: { [key: string]: any[] } = { "1": [], "2": [], "3": [], "4": [] };
    
    // 레거시 한국어 라벨을 숫자로 변환하는 함수
    const mapLegacyToNumeric = (priority: string) => {
      switch (priority) {
        case "높음": return "1";
        case "중간": return "3";
        case "낮음": return "2";
        case "중요": return "3";
        default: return priority; // 이미 숫자이거나 기타 값
      }
    };
    
    (projects as ProjectWithDetails[]).forEach(project => {
      project.goals?.forEach(goal => {
        goal.tasks?.forEach(task => {
          const rawPriority = task.priority || "4";
          const priority = mapLegacyToNumeric(rawPriority); // 기본값은 4 (미정)
          if (tasksByPriority[priority]) {
            tasksByPriority[priority].push(task);
          }
        });
      });
    });
    
    return tasksByPriority;
  };

  const tasksByPriority = groupTasksByPriority();

  // 우선순위 섹션 설정
  const prioritySections = [
    {
      priority: "3",
      title: "2. 중요",
      bgColor: "bg-green-600",
      textColor: "text-white"
    },
    {
      priority: "1", 
      title: "1. 높음",
      bgColor: "bg-red-600",
      textColor: "text-white"
    },
    {
      priority: "4",
      title: "4. 미정", 
      bgColor: "bg-slate-600",
      textColor: "text-white"
    },
    {
      priority: "2",
      title: "3. 낮음",
      bgColor: "bg-amber-700",
      textColor: "text-white"
    }
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "완료": return "secondary";
      case "진행중": return "default";
      case "진행전": return "outline";
      case "이슈": return "destructive";
      default: return "outline";
    }
  };

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            우선순위
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            우선순위별로 작업을 관리합니다
          </p>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto flex items-center" data-testid="main-content" style={{ padding: '1rem' }}>
        <div className="flex justify-center w-full">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4" style={{ width: '1186px', height: '670px' }}>
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse" style={{ width: '581px', height: '323px' }}>
                  <CardContent className="p-6">
                    <div className="h-8 bg-muted rounded mb-4"></div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-6 bg-muted rounded"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4" style={{ width: '1186px', height: '670px' }}>
              {prioritySections.map((section) => (
                <Card key={section.priority} className="flex flex-col" style={{ width: '581px', height: '323px' }}>
                <CardHeader className={`${section.bgColor} ${section.textColor} rounded-t-lg`}>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                </CardHeader>
                <CardContent className="flex-1 p-4 overflow-auto bg-slate-800">
                  <div className="space-y-2">
                    {tasksByPriority[section.priority]?.map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-center justify-between bg-slate-700 p-2 rounded text-white text-sm"
                        data-testid={`task-${task.id}`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {/* D-day */}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            formatDDay(task.deadline)?.includes('D+') ? 'bg-red-500' : 
                            formatDDay(task.deadline) === 'D-day' ? 'bg-red-600' :
                            'bg-blue-500'
                          }`}>
                            {formatDDay(task.deadline) || '미정'}
                          </span>
                          
                          {/* 작업 이름 */}
                          <span className="font-medium truncate flex-1">
                            {task.title}
                          </span>
                          
                          {/* 진행도 (숫자만) */}
                          <span className="text-xs text-slate-300 min-w-[2rem] text-center">
                            {task.progress || 0}
                          </span>
                          
                          {/* 상태 */}
                          <Badge 
                            variant={getStatusBadgeVariant(task.status)}
                            className="text-xs px-1.5 py-0.5"
                          >
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                    )) || (
                      <div className="text-slate-400 text-sm text-center py-8">
                        해당 우선순위의 작업이 없습니다
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}