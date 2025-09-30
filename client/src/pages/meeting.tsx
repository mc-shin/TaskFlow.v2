import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Video, Plus, MapPin, Square } from "lucide-react";
import { Link, useLocation } from "wouter";
import { RealtimeClock } from "@/components/realtime-clock";
import type { Meeting, SafeUser } from "@shared/schema";

export default function Meeting() {
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = this week, 1 = next week, etc.
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setLocation] = useLocation();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll to current time on page load
  useEffect(() => {
    const scrollToCurrentTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Find the time slot element for current hour
      const timeSlotElement = document.querySelector(`[data-testid="row-time-${currentHour.toString().padStart(2, '0')}:00"]`);
      
      if (timeSlotElement) {
        timeSlotElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    };

    // Delay scroll to ensure elements are rendered
    const timer = setTimeout(scrollToCurrentTime, 100);
    
    return () => clearTimeout(timer);
  }, []); // Only run on mount

  // Fetch meetings data
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
  });

  // Fetch users for participant avatars (workspace members only)
  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ['/api/users?workspace=true'],
  });

  // Get current week dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay() + selectedWeek * 7);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedWeek]);

  // Time slots for the calendar (00:00 - 24:00)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Get meetings for a specific date and time slot
  const getMeetingsForSlot = (date: Date, timeSlot: string) => {
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const [hour] = timeSlot.split(':').map(Number);
    
    // Calculate slot start and end times in milliseconds
    const slotStartTime = new Date(targetDate);
    slotStartTime.setHours(hour, 0, 0, 0);
    const slotEndTime = new Date(slotStartTime.getTime() + 60 * 60 * 1000);
    
    return meetings.filter(meeting => {
      const meetingStart = new Date(meeting.startAt);
      const meetingEnd = meeting.endAt ? new Date(meeting.endAt) : new Date(meetingStart.getTime() + 60 * 60 * 1000); // Default 1 hour
      const meetingDate = new Date(meetingStart.getFullYear(), meetingStart.getMonth(), meetingStart.getDate());
      
      // Check if meeting is on the same date
      if (targetDate.getTime() !== meetingDate.getTime()) return false;
      
      // Check if meeting overlaps with this hour slot using timestamps
      return meetingStart.getTime() < slotEndTime.getTime() && meetingEnd.getTime() > slotStartTime.getTime();
    });
  };

  // Get today's meetings
  const todaysMeetings = useMemo(() => {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return meetings.filter(meeting => {
      const meetingStart = new Date(meeting.startAt);
      const meetingDate = new Date(meetingStart.getFullYear(), meetingStart.getMonth(), meetingStart.getDate());
      return todayDate.getTime() === meetingDate.getTime();
    });
  }, [meetings]);

  // Get meeting color based on title
  const getMeetingColor = (title: string) => {
    return title.toLowerCase().includes('스탠드업') || title.toLowerCase().includes('standup') 
      ? 'bg-blue-500' : 'bg-yellow-500';
  };

  // Get user by ID
  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  // Calculate current time line position
  const getCurrentTimeLine = () => {
    const now = currentTime;
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find today's column index
    const todayColumnIndex = weekDates.findIndex(date => {
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return dateOnly.getTime() === todayDate.getTime();
    });

    if (todayColumnIndex === -1) return null; // Today is not in current week view

    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Show time line for all hours (00:00 - 23:59)
    const hourSlotIndex = currentHour; // Direct mapping for 24-hour display
    const minutePercentage = currentMinutes / 60; // 0-1 percentage within the hour
    
    return {
      columnIndex: todayColumnIndex,
      hourSlotIndex,
      minutePercentage,
      timeString: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const currentTimeLine = getCurrentTimeLine();

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">
              미팅
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
              팀 미팅과 일정을 관리하고 참여자를 확인할 수 있습니다
            </p>
          </div>
          
          <div className="flex items-center space-x-4">

            {/* Participant Avatars */}
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-1">
                {users.slice(0, 5).map((user) => (
                  <Avatar key={user.id} className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {users.length > 5 && (
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      +{users.length - 5}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
            
            {/* Real-time Clock */}
            <RealtimeClock />
            
            {/* New Meeting Button */}
            <Link href="/workspace/app/meeting/new">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-new-meeting"
              >
                <Plus className="w-4 h-4 mr-2" />
                새 미팅
              </Button>
            </Link>
          </div>
        </header>

        {/* Weekly Calendar Grid */}
        <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
          {/* Calendar Week Navigation */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedWeek(selectedWeek - 1)}
              data-testid="button-prev-week"
            >
              ←
            </Button>
            <span className="text-sm font-medium" data-testid="text-current-week">
              {weekDates[0]?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} - {weekDates[6]?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedWeek(selectedWeek + 1)}
              data-testid="button-next-week"
            >
              →
            </Button>
          </div>
          
          <div className="bg-card rounded-lg border border-border overflow-hidden relative">
            {/* Calendar Header */}
            <div className="grid grid-cols-8 bg-muted">
              <div className="p-3 border-r border-border font-medium text-sm">시간</div>
              {weekDates.map((date, index) => (
                <div 
                  key={index} 
                  className="p-3 border-r border-border last:border-r-0 text-center"
                  data-testid={`header-date-${index}`}
                >
                  <div className="font-medium text-sm">
                    {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-semibold">
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="divide-y divide-border">
              {timeSlots.map((timeSlot, slotIndex) => (
                <div 
                  key={timeSlot} 
                  className="grid grid-cols-8 min-h-[60px] relative"
                  data-testid={`row-time-${timeSlot}`}
                >
                  {/* Current Time Line */}
                  {currentTimeLine && currentTimeLine.hourSlotIndex === slotIndex && (
                    <div 
                      className="absolute left-0 right-0 z-10 flex items-center"
                      style={{
                        top: `${currentTimeLine.minutePercentage * 100}%`,
                        transform: 'translateY(-50%)'
                      }}
                    >
                      {/* Time indicator in the time column */}
                      <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-l z-20 whitespace-nowrap">
                        {currentTimeLine.timeString}
                      </div>
                      {/* Red line across all calendar columns */}
                      <div className="bg-red-500 h-0.5 flex-1" />
                    </div>
                  )}
                  
                  {/* Time Column */}
                  <div className="p-3 border-r border-border bg-muted/50 flex items-center justify-center">
                    <span className="text-sm font-medium">{timeSlot}</span>
                  </div>
                  
                  {/* Date Columns */}
                  {weekDates.map((date, dateIndex) => {
                    const slotMeetings = getMeetingsForSlot(date, timeSlot);
                    return (
                      <div 
                        key={dateIndex} 
                        className="p-1 border-r border-border last:border-r-0 relative min-h-[60px]"
                        data-testid={`cell-${dateIndex}-${timeSlot}`}
                      >
                        {slotMeetings.map((meeting) => {
                          const meetingStart = new Date(meeting.startAt);
                          const meetingEnd = meeting.endAt ? new Date(meeting.endAt) : new Date(meetingStart.getTime() + 60 * 60 * 1000); // Default 1 hour
                          
                          // Calculate start and end times for this slot
                          const slotStartTime = new Date(date);
                          slotStartTime.setHours(parseInt(timeSlot.split(':')[0]), 0, 0, 0);
                          const slotEndTime = new Date(slotStartTime.getTime() + 60 * 60 * 1000);
                          
                          // Calculate overlap with this slot
                          const overlapStart = Math.max(meetingStart.getTime(), slotStartTime.getTime());
                          const overlapEnd = Math.min(meetingEnd.getTime(), slotEndTime.getTime());
                          
                          // Calculate position and height as percentage of slot
                          const topOffset = ((overlapStart - slotStartTime.getTime()) / (60 * 60 * 1000)) * 100;
                          const height = ((overlapEnd - overlapStart) / (60 * 60 * 1000)) * 100;
                          
                          return (
                            <div
                              key={meeting.id}
                              className={`
                                absolute left-1 right-1 rounded p-1 text-white text-xs font-medium
                                cursor-pointer hover:opacity-80 transition-opacity
                                ${getMeetingColor(meeting.title)}
                              `}
                              style={{
                                top: `${topOffset}%`,
                                height: `${height}%`,
                                minHeight: '30px' // Ensure minimum visibility for 2 lines
                              }}
                              data-testid={`meeting-block-${meeting.id}`}
                              title={`${meeting.title} - ${meeting.location || '위치 미정'} (${meetingStart.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${meetingEnd ? meetingEnd.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '종료시간 미정'})`}
                              onClick={() => {
                                setLocation(`/workspace/app/meeting/${meeting.id}`);
                              }}
                            >
                              <div className="truncate leading-tight">{meeting.title}</div>
                              <div className="truncate text-xs opacity-90 leading-tight">
                                {meetingStart.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Today's Meetings Section */}
          <div className="mt-6 pt-6 border-t border-border">
            <h2 className="text-lg font-semibold mb-4" data-testid="text-todays-meetings">
              오늘의 미팅
            </h2>
            
            {isLoading ? (
              <div className="flex space-x-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 w-48 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : todaysMeetings.length > 0 ? (
              <div className="flex space-x-3 overflow-x-auto">
                {todaysMeetings.map((meeting) => (
                  <Card 
                    key={meeting.id} 
                    className="p-3 hover:bg-accent cursor-pointer transition-colors min-w-48 flex-shrink-0"
                    data-testid={`card-today-meeting-${meeting.id}`}
                    onClick={() => setLocation(`/workspace/app/meeting/${meeting.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm truncate" data-testid={`text-meeting-title-${meeting.id}`}>
                        {meeting.title}
                      </h3>
                      <div className={`w-3 h-3 rounded-full ${getMeetingColor(meeting.title)}`} />
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(meeting.startAt).toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      {meeting.location && (
                        <>
                          <span className="mx-2">•</span>
                          <MapPin className="w-3 h-3 mr-1" />
                          {meeting.location}
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">오늘 예정된 미팅이 없습니다.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}