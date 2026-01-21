import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import type { Meeting } from "@shared/schema";
import { useParams } from "wouter";
import api from "@/api/api-index";

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const { id: workspaceId } = useParams();

  // 실제 미팅 데이터 가져오기
  const {
    data: meetings = [],
    isLoading,
    isError,
  } = useQuery<Meeting[]>({
    // 쿼리 키에 workspaceId를 추가하여 워크스페이스별로 캐시 분리
    queryKey: ["/api/workspaces", workspaceId, "meetings"],

    queryFn: async () => {
      // 백엔드의 워크스페이스별 미팅 조회 엔드포인트 호출
      const response = await api.get(`/api/workspaces/${workspaceId}/meetings`);
      return response.data;
    },

    // workspaceId가 있을 때만 실행
    enabled: !!workspaceId,

    staleTime: 300000, // 5분
  });

  // 미팅 데이터를 날짜별로 그룹화 (로컬 시간대 사용)
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const d = new Date(meeting.startAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 날짜별 미팅 확인 함수
  const getMeetingsForDate = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return groupedMeetings[dateString] || [];
  };

  // 선택된 날짜의 미팅
  const selectedDateMeetings = getMeetingsForDate(selectedDate);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  const generateCalendarDays = () => {
    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year;
      days.push({
        day,
        isCurrentMonth: true,
        isToday,
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <Card data-testid="calendar-widget">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-center">
          {/* <h3 className="text-lg font-semibold" data-testid="text-calendar-title">한국</h3> */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("prev")}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
            <span
              className="text-sm font-medium"
              data-testid="text-current-month"
            >
              {year}년 {monthNames[month]}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("next")}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pt-4 pb-0">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-muted-foreground">
              달력 데이터를 불러오는 중...
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-muted-foreground">
              데이터를 불러올 수 없습니다
            </div>
          </div>
        )}
      </CardContent>
      <CardContent>
        {!isLoading && !isError && (
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
              {calendarDays.map((dayInfo, index) => {
                const dayMeetings = dayInfo.isCurrentMonth
                  ? getMeetingsForDate(dayInfo.day)
                  : [];
                const hasMeetings = dayMeetings.length > 0;

                return (
                  <button
                    key={index}
                    className={`
                  calendar-day text-center text-sm p-2 cursor-pointer rounded transition-colors relative
                  ${!dayInfo.isCurrentMonth ? "text-muted-foreground" : ""}
                  ${
                    selectedDate === dayInfo.day && dayInfo.isCurrentMonth
                      ? "bg-primary text-primary-foreground font-medium"
                      : ""
                  }
                  ${dayInfo.isToday ? "bg-accent" : ""}
                  hover:bg-primary hover:text-primary-foreground
                `}
                    onClick={() =>
                      dayInfo.isCurrentMonth && setSelectedDate(dayInfo.day)
                    }
                    data-testid={`calendar-day-${dayInfo.day}-${
                      dayInfo.isCurrentMonth ? "current" : "other"
                    }`}
                  >
                    {dayInfo.day}
                    {/* 미팅 인디케이터 */}
                    {hasMeetings && dayInfo.isCurrentMonth && (
                      <div
                        className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"
                        data-testid={`meeting-indicator-${dayInfo.day}`}
                      ></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Event - 미팅이 있을 때만 표시 */}
            {selectedDateMeetings.length > 0 && (
              <div
                className="mt-6 border-border space-y-2 max-h-[403.5px] overflow-y-auto"
                data-testid="selected-date-events"
              >
                <div className="space-y-2">
                  {selectedDateMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="w-[calc(100%)] p-4 bg-muted rounded-lg"
                      data-testid={`selected-date-event-${meeting.id}`}
                    >
                      <div
                        className="flex items-center space-x-2 text-xs text-muted-foreground"
                        data-testid={`text-selected-date-${meeting.id}`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          {year}.{String(month + 1).padStart(2, "0")}.
                          {String(selectedDate).padStart(2, "0")}{" "}
                          {new Date(meeting.startAt).toLocaleTimeString(
                            "ko-KR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      </div>
                      <div
                        className="text-sm font-medium mt-1"
                        data-testid={`text-event-title-${meeting.id}`}
                      >
                        {meeting.title}
                      </div>
                      {meeting.description && (
                        <div
                          className="text-xs text-muted-foreground mt-1"
                          data-testid={`text-event-description-${meeting.id}`}
                        >
                          {meeting.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {[
                          meeting.location,
                          meeting.endAt &&
                            `${Math.round(
                              (new Date(meeting.endAt).getTime() -
                                new Date(meeting.startAt).getTime()) /
                                (1000 * 60)
                            )}분`,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 미팅이 없는 날에 대한 메시지 */}
            {selectedDateMeetings.length === 0 && !isLoading && (
              <div
                className="min-h-[108px] flex flex-col justify-center mt-6 pt-4 border-t border-border p-3 bg-muted/50 rounded-lg text-center"
                data-testid="no-events-message"
              >
                <div className="text-xs text-muted-foreground mt-4">
                  {year}.{String(month + 1).padStart(2, "0")}.
                  {String(selectedDate).padStart(2, "0")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  예정된 일정이 없습니다.
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
