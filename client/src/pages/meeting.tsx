import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Video, Plus, MapPin, Square } from "lucide-react";
import { RealtimeClock } from "@/components/realtime-clock";
import type { Meeting, SafeUser } from "@shared/schema";

export default function Meeting() {
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = this week, 1 = next week, etc.

  // Fetch meetings data
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
  });

  // Fetch users for participant avatars
  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ['/api/users'],
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

  // Time slots for the calendar (9am - 6pm)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      slots.push(`${hour}:00`);
    }
    return slots;
  }, []);

  // Get meetings for a specific date and time slot
  const getMeetingsForSlot = (date: Date, timeSlot: string) => {
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const [hour] = timeSlot.split(':').map(Number);
    
    return meetings.filter(meeting => {
      const meetingStart = new Date(meeting.startAt);
      const meetingDate = new Date(meetingStart.getFullYear(), meetingStart.getMonth(), meetingStart.getDate());
      const meetingHour = meetingStart.getHours();
      
      // Check if meeting is on the same date and within the hour slot
      return targetDate.getTime() === meetingDate.getTime() && meetingHour === hour;
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

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-80 bg-card border-r border-border p-6 flex flex-col">
        {/* Meeting Stop Button */}
        <Button 
          variant="destructive" 
          className="w-full mb-6"
          data-testid="button-stop-meeting"
        >
          <Square className="w-4 h-4 mr-2" />
          미팅 중지?
        </Button>

        {/* Today's Meetings */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-4" data-testid="text-todays-meetings">
            오늘의 미팅
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : todaysMeetings.length > 0 ? (
            <div className="space-y-3">
              {todaysMeetings.map((meeting) => (
                <Card 
                  key={meeting.id} 
                  className="p-3 hover:bg-accent cursor-pointer transition-colors"
                  data-testid={`card-today-meeting-${meeting.id}`}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold" data-testid="header-title">
              미팅 일정
            </h1>
            <div className="flex items-center space-x-2">
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-8 h-8 rounded-full p-0"
                  data-testid="button-add-participant"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Real-time Clock */}
            <RealtimeClock />
            
            <Button data-testid="button-add-meeting">
              <Plus className="w-4 h-4 mr-2" />
              새 미팅
            </Button>
          </div>
        </header>

        {/* Weekly Calendar Grid */}
        <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
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
              {timeSlots.map((timeSlot) => (
                <div 
                  key={timeSlot} 
                  className="grid grid-cols-8 min-h-[60px]"
                  data-testid={`row-time-${timeSlot}`}
                >
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
                          const meetingEnd = new Date(meeting.endAt);
                          const startMinutes = meetingStart.getMinutes();
                          const duration = (meetingEnd.getTime() - meetingStart.getTime()) / (1000 * 60); // duration in minutes
                          
                          // Calculate position within the hour slot
                          const topOffset = (startMinutes / 60) * 100; // percentage from top of hour
                          const height = Math.min((duration / 60) * 100, 100 - topOffset); // percentage height, max to end of hour
                          
                          return (
                            <div
                              key={meeting.id}
                              className={`
                                absolute left-1 right-1 rounded p-2 text-white text-xs font-medium
                                cursor-pointer hover:opacity-80 transition-opacity
                                ${getMeetingColor(meeting.title)}
                              `}
                              style={{
                                top: `${topOffset}%`,
                                height: `${height}%`,
                                minHeight: '20px' // Ensure minimum visibility
                              }}
                              data-testid={`meeting-block-${meeting.id}`}
                              title={`${meeting.title} - ${meeting.location || '위치 미정'} (${meetingStart.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${meetingEnd.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`}
                            >
                              <div className="truncate">{meeting.title}</div>
                              {meeting.location && (
                                <div className="truncate text-xs opacity-75">
                                  {meeting.location}
                                </div>
                              )}
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
        </main>
      </div>
    </div>
  );
}