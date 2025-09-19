import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTaskSchema, type TaskWithAssignee } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const taskFormSchema = insertTaskSchema.extend({
  deadline: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask?: TaskWithAssignee | null;
  goalId?: string;
  goalTitle?: string;
}

export function TaskModal({ isOpen, onClose, editingTask, goalId, goalTitle }: TaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "진행전",
      priority: "중간",
      deadline: "",
      duration: 0,
      assigneeId: "none",
      goalId: goalId || "",
      projectId: "",
    },
  });

  useEffect(() => {
    if (editingTask) {
      form.reset({
        title: editingTask.title,
        description: editingTask.description || "",
        status: editingTask.status,
        priority: editingTask.priority || "중간",
        deadline: editingTask.deadline || "",
        duration: editingTask.duration || 0,
        assigneeId: editingTask.assigneeId || "none",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        status: "진행전",
        priority: "중간",
        deadline: "",
        duration: 0,
        assigneeId: "none",
      });
    }
  }, [editingTask, form]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const taskData = {
        ...data,
        goalId: goalId || data.goalId || null,
        assigneeId: data.assigneeId === "none" ? null : data.assigneeId,
      };
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "작업 생성 완료",
        description: "새 작업이 성공적으로 생성되었습니다.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "생성 실패",
        description: "작업 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await apiRequest("PUT", `/api/tasks/${editingTask?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "작업 수정 완료",
        description: "작업이 성공적으로 수정되었습니다.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "작업 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate(data);
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="modal-backdrop bg-card border border-border" data-testid="task-modal">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {editingTask ? "작업 수정" : "새 작업 생성"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-task">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>작업명</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="작업명을 입력하세요" 
                      {...field}
                      data-testid="input-task-title"
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
                      placeholder="작업 설명을 입력하세요" 
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>마감기한</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-task-deadline"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>상태</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-status">
                          <SelectValue placeholder="상태를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="진행전">진행전</SelectItem>
                        <SelectItem value="진행중">진행중</SelectItem>
                        <SelectItem value="완료">완료</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>담당자</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-assignee">
                        <SelectValue placeholder="담당자를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">담당자 없음</SelectItem>
                      {Array.isArray(users) ? users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isLoading}
                data-testid="button-save-task"
              >
                {isLoading ? "저장 중..." : "저장"}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                className="flex-1"
                onClick={onClose}
                data-testid="button-cancel-task"
              >
                취소
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
