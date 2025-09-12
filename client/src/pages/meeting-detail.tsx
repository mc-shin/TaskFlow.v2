import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Users, MapPin, Edit, Trash2, ArrowLeft, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Meeting, SafeUser } from "@shared/schema";
import { insertMeetingSchema } from "@shared/schema";

// 편집용 스키마
const editMeetingSchema = insertMeetingSchema.omit({
  startAt: true,
  endAt: true
}).extend({
  date: z.string().min(1, "날짜를 선택해주세요"),
  startTime: z.string().min(1, "시작 시간을 선택해주세요"),
  endTime: z.string().min(1, "종료 시간을 선택해주세요"),
  attendeeIds: z.array(z.string()).min(1, "최소 한 명의 참여자를 선택해주세요")
});

type EditMeetingForm = z.infer<typeof editMeetingSchema>;

export default function MeetingDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // 미팅 정보 조회
  const { data: meeting, isLoading: meetingLoading } = useQuery<Meeting>({
    queryKey: ['/api/meetings', id],
    enabled: !!id
  });

  // 사용자 목록 조회
  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ['/api/users']
  });

  // 폼 초기화
  const form = useForm<EditMeetingForm>({
    resolver: zodResolver(editMeetingSchema),
    defaultValues: {
      title: "",
      type: "기타",
      description: "",
      location: "",
      date: "",
      startTime: "",
      endTime: "",
      attendeeIds: []
    }
  });

  // 미팅 데이터로 폼 초기화
  useEffect(() => {
    if (meeting) {
      const startDate = new Date(meeting.startAt);
      const endDate = new Date(meeting.endAt);
      
      form.reset({
        title: meeting.title,
        type: meeting.type,
        description: meeting.description || "",
        location: meeting.location || "",
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate.toTimeString().slice(0, 5),
        attendeeIds: meeting.attendeeIds
      });
      
      setSelectedParticipants(meeting.attendeeIds);
    }
  }, [meeting, form]);

  // 미팅 수정 뮤테이션
  const updateMeetingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/meetings/${id}`, data),
    onSuccess: (data) => {
      console.log('Meeting updated successfully:', data);
      toast({
        title: "미팅이 수정되었습니다",
        description: "미팅 정보가 성공적으로 업데이트되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings', id] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Meeting update error:', error);
      toast({
        title: "수정 실패",
        description: "미팅 수정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 미팅 삭제 뮤테이션
  const deleteMeetingMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/meetings/${id}`),
    onSuccess: () => {
      toast({
        title: "미팅이 삭제되었습니다",
        description: "미팅이 성공적으로 삭제되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setLocation('/meeting');
    },
    onError: (error) => {
      console.error('Meeting delete error:', error);
      toast({
        title: "삭제 실패",
        description: "미팅 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 참여자 토글
  const handleParticipantToggle = (userId: string) => {
    setSelectedParticipants(prev => {
      const newSelection = prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      
      form.setValue('attendeeIds', newSelection);
      return newSelection;
    });
  };

  // 폼 제출
  const onSubmit = (data: EditMeetingForm) => {
    console.log('=== 미팅 수정 시작 ===');
    console.log('Form data:', data);

    // 날짜와 시간을 ISO 문자열로 변환
    const startDateTime = new Date(`${data.date}T${data.startTime}`);
    const endDateTime = new Date(`${data.date}T${data.endTime}`);

    // 시간 검증
    if (endDateTime <= startDateTime) {
      toast({
        title: "시간 오류",
        description: "종료 시간은 시작 시간보다 늦어야 합니다.",
        variant: "destructive"
      });
      return;
    }

    const meetingData = {
      title: data.title,
      type: data.type,
      description: data.description,
      location: data.location,
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString(),
      attendeeIds: selectedParticipants
    };

    console.log('Meeting update data:', meetingData);
    updateMeetingMutation.mutate(meetingData);
  };

  if (meetingLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/meeting')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
              <h1 className="text-xl font-semibold">미팅 상세</h1>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">미팅 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/meeting')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
              <h1 className="text-xl font-semibold">미팅 상세</h1>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">미팅을 찾을 수 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 참여자 정보
  const participants = users.filter(user => meeting.attendeeIds.includes(user.id));
  
  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/meeting')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
            <h1 className="text-xl font-semibold" data-testid="header-title">
              미팅 상세
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  편집
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      data-testid="button-delete"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>미팅 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 이 미팅을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">취소</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMeetingMutation.mutate()}
                        disabled={deleteMeetingMutation.isPending}
                        data-testid="button-confirm-delete"
                      >
                        {deleteMeetingMutation.isPending ? "삭제 중..." : "삭제"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                    setSelectedParticipants(meeting.attendeeIds);
                  }}
                  data-testid="button-cancel-edit"
                >
                  <X className="w-4 h-4 mr-2" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updateMeetingMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMeetingMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
          {isEditing ? (
            // 편집 모드
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>미팅 편집</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* 기본 정보 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>제목 *</FormLabel>
                              <FormControl>
                                <Input placeholder="미팅 제목을 입력하세요" {...field} data-testid="input-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>미팅 유형 *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-type">
                                    <SelectValue placeholder="미팅 유형을 선택하세요" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="스탠드업">스탠드업</SelectItem>
                                  <SelectItem value="기타">기타</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>내용</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="미팅 내용을 입력하세요"
                                className="min-h-[100px]"
                                {...field}
                                value={field.value || ""}
                                data-testid="textarea-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>위치</FormLabel>
                            <FormControl>
                              <Input placeholder="미팅 위치를 입력하세요" {...field} value={field.value || ""} data-testid="input-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 날짜 및 시간 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>날짜 *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>시작 시간 *</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-start-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>종료 시간 *</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-end-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* 참여자 선택 */}
                      <FormField
                        control={form.control}
                        name="attendeeIds"
                        render={() => (
                          <FormItem>
                            <FormLabel>참여자 선택 *</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded p-4">
                              {users.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center space-x-3 p-2 rounded border hover:bg-accent"
                                >
                                  <Checkbox
                                    id={`user-${user.id}`}
                                    checked={selectedParticipants.includes(user.id)}
                                    onCheckedChange={() => handleParticipantToggle(user.id)}
                                    data-testid={`checkbox-user-${user.username}`}
                                  />
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                      {user.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <label
                                      htmlFor={`user-${user.id}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      {user.name}
                                    </label>
                                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          ) : (
            // 보기 모드
            <div className="max-w-2xl mx-auto space-y-6">
              {/* 기본 정보 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl" data-testid="text-meeting-title">
                      {meeting.title}
                    </CardTitle>
                    <Badge 
                      variant={meeting.type === "스탠드업" ? "default" : "secondary"}
                      data-testid="badge-meeting-type"
                    >
                      {meeting.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 날짜 및 시간 */}
                  <div className="flex items-center space-x-4 text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span data-testid="text-meeting-date">
                        {new Date(meeting.startAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span data-testid="text-meeting-time">
                        {new Date(meeting.startAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {new Date(meeting.endAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* 위치 */}
                  {meeting.location && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span data-testid="text-meeting-location">{meeting.location}</span>
                    </div>
                  )}

                  {/* 설명 */}
                  {meeting.description && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">내용</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-meeting-description">
                        {meeting.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 참여자 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>참여자 ({participants.length}명)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {participants.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-3 rounded border"
                        data-testid={`participant-${user.username}`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}