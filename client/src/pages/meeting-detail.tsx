import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Edit,
  Trash2,
  ArrowLeft,
  Save,
  X,
  MessageSquare,
  Send,
  Paperclip,
  Download,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type {
  Meeting,
  SafeUser,
  MeetingCommentWithAuthor,
  MeetingAttachment,
} from "@shared/schema";
import { insertMeetingSchema } from "@shared/schema";
import api from "@/api/api-index";

// 편집용 스키마
const editMeetingSchema = insertMeetingSchema
  .omit({
    startAt: true,
    endAt: true,
  })
  .extend({
    date: z.string().min(1, "날짜를 선택해주세요"),
    startTime: z.string().min(1, "시작 시간을 선택해주세요"),
    endTime: z.string().optional(),
    attendeeIds: z
      .array(z.string())
      .min(1, "최소 한 명의 참여자를 선택해주세요"),
  });

type EditMeetingForm = z.infer<typeof editMeetingSchema>;

export default function MeetingDetail() {
  const { id: workspaceId, meetingId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    content: string;
  } | null>(null);

  // 첨부파일 다운로드 핸들러
  const handleDownloadAttachment = async (attachment: MeetingAttachment) => {
    try {
      // 🚩 [수정] Axios를 사용하여 파일 다운로드
      // responseType: 'blob'을 설정하여 바이너리 데이터를 받습니다.
      const response = await api.get(`/objects/${attachment.filePath}`, {
        responseType: "blob", // 응답을 Blob 형태로 받도록 설정
      });
      // -----------------------------------------------------------------

      // Axios는 2xx 응답만 throw 없이 반환하며, 응답 데이터(Blob)는 response.data에 있습니다.
      const blob = response.data; // response.data는 이미 Blob 객체입니다.

      // 브라우저의 다운로드 기능 사용
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "다운로드 완료",
        description: `${attachment.fileName} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      // Axios는 비-2xx 상태 코드를 자동으로 catch 블록으로 보냅니다.
      console.error("Download error:", error);
      toast({
        title: "다운로드 실패",
        description: "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 미팅 정보 조회
  const { data: meeting, isLoading: meetingLoading } = useQuery<Meeting>({
    queryKey: [`/api/meetings/${meetingId}`],
    enabled: !!meetingId,
  });

  // 사용자 목록 조회 (워크스페이스 멤버만)
  const { data: users = [] } = useQuery<SafeUser[]>({
    // 1. 쿼리 키에 workspaceId를 추가하여 워크스페이스별로 유저 목록을 개별 캐싱합니다.
    queryKey: ["workspace-members", workspaceId],

    queryFn: async () => {
      // 2. 수정된 백엔드 API 경로(/api/workspaces/:id/users)를 호출합니다.
      const response = await api.get(`/api/workspaces/${workspaceId}/users`);
      return response.data;
    },

    // 3. workspaceId가 없을 때는 호출을 방지하여 에러를 막습니다.
    enabled: !!workspaceId,

    // 4. 효율적인 캐시 설정
    staleTime: 300000, // 5분간 서버에 재요청하지 않음 (부하 감소)
    refetchOnWindowFocus: true, // 사용자가 다시 브라우저를 볼 때 최신 데이터 확인
  });

  // 현재 로그인한 사용자 식별
  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail && users.length > 0) {
      const user = users.find((u) => u.email === userEmail);
      setCurrentUser(user || null);
    }
  }, [users]);

  // 댓글 목록 조회
  const { data: comments = [], refetch: refetchComments } = useQuery<
    MeetingCommentWithAuthor[]
  >({
    queryKey: ["/api/meetings", meetingId, "comments"],
    enabled: !!meetingId,
  });

  // 첨부파일 목록 조회
  const { data: attachments = [] } = useQuery<MeetingAttachment[]>({
    queryKey: ["/api/meetings", meetingId, "attachments"],
    enabled: !!meetingId,
  });

  // 댓글 생성 뮤테이션
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => {
      if (!currentUser) {
        throw new Error("로그인이 필요합니다.");
      }
      return apiRequest("POST", `/api/meetings/${meetingId}/comments`, {
        content,
        authorId: currentUser.id,
      });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({
        queryKey: ["/api/meetings", meetingId, "comments"],
      });
      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 작성되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "댓글 작성 실패",
        description: "댓글 작성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 댓글 수정 뮤테이션
  const updateCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      if (!currentUser) {
        throw new Error("로그인이 필요합니다.");
      }
      return apiRequest(
        "PUT",
        `/api/meetings/${meetingId}/comments/${commentId}`,
        {
          content,
        }
      );
    },
    onSuccess: () => {
      setEditingComment(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/meetings", meetingId, "comments"],
      });
      toast({
        title: "댓글 수정 완료",
        description: "댓글이 성공적으로 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "댓글 수정 실패",
        description: "댓글 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 댓글 삭제 뮤테이션
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => {
      if (!currentUser) {
        throw new Error("로그인이 필요합니다.");
      }
      return apiRequest(
        "DELETE",
        `/api/meetings/${meetingId}/comments/${commentId}`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/meetings", meetingId, "comments"],
      });
      toast({
        title: "댓글 삭제 완료",
        description: "댓글이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "댓글 삭제 실패",
        description: "댓글 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
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
      attendeeIds: [],
    },
  });

  // 미팅 데이터로 폼 초기화
  useEffect(() => {
    if (meeting) {
      const startDate = new Date(meeting.startAt);
      const endDate = meeting.endAt ? new Date(meeting.endAt) : null;

      form.reset({
        title: meeting.title,
        type: meeting.type,
        description: meeting.description || "",
        location: meeting.location || "",
        date: startDate.toISOString().split("T")[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate ? endDate.toTimeString().slice(0, 5) : "",
        attendeeIds: meeting.attendeeIds,
      });

      setSelectedParticipants(meeting.attendeeIds);
    }
  }, [meeting, form]);

  // 미팅 수정 뮤테이션
  const updateMeetingMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/meetings/${meetingId}`, data),
    onSuccess: (data) => {
      toast({
        title: "미팅이 수정되었습니다",
        description: "미팅 정보가 성공적으로 업데이트되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/meetings/${meetingId}`],
      });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Meeting update error:", error);
      toast({
        title: "수정 실패",
        description: "미팅 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 미팅 삭제 뮤테이션
  const deleteMeetingMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/meetings/${meetingId}`),
    onSuccess: async () => {
      // 1. 목록 페이지에서 사용하는 것과 정확히 일치하는 키 설정
      const meetingListKey = ["/api/workspaces", workspaceId, "meetings"];

      // 2. 해당 쿼리를 무효화하고 서버 데이터를 다시 가져오도록 대기
      await queryClient.invalidateQueries({
        queryKey: meetingListKey,
        exact: true,
      });

      toast({
        title: "미팅이 삭제되었습니다",
        description: "미팅이 성공적으로 삭제되었습니다.",
      });

      // 3. 캐시가 무효화된 후 페이지 이동
      setLocation(`/workspace/${workspaceId}/meeting`);
    },
    onError: (error) => {
      console.error("Meeting delete error:", error);
      toast({
        title: "삭제 실패",
        description: "미팅 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 참여자 토글
  const handleParticipantToggle = (userId: string) => {
    setSelectedParticipants((prev) => {
      const newSelection = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];

      form.setValue("attendeeIds", newSelection);
      return newSelection;
    });
  };

  // 폼 제출
  const onSubmit = (data: EditMeetingForm) => {
    // 날짜와 시간을 ISO 문자열로 변환
    const startDateTime = new Date(`${data.date}T${data.startTime}`);
    let endDateTime: Date | null = null;

    if (data.endTime) {
      endDateTime = new Date(`${data.date}T${data.endTime}`);

      // 종료 시간이 있을 때만 시간 검증
      if (endDateTime <= startDateTime) {
        toast({
          title: "시간 오류",
          description: "종료 시간은 시작 시간보다 늦어야 합니다.",
          variant: "destructive",
        });
        return;
      }
    }

    const meetingData = {
      title: data.title,
      type: data.type,
      description: data.description,
      location: data.location,
      startAt: startDateTime.toISOString(),
      endAt: endDateTime ? endDateTime.toISOString() : null,
      attendeeIds: selectedParticipants,
    };

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
                onClick={() => setLocation(`/workspace/${workspaceId}/meeting`)}
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
              <p className="text-muted-foreground">
                미팅 정보를 불러오는 중...
              </p>
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
                onClick={() => setLocation(`/workspace/${workspaceId}/meeting`)}
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
  const participants = users.filter((user) =>
    meeting.attendeeIds.includes(user.id)
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/workspace/${workspaceId}/meeting`)}
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
                      variant="destructive"
                      size="sm"
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
                        정말로 이 미팅을 삭제하시겠습니까? 이 작업은 되돌릴 수
                        없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">
                        취소
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMeetingMutation.mutate()}
                        disabled={deleteMeetingMutation.isPending}
                        data-testid="button-confirm-delete"
                      >
                        {deleteMeetingMutation.isPending
                          ? "삭제 중..."
                          : "삭제"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {isEditing && (
              <>
                <Button
                  size="sm"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updateMeetingMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMeetingMutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button
                  variant="secondary"
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
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      {/* 기본 정보 */}
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>제목 *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="미팅 제목을 입력하세요"
                                {...field}
                                data-testid="input-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                              <Input
                                placeholder="미팅 위치를 입력하세요"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-location"
                              />
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
                                <Input
                                  type="date"
                                  {...field}
                                  data-testid="input-date"
                                />
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
                                <Input
                                  type="time"
                                  {...field}
                                  data-testid="input-start-time"
                                />
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
                              <FormLabel>종료 시간 (선택사항)</FormLabel>
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  data-testid="input-end-time"
                                />
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
                                    checked={selectedParticipants.includes(
                                      user.id
                                    )}
                                    onCheckedChange={() =>
                                      handleParticipantToggle(user.id)
                                    }
                                    data-testid={`checkbox-user-${user.username}`}
                                  />
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                      {user.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <label
                                    htmlFor={`user-${user.id}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {user.name}
                                  </label>
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
                  <CardTitle
                    className="text-2xl"
                    data-testid="text-meeting-title"
                  >
                    {meeting.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 날짜 및 시간 */}
                  <div className="flex items-center space-x-4 text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span data-testid="text-meeting-date">
                        {new Date(meeting.startAt).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span data-testid="text-meeting-time">
                        {new Date(meeting.startAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {meeting.endAt
                          ? ` - ${new Date(meeting.endAt).toLocaleTimeString(
                              "ko-KR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  {/* 위치 */}
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span data-testid="text-meeting-location">
                      {meeting.location && meeting.location.trim() !== ""
                        ? meeting.location
                        : "지정된 위치가 없습니다."}
                    </span>
                  </div>

                  {/* 설명 */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">내용</h4>
                    <p
                      className="text-muted-foreground whitespace-pre-wrap"
                      data-testid="text-meeting-description"
                    >
                      {/* {meeting.description || "입력된 내용이 없습니다."} */}
                      {meeting.description && meeting.description.trim() !== ""
                        ? meeting.description
                        : "입력된 내용이 없습니다."}
                    </p>
                  </div>
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
                        <div className="font-medium">{user.name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 첨부파일 섹션 */}
              {attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Paperclip className="w-5 h-5" />
                      <span>첨부파일 ({attachments.length}개)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {attachments.map((attachment) => {
                        const uploaderUser = users.find(
                          (u) => u.id === attachment.uploadedBy
                        );
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-3 rounded border"
                            data-testid={`attachment-${attachment.id}`}
                          >
                            <div className="flex items-center space-x-3">
                              <Paperclip className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {attachment.fileName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {attachment.fileSize &&
                                    `${Math.round(
                                      attachment.fileSize / 1024
                                    )} KB`}
                                  {uploaderUser &&
                                    ` • ${uploaderUser.name}이 업로드`}
                                  {attachment.createdAt &&
                                    ` • ${new Date(
                                      attachment.createdAt
                                    ).toLocaleDateString("ko-KR")}`}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDownloadAttachment(attachment)
                              }
                              data-testid={`button-download-${attachment.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              다운로드
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 댓글 섹션 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>댓글 ({comments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 댓글 목록 */}
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex space-x-3 p-4 rounded border"
                          data-testid={`comment-${comment.id}`}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                              {comment.author.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">
                                  {comment.author.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {comment.createdAt
                                    ? new Date(
                                        comment.createdAt
                                      ).toLocaleDateString("ko-KR", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "방금 전"}
                                  {comment.updatedAt &&
                                    comment.createdAt &&
                                    new Date(comment.updatedAt).getTime() !==
                                      new Date(comment.createdAt).getTime() &&
                                    " (수정됨)"}
                                </span>
                              </div>
                              {currentUser?.id === comment.authorId && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setEditingComment({
                                        id: comment.id,
                                        content: comment.content,
                                      })
                                    }
                                    data-testid={`button-edit-comment-${comment.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={
                                          deleteCommentMutation.isPending
                                        }
                                        data-testid={`button-delete-comment-${comment.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          댓글 삭제
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          이 댓글을 삭제하시겠습니까? 이 작업은
                                          되돌릴 수 없습니다.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel
                                          data-testid={`button-cancel-delete-comment-${comment.id}`}
                                        >
                                          취소
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() =>
                                            deleteCommentMutation.mutate(
                                              comment.id
                                            )
                                          }
                                          disabled={
                                            deleteCommentMutation.isPending
                                          }
                                          data-testid={`button-confirm-delete-comment-${comment.id}`}
                                        >
                                          {deleteCommentMutation.isPending
                                            ? "삭제 중..."
                                            : "삭제"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>
                            {editingComment?.id === comment.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingComment.content}
                                  onChange={(e) =>
                                    setEditingComment({
                                      ...editingComment,
                                      content: e.target.value,
                                    })
                                  }
                                  rows={3}
                                  data-testid={`textarea-edit-comment-${comment.id}`}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingComment(null)}
                                    data-testid={`button-cancel-edit-comment-${comment.id}`}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    취소
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (editingComment.content.trim()) {
                                        updateCommentMutation.mutate({
                                          commentId: comment.id,
                                          content:
                                            editingComment.content.trim(),
                                        });
                                      }
                                    }}
                                    disabled={
                                      !editingComment.content.trim() ||
                                      updateCommentMutation.isPending
                                    }
                                    data-testid={`button-save-edit-comment-${comment.id}`}
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    {updateCommentMutation.isPending
                                      ? "저장 중..."
                                      : "저장"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground">
                                {comment.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 댓글 작성 */}
                  <div className="pt-4 border-t space-y-3">
                    <Textarea
                      placeholder="댓글을 작성하세요..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      data-testid="textarea-new-comment"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          if (newComment.trim()) {
                            createCommentMutation.mutate(newComment.trim());
                          }
                        }}
                        disabled={
                          !newComment.trim() || createCommentMutation.isPending
                        }
                        size="sm"
                        data-testid="button-submit-comment"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {createCommentMutation.isPending
                          ? "작성 중..."
                          : "댓글 작성"}
                      </Button>
                    </div>
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
