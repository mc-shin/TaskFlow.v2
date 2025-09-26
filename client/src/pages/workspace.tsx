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
import { CheckSquare, Plus, Settings, Users, Calendar, LogOut, Mail, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isUserInfoLoaded, setIsUserInfoLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // localStorage에서 사용자 이름 가져오기
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName) {
      setUserName(storedUserName);
    }

    // 현재 로그인된 사용자의 이메일을 가져와서 실제 username 찾기
    const checkInvitations = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      try {
        // 현재 로그인된 사용자의 실제 정보 가져오기
        const response = await fetch('/api/users');
        const users = await response.json();
        
        // userEmail을 기반으로 실제 사용자 매핑 (간단한 매핑 로직)
        let currentUser;
        const email = userEmail.toLowerCase();
        if (email.includes('admin') || email === 'admin@qubicom.co.kr') {
          currentUser = users.find((u: any) => u.username === 'admin');
          setIsAdminUser(true);
        } else if (email.includes('hyejin') || email === '1@qubicom.co.kr') {
          currentUser = users.find((u: any) => u.username === 'hyejin');
        } else if (email.includes('hyejung') || email === '2@qubicom.co.kr') {
          currentUser = users.find((u: any) => u.username === 'hyejung');
        } else if (email.includes('chamin') || email === '3@qubicom.co.kr') {
          currentUser = users.find((u: any) => u.username === 'chamin');
        }
        
        // 신규가입자인지 확인 (백엔드에 등록되지 않은 사용자)
        // 단, 이전에 초대를 수락한 경우는 신규 사용자가 아님
        const hasAcceptedInvitation = localStorage.getItem(`hasAcceptedInvitation_${userEmail}`) === 'true';
        if (!currentUser && !hasAcceptedInvitation) {
          setIsNewUser(true);
        }
        
        let pendingInvitations: any[] = [];
        
        if (currentUser) {
          // 사용자 이름 저장 및 설정
          setUserName(currentUser.name);
          localStorage.setItem("userName", currentUser.name);
        }
        
        // 모든 사용자(기존/신규)에 대해 개별 받은 초대 목록 먼저 확인
        const receivedInvitations = JSON.parse(localStorage.getItem(`receivedInvitations_${userEmail}`) || '[]');
        pendingInvitations = receivedInvitations.filter((inv: any) => inv.status === 'pending');
        
        // 신규 사용자이고 개별 초대 목록이 비어있다면 전역 목록에서 확인
        if (!currentUser && pendingInvitations.length === 0) {
          const globalInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '[]');
          const globalPending = globalInvitations.filter((inv: any) => 
            inv.inviteeEmail === userEmail && inv.status === 'pending'
          );
          
          // 전역에서 찾은 초대가 있다면 개별 목록으로 이동
          if (globalPending.length > 0) {
            localStorage.setItem(`receivedInvitations_${userEmail}`, JSON.stringify(globalPending));
            pendingInvitations = globalPending;
            
            // 전역 목록에서 해당 초대들 제거
            const remainingGlobalInvitations = globalInvitations.filter((inv: any) => 
              !(inv.inviteeEmail === userEmail && inv.status === 'pending')
            );
            localStorage.setItem('pendingInvitations', JSON.stringify(remainingGlobalInvitations));
          }
        }
        
        setInvitations(pendingInvitations);
        
        // 초대가 있다면 다이얼로그 자동 열기
        if (pendingInvitations.length > 0) {
          setIsInviteDialogOpen(true);
        }
        
        // 사용자 정보 로딩 완료
        setIsUserInfoLoaded(true);
      } catch (error) {
        console.error('초대 확인 중 오류:', error);
        // 오류가 발생해도 로딩 완료로 표시
        setIsUserInfoLoaded(true);
      }
    };

    // 초기 체크
    checkInvitations();

    // localStorage 변경 이벤트 리스너 추가 (같은 브라우저의 다른 탭에서 실시간 업데이트)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('receivedInvitations_') || e.key === 'pendingInvitations') {
        // 초대 관련 localStorage가 변경되면 다시 체크
        checkInvitations();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 주기적으로 초대 체크 (10초마다)
    const interval = setInterval(checkInvitations, 10000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
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
    // 로그아웃 시 localStorage 클리어
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    
    // 랜딩 페이지로 이동
    setLocation("/");
  };

  const handleInviteResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) return;

    try {
      // 현재 로그인된 사용자의 실제 username 가져오기
      const response = await fetch('/api/users');
      const users = await response.json();
      
      // userEmail을 기반으로 실제 사용자 매핑
      let currentUser;
      const email = userEmail.toLowerCase();
      if (email.includes('admin') || email === 'admin@qubicom.co.kr') {
        currentUser = users.find((u: any) => u.username === 'admin');
      } else if (email.includes('hyejin') || email === '1@qubicom.co.kr') {
        currentUser = users.find((u: any) => u.username === 'hyejin');
      } else if (email.includes('hyejung') || email === '2@qubicom.co.kr') {
        currentUser = users.find((u: any) => u.username === 'hyejung');
      } else if (email.includes('chamin') || email === '3@qubicom.co.kr') {
        currentUser = users.find((u: any) => u.username === 'chamin');
      }
      // 신규가입자의 경우 currentUser는 undefined로 남겨둠
      
      // 모든 사용자에 대해 로그인한 이메일을 키로 사용 (일관성 유지)
      const currentEmail = userEmail;

      // 받은 초대 목록 업데이트
      const receivedInvitations = JSON.parse(localStorage.getItem(`receivedInvitations_${currentEmail}`) || '[]');
      const updatedInvitations = receivedInvitations.map((inv: any) => 
        inv.id === invitationId ? { ...inv, status: action === 'accept' ? 'accepted' : 'declined' } : inv
      );
      localStorage.setItem(`receivedInvitations_${currentEmail}`, JSON.stringify(updatedInvitations));

      // 로컬 상태 업데이트
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      toast({
        title: action === 'accept' ? "초대 수락" : "초대 거절",
        description: action === 'accept' ? "워크스페이스에 참여했습니다." : "초대를 거절했습니다.",
      });

      // 초대를 수락한 경우 프로젝트 멤버로 추가 및 신규 사용자 플래그 클리어
      if (action === 'accept') {
        // 수락한 초대 정보에서 프로젝트 ID 가져오기
        const acceptedInvitation = receivedInvitations.find((inv: any) => inv.id === invitationId);
        
        if (acceptedInvitation && acceptedInvitation.projectId) {
          try {
            // 현재 프로젝트 정보 가져오기
            const projectResponse = await fetch(`/api/projects`);
            const projects = await projectResponse.json();
            const targetProject = projects.find((p: any) => p.id === acceptedInvitation.projectId);
            
            if (targetProject) {
              // 현재 사용자 ID 가져오기
              let inviteeUserId = null;
              
              if (currentUser) {
                inviteeUserId = currentUser.id;
              } else {
                // 신규 사용자의 경우 이메일로 사용자 조회 시도
                try {
                  const userResponse = await fetch(`/api/users/by-email/${encodeURIComponent(userEmail)}`);
                  if (userResponse.ok) {
                    const userData = await userResponse.json();
                    inviteeUserId = userData.id;
                  } else if (userResponse.status === 404) {
                    // 신규 사용자이므로 백엔드에 생성
                    console.log('신규 사용자 생성 중...');
                    
                    // 강력한 임의 비밀번호 생성 (초대 기반 계정이므로 사용자가 나중에 변경)
                    const generateRandomPassword = () => {
                      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                      let result = '';
                      for (let i = 0; i < 16; i++) {
                        result += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      return result;
                    };
                    
                    const createUserResponse = await fetch('/api/users', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        username: userEmail.split('@')[0], // 이메일의 앞부분을 username으로 사용
                        email: userEmail,
                        password: generateRandomPassword(), // 강력한 임의 비밀번호
                        name: userEmail.split('@')[0], // 이메일의 앞부분을 이름으로 사용
                        initials: userEmail.charAt(0).toUpperCase(), // 첫 글자를 이니셜로 사용
                      })
                    });
                    
                    if (createUserResponse.ok) {
                      const newUser = await createUserResponse.json();
                      inviteeUserId = newUser.id;
                      console.log('신규 사용자 생성 완료:', newUser);
                    } else {
                      console.error('신규 사용자 생성 실패');
                    }
                  }
                } catch (error) {
                  console.error('사용자 조회/생성 중 오류:', error);
                }
              }
              
              // 프로젝트 ownerIds에 사용자 추가
              if (inviteeUserId && !(targetProject.ownerIds || []).includes(inviteeUserId)) {
                const updatedOwnerIds = [...(targetProject.ownerIds || []), inviteeUserId];
                
                // 프로젝트 업데이트 API 호출
                const updateResponse = await fetch(`/api/projects/${targetProject.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ownerIds: updatedOwnerIds
                  })
                });
                
                if (updateResponse.ok) {
                  console.log('프로젝트 멤버로 성공적으로 추가됨');
                  toast({
                    title: "멤버 추가 완료",
                    description: `${acceptedInvitation.projectName}의 멤버로 추가되었습니다.`,
                  });
                } else {
                  console.error('프로젝트 멤버 추가 실패');
                  const errorText = await updateResponse.text();
                  console.error('Error details:', errorText);
                  
                  // 초대 상태 롤백 (다시 pending으로 되돌림)
                  const rollbackInvitations = receivedInvitations.map((inv: any) => 
                    inv.id === invitationId ? { ...inv, status: 'pending' } : inv
                  );
                  localStorage.setItem(`receivedInvitations_${userEmail}`, JSON.stringify(rollbackInvitations));
                  
                  toast({
                    title: "멤버 추가 실패",
                    description: "프로젝트 멤버 추가 중 오류가 발생했습니다. 다시 시도해주세요.",
                    variant: "destructive",
                  });
                  
                  // 초대 목록 새로고침
                  setInvitations(rollbackInvitations.filter((inv: any) => inv.status === 'pending'));
                  return; // 초기 성공 토스트와 플래그 클리어 방지
                }
              }
            }
          } catch (error) {
            console.error('프로젝트 멤버 추가 중 오류:', error);
          }
        }
        
        // 초대 수락 기록 저장 (새로고침 후에도 유지)
        localStorage.setItem(`hasAcceptedInvitation_${userEmail}`, 'true');
        setIsNewUser(false);
      }

      // 모든 초대를 처리했다면 다이얼로그 닫기
      if (invitations.length <= 1) {
        setIsInviteDialogOpen(false);
      }
    } catch (error) {
      console.error('초대 응답 처리 중 오류:', error);
    }
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
          {isUserInfoLoaded && mockWorkspaces
            .filter(workspace => {
              // 신규 사용자는 워크스페이스 숨김 (새 워크스페이스 추가만 표시)
              if (isNewUser) {
                return false;
              }
              // admin 사용자는 메인 프로젝트만 표시
              if (isAdminUser) {
                return workspace.name === "메인 프로젝트";
              }
              // 기존 등록된 사용자는 모든 워크스페이스 표시
              return true;
            })
            .map((workspace) => (
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

      {/* 초대 알림 다이얼로그 */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              워크스페이스 초대
            </DialogTitle>
            <DialogDescription>
              새로운 워크스페이스 초대가 도착했습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{invitation.inviterUsername}님의 초대</p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.role} 권한으로 워크스페이스에 초대했습니다.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleInviteResponse(invitation.id, 'accept')}
                      className="flex-1"
                      data-testid={`button-accept-invite-${invitation.id}`}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      수락
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInviteResponse(invitation.id, 'decline')}
                      className="flex-1"
                      data-testid={`button-decline-invite-${invitation.id}`}
                    >
                      <X className="h-4 w-4 mr-2" />
                      거절
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {invitations.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">처리할 초대가 없습니다.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}