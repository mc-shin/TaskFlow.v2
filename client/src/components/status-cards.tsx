import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "wouter";

export function StatusCards() {
  const { id: workspaceId } = useParams();

  const { data: stats, isLoading } = useQuery<{[key: string]: number}>({
    queryKey: [`/api/workspaces/${workspaceId}/stats`],
    // refetchInterval: 10000,
  });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-8" data-testid="status-cards-loading">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statusConfig = [
    { key: "진행전", label: "진행전", color: "gray", bgColor: "bg-gray-500" },
    { key: "진행중", label: "진행중", color: "blue", bgColor: "bg-blue-500" },
    { key: "완료", label: "완료", color: "green", bgColor: "bg-green-500" },
    { key: "이슈", label: "이슈", color: "red", bgColor: "bg-red-500" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-8" data-testid="status-cards">
      {statusConfig.map((status) => (
        <Card 
          key={status.key}
          className="status-card cursor-pointer hover:shadow-lg transition-all duration-200"
          data-testid={`card-status-${status.key}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{status.label}</span>
              <span className={`${status.bgColor} text-white text-xs px-2 py-1 rounded`}>
                {stats[status.key] || 0}
              </span>
            </div>
            <div className={`text-2xl font-bold text-${status.color}-500`}>
              {stats[status.key] || 0}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
