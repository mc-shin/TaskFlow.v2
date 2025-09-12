import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, Video, Plus, MapPin } from "lucide-react";

export default function Meeting() {
  const [activeTab, setActiveTab] = useState("upcoming");

  // Mock data for meetings
  const meetings = {
    upcoming: [
      {
        id: "1",
        title: "주간 스프린트 리뷰",
        description: "이번 주 진행된 작업들을 검토하고 다음 주 계획을 논의합니다.",
        date: "2024-01-15",
        time: "14:00",
        duration: "60분",
        type: "화상회의",
        location: "Zoom",
        attendees: [
          { id: "1", name: "전혜진", initials: "전" },
          { id: "2", name: "김철수", initials: "김" },
          { id: "3", name: "이영희", initials: "이" }
        ],
        status: "예정"
      },
      {
        id: "2",
        title: "클라이언트 미팅",
        description: "프로젝트 진행 상황을 클라이언트에게 보고합니다.",
        date: "2024-01-16",
        time: "10:00",
        duration: "90분",
        type: "대면회의",
        location: "회의실 A",
        attendees: [
          { id: "1", name: "전혜진", initials: "전" },
          { id: "4", name: "박민수", initials: "박" }
        ],
        status: "예정"
      }
    ],
    today: [
      {
        id: "3",
        title: "데일리 스탠드업",
        description: "오늘의 작업 계획과 이슈를 공유합니다.",
        date: "2024-01-12",
        time: "09:30",
        duration: "30분",
        type: "화상회의",
        location: "Google Meet",
        attendees: [
          { id: "1", name: "전혜진", initials: "전" },
          { id: "2", name: "김철수", initials: "김" },
          { id: "3", name: "이영희", initials: "이" },
          { id: "5", name: "정수빈", initials: "정" }
        ],
        status: "진행중"
      }
    ],
    past: [
      {
        id: "4",
        title: "프로젝트 킥오프",
        description: "새 프로젝트의 목표와 일정을 논의했습니다.",
        date: "2024-01-10",
        time: "15:00",
        duration: "120분",
        type: "대면회의",
        location: "회의실 B",
        attendees: [
          { id: "1", name: "전혜진", initials: "전" },
          { id: "2", name: "김철수", initials: "김" },
          { id: "3", name: "이영희", initials: "이" },
          { id: "4", name: "박민수", initials: "박" },
          { id: "5", name: "정수빈", initials: "정" }
        ],
        status: "완료"
      }
    ]
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "예정":
        return <Badge variant="secondary">예정</Badge>;
      case "진행중":
        return <Badge variant="default">진행중</Badge>;
      case "완료":
        return <Badge variant="outline">완료</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMeetingIcon = (type: string) => {
    return type === "화상회의" ? 
      <Video className="w-4 h-4 text-blue-500" /> : 
      <MapPin className="w-4 h-4 text-green-500" />;
  };

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            미팅
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            회의 일정을 관리합니다
          </p>
        </div>
        <Button data-testid="button-add-meeting">
          <Plus className="w-4 h-4 mr-2" />
          새 미팅 추가
        </Button>
      </header>
      
      <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-fit grid-cols-3 mb-6">
            <TabsTrigger value="today" data-testid="tab-today">
              오늘
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              예정된 미팅
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              지난 미팅
            </TabsTrigger>
          </TabsList>
          
          {/* 오늘의 미팅 */}
          <TabsContent value="today" data-testid="content-today">
            <div className="space-y-4">
              {meetings.today.map((meeting) => (
                <Card 
                  key={meeting.id} 
                  className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500"
                  data-testid={`card-meeting-${meeting.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`text-meeting-title-${meeting.id}`}>
                        {meeting.title}
                      </CardTitle>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{meeting.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(meeting.date)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{meeting.time} ({meeting.duration})</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getMeetingIcon(meeting.type)}
                        <span className="text-sm">{meeting.location}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{meeting.attendees.length}명 참석</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">참석자:</span>
                        <div className="flex -space-x-1">
                          {meeting.attendees.slice(0, 4).map((attendee) => (
                            <Avatar key={attendee.id} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {attendee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.attendees.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">+{meeting.attendees.length - 4}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm" data-testid={`button-join-${meeting.id}`}>
                        참여하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* 예정된 미팅 */}
          <TabsContent value="upcoming" data-testid="content-upcoming">
            <div className="space-y-4">
              {meetings.upcoming.map((meeting) => (
                <Card 
                  key={meeting.id} 
                  className="hover:shadow-lg transition-shadow duration-200"
                  data-testid={`card-meeting-${meeting.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`text-meeting-title-${meeting.id}`}>
                        {meeting.title}
                      </CardTitle>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{meeting.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(meeting.date)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{meeting.time} ({meeting.duration})</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getMeetingIcon(meeting.type)}
                        <span className="text-sm">{meeting.location}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{meeting.attendees.length}명 참석 예정</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">참석자:</span>
                        <div className="flex -space-x-1">
                          {meeting.attendees.slice(0, 4).map((attendee) => (
                            <Avatar key={attendee.id} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {attendee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.attendees.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">+{meeting.attendees.length - 4}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" data-testid={`button-edit-${meeting.id}`}>
                          수정
                        </Button>
                        <Button variant="default" size="sm" data-testid={`button-details-${meeting.id}`}>
                          자세히
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* 지난 미팅 */}
          <TabsContent value="past" data-testid="content-past">
            <div className="space-y-4">
              {meetings.past.map((meeting) => (
                <Card 
                  key={meeting.id} 
                  className="hover:shadow-lg transition-shadow duration-200 opacity-75"
                  data-testid={`card-meeting-${meeting.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`text-meeting-title-${meeting.id}`}>
                        {meeting.title}
                      </CardTitle>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{meeting.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(meeting.date)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{meeting.time} ({meeting.duration})</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getMeetingIcon(meeting.type)}
                        <span className="text-sm">{meeting.location}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{meeting.attendees.length}명 참석했음</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">참석자:</span>
                        <div className="flex -space-x-1">
                          {meeting.attendees.slice(0, 4).map((attendee) => (
                            <Avatar key={attendee.id} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {attendee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.attendees.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">+{meeting.attendees.length - 4}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm" data-testid={`button-summary-${meeting.id}`}>
                        회의록 보기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}