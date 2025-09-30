import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit, CheckCircle, Clock } from "lucide-react";
import type { ActivityWithDetails } from "@shared/schema";

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery<ActivityWithDetails[]>({
    queryKey: ["/api/activities"],
    refetchInterval: 3000,
  });

  const getActivityIcon = (description: string) => {
    if (description.includes("생성")) return <Edit className="h-3 w-3 text-primary-foreground" />;
    if (description.includes("완료")) return <CheckCircle className="h-3 w-3 text-white" />;
    return <Clock className="h-3 w-3 text-primary-foreground" />;
  };

  const getActivityIconBg = (description: string) => {
    if (description.includes("완료")) return "bg-green-500";
    return "bg-primary";
  };

  const formatTimeAgo = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  };

  if (isLoading) {
    return (
      <Card data-testid="activity-feed-loading">
        <CardHeader className="border-b border-border">
          <h3 className="text-lg font-semibold">최근 활동</h3>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-muted animate-pulse rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="activity-feed">
      <CardHeader className="border-b border-border">
        <h3 className="text-lg font-semibold" data-testid="text-activity-title">최근 활동</h3>
      </CardHeader>
      <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {activities?.map((activity: ActivityWithDetails) => (
          <div 
            key={activity.id} 
            className="flex items-start space-x-3"
            data-testid={`activity-item-${activity.id}`}
          >
            <div className={`w-8 h-8 ${getActivityIconBg(activity.description)} rounded-full flex items-center justify-center flex-shrink-0`}>
              {getActivityIcon(activity.description)}
            </div>
            <div className="flex-1">
              <p className="text-sm" data-testid={`text-activity-description-${activity.id}`}>
                <span className="font-medium">{activity.user?.name || "사용자"}</span>님이 {activity.description}{" "}
                <span className="text-primary">{formatTimeAgo(activity.createdAt!)}</span>
              </p>
              {activity.task && (
                <p className="text-xs text-muted-foreground" data-testid={`text-activity-task-${activity.id}`}>
                  {activity.task.title}
                </p>
              )}
            </div>
          </div>
        ))}
        
        {(!activities || activities.length === 0) && (
          <div className="text-center text-muted-foreground py-8" data-testid="text-empty-activities">
            최근 활동이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
