import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(18); // Default to 18th as shown in design

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
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
          {calendarDays.map((dayInfo, index) => (
            <button
              key={index}
              className={`
                calendar-day text-center text-sm p-2 cursor-pointer rounded transition-colors
                ${!dayInfo.isCurrentMonth ? 'text-muted-foreground' : ''}
                ${selectedDate === dayInfo.day && dayInfo.isCurrentMonth ? 'bg-primary text-primary-foreground font-medium' : ''}
                ${dayInfo.isToday ? 'bg-accent' : ''}
                hover:bg-primary hover:text-primary-foreground
              `}
              onClick={() => dayInfo.isCurrentMonth && setSelectedDate(dayInfo.day)}
              data-testid={`calendar-day-${dayInfo.day}-${dayInfo.isCurrentMonth ? 'current' : 'other'}`}
            >
              {dayInfo.day}
            </button>
          ))}
        </div>
        
        {/* Selected Date Event */}
        <div className="mt-4 p-3 bg-muted rounded-lg" data-testid="selected-date-event">
          <div className="text-xs text-muted-foreground" data-testid="text-selected-date">
            {year}.{String(month + 1).padStart(2, '0')}.{String(selectedDate).padStart(2, '0')} 20:00
          </div>
          <div className="text-sm font-medium mt-1" data-testid="text-event-title">
            스팸티브 어린이
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
