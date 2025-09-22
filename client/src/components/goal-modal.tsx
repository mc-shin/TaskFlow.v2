import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertGoalSchema } from "@shared/schema";

const goalFormSchema = insertGoalSchema.extend({
  title: z.string().min(1, "목표 제목을 입력해주세요"),
  description: z.string().optional(),
  deadline: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
}

export function GoalModal({ isOpen, onClose, projectId, projectTitle }: GoalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: projectId,
      deadline: "",
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const response = await apiRequest("POST", "/api/goals", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate multiple queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "목표 생성 완료",
        description: "새 목표가 성공적으로 생성되었습니다.",
      });
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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