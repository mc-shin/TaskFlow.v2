import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(18); // Default to 18th as shown in design

  // 미팅 데이터 (meeting.tsx와 동일한 구조)
  const meetings = {
    upcoming: [
      {
        id: "1",
        title: "주간 스프린트 리뷰",
        description: "이번 주 진행된 작업들을 검토하고 다음 주 계획을 논의합니다.",
        date: "2025-09-15",
        time: "14:00",
        duration: "60분",
        type: "화상회의",
        location: "Zoom",
        status: "예정"
      },
      {
        id: "2",
        title: "클라이언트 미팅",
        description: "프로젝트 진행 상황을 클라이언트에게 보고합니다.",
        date: "2025-09-16",
        time: "10:00",
        duration: "90분",
        type: "대면회의",
        location: "회의실 A",
        status: "예정"
      }
    ],
    today: [
      {
        id: "3",
        title: "데일리 스탠드업",
        description: "오늘의 작업 계획과 이슈를 공유합니다.",
        date: "2025-09-12",
        time: "09:30",
        duration: "30분",
        type: "화상회의",
        location: "Google Meet",
        status: "진행중"
      }
    ],
    past: [
      {
        id: "4",
        title: "프로젝트 킥오프",
        description: "새 프로젝트의 목표와 일정을 논의했습니다.",
        date: "2025-09-10",
        time: "15:00",
        duration: "120분",
        type: "대면회의",
        location: "회의실 B",
        status: "완료"
      },
      {
        id: "5",
        title: "스팸티브 어린이",
        description: "특별 미팅입니다.",
        date: "2025-09-18",
        time: "20:00",
        duration: "30분",
        type: "화상회의",
        location: "Zoom",
        status: "완료"
      }
    ]
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 모든 미팅을 하나의 배열로 합치기
  const allMeetings = [...meetings.upcoming, ...meetings.today, ...meetings.past];

  // 날짜별 미팅 확인 함수
  const getMeetingsForDate = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allMeetings.filter(meeting => meeting.date === dateString);
  };

  // 선택된 날짜의 미팅
  const selectedDateMeetings = getMeetingsForDate(selectedDate);
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
  ];
  
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month + (direction === 'next' ? 1 : -1));
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
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" data-testid="text-calendar-title">한국</h3>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigateMonth('prev')}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
            <span className="text-sm font-medium" data-testid="text-current-month">
              {year}년 {monthNames[month]}
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigateMonth('next')}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
          {calendarDays.map((dayInfo, index) => {
            const dayMeetings = dayInfo.isCurrentMonth ? getMeetingsForDate(dayInfo.day) : [];
            const hasMeetings = dayMeetings.length > 0;
            
            return (
              <button
                key={index}
                className={`
                  calendar-day text-center text-sm p-2 cursor-pointer rounded transition-colors relative
                  ${!dayInfo.isCurrentMonth ? 'text-muted-foreground' : ''}
                  ${selectedDate === dayInfo.day && dayInfo.isCurrentMonth ? 'bg-primary text-primary-foreground font-medium' : ''}
                  ${dayInfo.isToday ? 'bg-accent' : ''}
                  hover:bg-primary hover:text-primary-foreground
                `}
                onClick={() => dayInfo.isCurrentMonth && setSelectedDate(dayInfo.day)}
                data-testid={`calendar-day-${dayInfo.day}-${dayInfo.isCurrentMonth ? 'current' : 'other'}`}
              >
                {dayInfo.day}
                {/* 미팅 인디케이터 */}
                {hasMeetings && dayInfo.isCurrentMonth && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" data-testid={`meeting-indicator-${dayInfo.day}`}></div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Selected Date Event - 미팅이 있을 때만 표시 */}
        {selectedDateMeetings.length > 0 && (
          <div className="mt-4 space-y-2" data-testid="selected-date-events">
            {selectedDateMeetings.map((meeting) => (
              <div key={meeting.id} className="p-3 bg-muted rounded-lg" data-testid={`selected-date-event-${meeting.id}`}>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground" data-testid={`text-selected-date-${meeting.id}`}>
                  <Clock className="w-3 h-3" />
                  <span>
                    {year}.{String(month + 1).padStart(2, '0')}.{String(selectedDate).padStart(2, '0')} {meeting.time}
                  </span>
                </div>
                <div className="text-sm font-medium mt-1" data-testid={`text-event-title-${meeting.id}`}>
                  {meeting.title}
                </div>
                {meeting.description && (
                  <div className="text-xs text-muted-foreground mt-1" data-testid={`text-event-description-${meeting.id}`}>
                    {meeting.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {meeting.location} • {meeting.duration}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 미팅이 없는 날에 대한 메시지 */}
        {selectedDateMeetings.length === 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center" data-testid="no-events-message">
            <div className="text-xs text-muted-foreground">
              {year}.{String(month + 1).padStart(2, '0')}.{String(selectedDate).padStart(2, '0')}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              예정된 일정이 없습니다.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
