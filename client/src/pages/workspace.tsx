import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Settings, Users, Calendar, LogOut } from "lucide-react";

const workspaceSchema = z.object({
  name: z.string().min(1, "워크스페이스 이름을 입력해주세요"),
  description: z.string().optional(),
});

type WorkspaceForm = z.infer<typeof workspaceSchema>;

// 임시 워크스페이스 데이터
const mockWorkspaces = [
  {
    id: "1",
    name: "메인 프로젝트",
    description: "주요 업무 관리 워크스페이스",
    memberCount: 8,
    projectCount: 12,
    lastAccess: "2025-09-26",
  },
];

export function WorkspacePage() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("사용자");

  useEffect(() => {
    // localStorage에서 사용자 이름 가져오기
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName) {
      setUserName(storedUserName);
    }
  }, []);

  const form = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: WorkspaceForm) => {
    setIsLoading(true);
    try {
      // TODO: 실제 워크스페이스 생성 API 연동
      console.log("Create workspace:", data);
      
      // 워크스페이스 생성 후 app의 기본 형태로 이동
      setIsCreateDialogOpen(false);
      form.reset();
      setLocation("/workspace/app/team");
    } catch (error) {
      console.error("Create workspace error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    // 첫 번째 워크스페이스는 기존 앱으로 이동
    if (workspaceId === "1") {
      setLocation("/workspace/app/team");
    } else {
      // 다른 워크스페이스는 임시로 알림
      alert("해당 워크스페이스는 준비 중입니다.");
    }
  };

  const handleLogout = () => {
    // TODO: 실제 로그아웃 처리
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">워크스페이스 관리</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">{userName}님</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">워크스페이스 선택</h2>
          <p className="text-muted-foreground">
            작업할 워크스페이스를 선택하거나 새로운 워크스페이스를 생성하세요.
          </p>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {mockWorkspaces.map((workspace) => (
            <Card 
              key={workspace.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleWorkspaceSelect(workspace.id)}
              data-testid={`card-workspace-${workspace.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workspace.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {workspace.description}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    // TODO: 워크스페이스 설정
                    alert("워크스페이스 설정은 준비 중입니다.");
                  }}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{workspace.memberCount}명</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{workspace.projectCount}개 프로젝트</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {workspace.lastAccess}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Workspace Card */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed" data-testid="card-create-workspace">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] space-y-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">새 워크스페이스</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      새로운 워크스페이스를 생성하세요
                    </p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent data-testid="dialog-create-workspace">
              <DialogHeader>
                <DialogTitle>새 워크스페이스 생성</DialogTitle>
                <DialogDescription>
                  새로운 워크스페이스를 생성하여 프로젝트를 관리하세요.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>워크스페이스 이름</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="예: 마케팅 프로젝트"
                            {...field}
                            data-testid="input-workspace-name"
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
                        <FormLabel>설명 (선택사항)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="워크스페이스에 대한 간단한 설명"
                            {...field}
                            data-testid="input-workspace-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-workspace"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      data-testid="button-create-workspace"
                    >
                      {isLoading ? "생성 중..." : "워크스페이스 생성"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

      </main>
    </div>
  );
}