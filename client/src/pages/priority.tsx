import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parse, differenceInDays } from "date-fns";
import type { ProjectWithDetails } from "@shared/schema";

export default function Priority() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
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
    
    (projects as ProjectWithDetails[]).forEach(project => {
      project.goals?.forEach(goal => {
        goal.tasks?.forEach(task => {
          const priority = task.priority || "4"; // 기본값은 4 (미정)
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
      title: "3. 긴급하지 않지만 중요한 일",
      bgColor: "bg-green-600",
      textColor: "text-white"
    },
    {
      priority: "1", 
      title: "1. 긴급하고 중요한 일",
      bgColor: "bg-red-600",
      textColor: "text-white"
    },
    {
      priority: "4",
      title: "4. 긴급하지도 중요하지도 않은 일", 
      bgColor: "bg-slate-600",
      textColor: "text-white"
    },
    {
      priority: "2",
      title: "2. 긴급하지만 중요하지 않은 일",
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
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 h-full">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse h-96">
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
          <div className="grid grid-cols-2 gap-6 h-full">
            {prioritySections.map((section) => (
              <Card key={section.priority} className="flex flex-col h-96">
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
                            {formatDDay(task.deadline) || 'D-∞'}
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
        
        {/* 하단 타임라인 */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4">
          <div className="flex justify-between items-center text-white">
            <span className="text-sm">D-30</span>
            <div className="flex-1 mx-4 h-px bg-slate-600"></div>
            <span className="text-sm">D-7</span>
            <div className="flex-1 mx-4 h-px bg-slate-600"></div>
            <span className="text-sm text-red-400 font-medium">D-day</span>
          </div>
        </div>
      </main>
    </>
  );
}