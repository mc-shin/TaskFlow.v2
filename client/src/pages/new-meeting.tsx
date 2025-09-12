import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Clock, MapPin, Users, FileText, MessageSquare, Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertMeetingSchema, SafeUser } from "@shared/schema";

// 확장된 미팅 스키마 (UI용)
const newMeetingSchema = insertMeetingSchema.omit({
  startAt: true,
  endAt: true
}).extend({
  date: z.string().min(1, "날짜를 선택해주세요"),
  startTime: z.string().min(1, "시작 시간을 선택해주세요"),
  endTime: z.string().min(1, "종료 시간을 선택해주세요"),
  attendeeIds: z.array(z.string()).min(1, "최소 한 명의 참여자를 선택해주세요")
});

type NewMeetingForm = z.infer<typeof newMeetingSchema>;

export default function NewMeeting() {
  const { toast } = useToast();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // 사용자 목록 가져오기
  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ['/api/users'],
  });

  // 폼 설정
  const form = useForm<NewMeetingForm>({
    resolver: zodResolver(newMeetingSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "standup",
      location: "",
      date: "",
      startTime: "",
      endTime: "",
      attendeeIds: []
    }
  });

  // 미팅 생성 뮤테이션
  const createMeetingMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest('POST', '/api/meetings', data);
    },
    onSuccess: () => {
      toast({
        title: "미팅이 생성되었습니다",
        description: "새로운 미팅이 성공적으로 추가되었습니다."
      });
      // 미팅 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      // 미팅 페이지로 이동
      window.location.href = '/meeting';
    },
    onError: (error) => {
      console.error('미팅 생성 오류:', error);
      toast({
        title: "오류가 발생했습니다",
        description: "미팅 생성 중 문제가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 참여자 토글
  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => {
      const newSelection = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      
      // 폼 값도 업데이트
      form.setValue('attendeeIds', newSelection);
      return newSelection;
    });
  };

  // 폼 제출
  const onSubmit = (data: NewMeetingForm) => {
    console.log('=== 폼 제출 시작 ===');
    console.log('Form data:', data);
    console.log('Selected participants:', selectedParticipants);
    console.log('Form errors:', form.formState.errors);

    // 날짜와 시간을 ISO 문자열로 변환
    const startDateTime = new Date(`${data.date}T${data.startTime}`);
    const endDateTime = new Date(`${data.date}T${data.endTime}`);

    // 시간 검증
    if (endDateTime <= startDateTime) {
      toast({
        title: "시간 설정 오류",
        description: "종료 시간은 시작 시간보다 늦어야 합니다.",
        variant: "destructive"
      });
      return;
    }

    const meetingData = {
      title: data.title,
      description: data.description || "",
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString(),
      type: data.type,
      location: data.location || "",
      attendeeIds: selectedParticipants
    };

    console.log('Meeting data to send:', meetingData);
    createMeetingMutation.mutate(meetingData);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/meeting'}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로가기
            </Button>
            <h1 className="text-xl font-semibold" data-testid="header-title">
              새 미팅 추가
            </h1>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
          <div className="max-w-2xl mx-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 기본 정보 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>기본 정보</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 제목 */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>제목 *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="미팅 제목을 입력하세요"
                              data-testid="input-title"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 미팅 유형 */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>미팅 유형</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="미팅 유형을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standup">스탠드업</SelectItem>
                                <SelectItem value="other">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 내용 */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>내용</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="미팅 내용을 입력하세요"
                              rows={4}
                              data-testid="textarea-description"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 위치 */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>위치</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="미팅 장소를 입력하세요"
                              data-testid="input-location"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* 일정 정보 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CalendarIcon className="w-5 h-5" />
                      <span>일정 정보</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 날짜 */}
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>날짜 *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              data-testid="input-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      {/* 시작 시간 */}
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>시작 시간 *</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="time"
                                data-testid="input-start-time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 종료 시간 */}
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>종료 시간 *</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="time"
                                data-testid="input-end-time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 참여자 선택 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>참여자</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="attendeeIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>참여자 선택 *</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-3">
                              {users.map((user) => (
                                <div 
                                  key={user.id} 
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`user-${user.id}`}
                                    checked={selectedParticipants.includes(user.id)}
                                    onCheckedChange={() => toggleParticipant(user.id)}
                                    data-testid={`checkbox-user-${user.username}`}
                                  />
                                  <Label 
                                    htmlFor={`user-${user.id}`}
                                    className="flex items-center space-x-2 cursor-pointer"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                      {user.initials}
                                    </div>
                                    <span>{user.name}</span>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* 추가 기능 카드 (향후 구현용) */}
                <Card className="opacity-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="w-5 h-5" />
                      <span>추가 기능 (향후 지원 예정)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>파일 첨부</span>
                      </Label>
                      <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center text-muted-foreground">
                        향후 지원 예정
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>댓글</span>
                      </Label>
                      <Textarea 
                        placeholder="댓글 기능은 향후 지원 예정입니다"
                        disabled
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 액션 버튼 */}
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => window.location.href = '/meeting'}
                    data-testid="button-cancel"
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMeetingMutation.isPending}
                    data-testid="button-submit"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('=== 버튼 클릭됨 ===');
                      console.log('Form state:', {
                        isValid: form.formState.isValid,
                        errors: form.formState.errors,
                        values: form.getValues()
                      });
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    {createMeetingMutation.isPending ? "생성 중..." : "미팅 생성"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
}