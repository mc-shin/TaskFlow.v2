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
import { insertProjectSchema } from "@shared/schema";

const projectFormSchema = z.object({
  name: z.string().min(1, "프로젝트 제목을 입력해주세요"),
  description: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string; // ⭐ workspaceId 추가
}

export function ProjectModal({ isOpen, onClose, workspaceId }: ProjectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const projectCode = `PROJ-${Date.now().toString().slice(-6)}`;
      const projectData = {
        name: data.name,
        code: projectCode,
        description: data.description || null,
        workspaceId: workspaceId,
      };
      
      return await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      // ✅ 1. 프로젝트 목록 쿼리 키를 현재 워크스페이스 ID를 포함한 키로 정확히 지정해야 합니다.
      queryClient.invalidateQueries({ 
        queryKey: ["/api/workspaces", workspaceId, "projects"] 
      });
      // ✅ 2. 통계(stats) 쿼리도 workspaceId를 포함하고 있다면 맞춰서 수정합니다.
      queryClient.invalidateQueries({ 
        queryKey: ["users-stats", workspaceId] 
      });
         queryClient.invalidateQueries({
      queryKey: ["/api/workspaces", workspaceId, "activities"],
    });

      toast({
        title: "프로젝트 생성 완료",
        description: "새 프로젝트가 성공적으로 생성되었습니다.",
      });
      
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      console.error("프로젝트 생성 에러:", error);
      toast({
        title: "생성 실패",
        description: "프로젝트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 프로젝트 생성</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프로젝트 제목 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="프로젝트 제목을 입력하세요"
                      data-testid="input-project-title"
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
                      placeholder="프로젝트에 대한 설명을 입력하세요 (선택사항)"
                      className="min-h-[100px]"
                      data-testid="textarea-project-description"
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
                data-testid="button-cancel-project"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
                data-testid="button-create-project"
              >
                {createProjectMutation.isPending ? "생성 중..." : "생성하기"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}