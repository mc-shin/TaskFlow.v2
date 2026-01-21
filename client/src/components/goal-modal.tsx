import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertGoalSchema } from "@shared/schema";
import { useEffect } from "react";

const goalFormSchema = insertGoalSchema.extend({
  title: z.string().min(1, "목표 제목을 입력해주세요"),
  description: z.string().optional(),
  deadline: z.string().optional(),
  workspaceId: z.string().min(1), // 필수 필드로 추가
});

type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  workspaceId: string; // ⭐ workspaceId 추가
  onSuccess?: () => void; // ⭐ 추가
}

export function GoalModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  workspaceId,
  onSuccess, // ⭐ 추가
}: GoalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: projectId,
      workspaceId: workspaceId, // 초기값 설정
      deadline: "",
    },
  });

  // workspaceId가 프롭으로 전달되면 폼 값도 업데이트
  useEffect(() => {
    if (workspaceId) {
      form.setValue("workspaceId", workspaceId);
    }
  }, [workspaceId, form]);

  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const response = await apiRequest("POST", "/api/goals", data);
      return response;
    },
    onSuccess: () => {
      // Invalidate multiple queries to update the UI
      // queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "goals"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // 1. 해당 워크스페이스의 모든 프로젝트 목록 갱신
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "projects"],
      });
      // 2. 해당 워크스페이스의 모든 목표 목록 갱신 (목록 페이지에서 이 키를 사용해야 함)
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "goals"],
      });
      // 3. 통계 데이터 갱신
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "stats"],
      });
      // 4. 특정 프로젝트 상세 내의 목표 목록 갱신 (사용 중인 경우)
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "goals"],
      });
   queryClient.invalidateQueries({
      queryKey: ["/api/workspaces", workspaceId, "activities"],
    });

      toast({
        title: "목표 생성 완료",
        description: "새 목표가 성공적으로 생성되었습니다.",
      });

      // ⭐ 목표 생성 성공 후 부모 컴포넌트의 펼치기 함수 호출
      if (onSuccess) {
        onSuccess();
      }
      
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "생성 실패",
        description: "목표 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: GoalFormData) => {
    createGoalMutation.mutate({
      ...data,
      projectId: projectId, // Ensure projectId is set
      workspaceId: workspaceId, // 명시적으로 한 번 더 확인
      status: "진행중", // Set status to 진행중 when creating goals from project detail page
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 목표 생성</DialogTitle>
          {projectTitle && (
            <p className="text-sm text-muted-foreground">
              프로젝트: {projectTitle}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>목표 제목 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="목표 제목을 입력하세요"
                      data-testid="input-goal-title"
                      {...field}
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
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="목표에 대한 설명을 입력하세요 (선택사항)"
                      className="min-h-[100px]"
                      data-testid="textarea-goal-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>마감일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-goal-deadline"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-goal"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createGoalMutation.isPending}
                data-testid="button-create-goal"
              >
                {createGoalMutation.isPending ? "생성 중..." : "생성하기"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
