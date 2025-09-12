import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Users, Video, Plus, MapPin, Square } from "lucide-react";
import { RealtimeClock } from "@/components/realtime-clock";
import type { Meeting, SafeUser } from "@shared/schema";

export default function Meeting() {
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = this week, 1 = next week, etc.
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Mutations for participant management
  const addParticipantMutation = useMutation({
    mutationFn: ({ meetingId, userId }: { meetingId: string; userId: string }) => {
      console.log('Adding participant API call:', { meetingId, userId });
      return apiRequest('POST', `/api/meetings/${meetingId}/attendees`, { userId });
    },
    onSuccess: (data) => {
      console.log('Add participant success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
    },
    onError: (error) => {
      console.error('Add participant error:', error);
    }
  });

  const removeParticipantMutation = useMutation({
    mutationFn: ({ meetingId, userId }: { meetingId: string; userId: string }) => {
      console.log('Removing participant API call:', { meetingId, userId });
      return apiRequest('DELETE', `/api/meetings/${meetingId}/attendees/${userId}`);
    },
    onSuccess: (data) => {
      console.log('Remove participant success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
    },
    onError: (error) => {
      console.error('Remove participant error:', error);
    }
  });

  // Get selected meeting
  const selectedMeeting = selectedMeetingId ? meetings.find(m => m.id === selectedMeetingId) : null;

  // Handle participant toggle
  const handleParticipantToggle = (userId: string, isCurrentlyAttending: boolean) => {
    console.log('Toggling participant:', { userId, isCurrentlyAttending, selectedMeetingId });
    if (!selectedMeetingId) {
      console.log('No meeting selected');
      return;
    }
    
    if (isCurrentlyAttending) {
      console.log('Removing participant');
      removeParticipantMutation.mutate({ meetingId: selectedMeetingId, userId });
    } else {
      console.log('Adding participant');
      addParticipantMutation.mutate({ meetingId: selectedMeetingId, userId });
    }
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold" data-testid="header-title">
              미팅 일정
            </h1>
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
                <Dialog open={participantDialogOpen} onOpenChange={setParticipantDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-8 h-8 rounded-full p-0"
                      data-testid="button-add-participant"
                      onClick={() => {
                        // For demo purposes, select the first meeting if any exists
                        const firstMeeting = meetings[0];
                        if (firstMeeting) {
                          setSelectedMeetingId(firstMeeting.id);
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" data-testid="dialog-participant-management">
                    <DialogHeader>
                      <DialogTitle>참여자 관리</DialogTitle>
                    </DialogHeader>
                    
                    {selectedMeeting ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">{selectedMeeting.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedMeeting.startAt).toLocaleDateString('ko-KR', {
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {users.map((user) => {
                            const isAttending = selectedMeeting.attendeeIds.includes(user.id);
                            return (
                              <div 
                                key={user.id} 
                                className="flex items-center justify-between p-2 rounded border"
                                data-testid={`participant-item-${user.id}`}
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                      {user.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-sm">{user.name}</div>
                                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                                  </div>
                                </div>
                                
                                <Checkbox
                                  checked={isAttending}
                                  onCheckedChange={() => handleParticipantToggle(user.id, isAttending)}
                                  disabled={addParticipantMutation.isPending || removeParticipantMutation.isPending}
                                  data-testid={`checkbox-participant-${user.id}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setParticipantDialogOpen(false)}
                            data-testid="button-cancel-participants"
                          >
                            완료
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">선택된 미팅이 없습니다.</p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
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

        {/* Today's Meetings Section */}
        <div className="px-6 py-4 border-b border-border">
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
                              title={`${meeting.title} - ${meeting.location || '위치 미정'} (${meetingStart.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${meetingEnd.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`}
                              onClick={() => {
                                setSelectedMeetingId(meeting.id);
                                setParticipantDialogOpen(true);
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
        </main>
      </div>
    </div>
  );
}