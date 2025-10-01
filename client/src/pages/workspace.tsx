import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Settings, Users, Calendar, LogOut, Mail, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { ProjectWithDetails } from "@shared/schema";

const workspaceSchema = z.object({
  name: z.string().min(1, "워크스페이스 이름을 입력해주세요"),
  description: z.string().optional(),
});

const workspaceSettingsSchema = z.object({
  name: z.string().min(1, "워크스페이스 이름을 입력해주세요"),
  description: z.string().optional(),
});

type WorkspaceForm = z.infer<typeof workspaceSchema>;
type WorkspaceSettingsForm = z.infer<typeof workspaceSettingsSchema>;


export function WorkspacePage() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [userName, setUserName] = useState("사용자");
  const [workspaceName, setWorkspaceName] = useState("TaskFlow");
  const [workspaceDescription, setWorkspaceDescription] = useState("주요 업무 관리 워크스페이스");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isUserInfoLoaded, setIsUserInfoLoaded] = useState(false);
  const { toast } = useToast();

  // 실제 프로젝트 데이터 가져오기
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // 실제 사용자 데이터 가져오기 (워크스페이스 멤버)
  const { data: workspaceUsers } = useQuery({
    queryKey: ["/api/users", { workspace: true }],
    queryFn: () => fetch('/api/users?workspace=true').then(res => res.json()),
  });

  // 실제 데이터를 기반으로 워크스페이스 정보 생성 (메모화)
  const workspaceData = useMemo(() => {
    // 사용자 정보 로딩이 완료되지 않으면 빈 배열 반환
    if (!isUserInfoLoaded) {
      return [];
    }
    
    // 먼저 사용자 권한 체크 - 권한이 없으면 아예 빈 배열 반환
    const hasAcceptedInvitation = localStorage.getItem(`hasAcceptedInvitation_${localStorage.getItem("userEmail")}`) === 'true';
    
    // 신규 사용자이고, admin도 아니고, 초대도 수락하지 않은 경우 빈 배열 반환
    if (isNewUser && !isAdminUser && !hasAcceptedInvitation) {
      return [];
    }
    
    // admin이 아니고 초대를 수락하지 않은 경우 빈 배열 반환
    if (!isAdminUser && !hasAcceptedInvitation) {
      return [];
    }
    
    if (!projects || !workspaceUsers || !Array.isArray(projects) || !Array.isArray(workspaceUsers)) {
      return [];
    }
    
    const projectList = projects as ProjectWithDetails[];
    const memberCount = workspaceUsers.length;
    const projectCount = projectList.length;
    
    // 가장 오래된 프로젝트의 생성일 찾기
    const oldestProject = projectList.reduce((oldest, current) => {
      if (!oldest.createdAt || !current.createdAt) return oldest;
      return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
    }, projectList[0]);
    
    const lastAccess = oldestProject?.createdAt ? 
      new Date(oldestProject.createdAt).toISOString().split('T')[0] : 
      "2025-09-26";
    
    return [{
      id: "1",
      name: workspaceName,
      description: workspaceDescription,
      memberCount,
      projectCount,
      lastAccess,
    }];
  }, [projects, workspaceUsers, workspaceName, workspaceDescription, isAdminUser, isNewUser, isUserInfoLoaded]);

  useEffect(() => {
    // localStorage에서 사용자 이름 및 워크스페이스 정보 가져오기
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName) {
      setUserName(storedUserName);
    }
    
    // localStorage에서 워크스페이스 정보 가져오기
    const storedWorkspaceName = localStorage.getItem("workspaceName");
    const storedWorkspaceDescription = localStorage.getItem("workspaceDescription");
    if (storedWorkspaceName) {
      setWorkspaceName(storedWorkspaceName);
    }
    if (storedWorkspaceDescription) {
      setWorkspaceDescription(storedWorkspaceDescription);
    }

    // 현재 로그인된 사용자의 이메일을 가져와서 실제 username 찾기
    const checkInvitations = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setIsUserInfoLoaded(true); // userEmail이 없어도 로딩 완료로 설정
        return;
      }

      try {
        // 현재 로그인된 사용자의 실제 정보 가져오기 (워크스페이스 멤버만)
        const response = await fetch('/api/users?workspace=true');
        const users = await response.json();
        
        // userEmail을 기반으로 실제 사용자 매핑
        let currentUser;
        const email = userEmail.toLowerCase();
        
        // 워크스페이스 멤버 목록에서 현재 이메일로 사용자 찾기
        currentUser = users.find((u: any) => u.email?.toLowerCase() === email);
        
        // 특정 사용자에 대한 관리자 권한 설정
        if (email.includes('admin') || email === 'admin@qubicom.co.kr') {
          setIsAdminUser(true);
        }
        
        // 레거시 하드코딩된 매핑 (백업용)
        if (!currentUser) {
          if (email.includes('admin') || email === 'admin@qubicom.co.kr') {
            currentUser = users.find((u: any) => u.username === 'admin');
          } else if (email.includes('hyejin') || email === '1@qubicom.co.kr') {
            currentUser = users.find((u: any) => u.username === 'hyejin');
          } else if (email.includes('hyejung') || email === '2@qubicom.co.kr') {
            currentUser = users.find((u: any) => u.username === 'hyejung');
          } else if (email.includes('chamin') || email === '3@qubicom.co.kr') {
            currentUser = users.find((u: any) => u.username === 'chamin');
          }
        }
        
        // 신규가입자인지 확인 (백엔드에 등록되지 않은 사용자)
        // 단, 이전에 초대를 수락한 경우는 신규 사용자가 아님
        const hasAcceptedInvitation = localStorage.getItem(`hasAcceptedInvitation_${userEmail}`) === 'true';
        
        // 워크스페이스 접근 권한은 초대 수락 여부로만 결정
        if (!currentUser && !hasAcceptedInvitation) {
          setIsNewUser(true);
        } else {
          setIsNewUser(false);
        }
        
        let pendingInvitations: any[] = [];
        
        if (currentUser) {
          // 사용자 이름 저장 및 설정
          setUserName(currentUser.name);
          localStorage.setItem("userName", currentUser.name);
        }
        
        // 서버에서 실제 초대 목록 가져오기 (동기화)
        try {
          const serverInvitationsResponse = await fetch(`/api/invitations/email/${encodeURIComponent(userEmail)}`);
          if (serverInvitationsResponse.ok) {
            const serverInvitations = await serverInvitationsResponse.json();
            // 서버에서 가져온 pending 초대만 사용
            pendingInvitations = serverInvitations.filter((inv: any) => inv.status === 'pending');
            
            // localStorage와 동기화 (서버 데이터를 신뢰할 수 있는 소스로 사용)
            localStorage.setItem(`receivedInvitations_${userEmail}`, JSON.stringify(serverInvitations));
          } else {
            // 서버에서 가져오기 실패 시 localStorage 백업 사용
            console.warn('서버에서 초대 목록을 가져올 수 없습니다. localStorage 데이터를 사용합니다.');
            const receivedInvitations = JSON.parse(localStorage.getItem(`receivedInvitations_${userEmail}`) || '[]');
            pendingInvitations = receivedInvitations.filter((inv: any) => inv.status === 'pending');
          }
        } catch (error) {
          console.error('초대 목록 동기화 오류:', error);
          // 오류 시 localStorage 백업 사용
          const receivedInvitations = JSON.parse(localStorage.getItem(`receivedInvitations_${userEmail}`) || '[]');
          pendingInvitations = receivedInvitations.filter((inv: any) => inv.status === 'pending');
        }
        
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
        
        // 이미 표시된 초대 ID 목록 가져오기
        const shownInvitationsKey = `shownInvitations_${userEmail}`;
        const shownInvitations = JSON.parse(localStorage.getItem(shownInvitationsKey) || '[]');
        
        // 새로운 초대(아직 표시되지 않은 초대)가 있는지 확인
        const newInvitations = pendingInvitations.filter((inv: any) => 
          !shownInvitations.includes(inv.id)
        );
        
        // 새로운 초대가 있고 다이얼로그가 닫혀있을 때만 다이얼로그 열기
        if (newInvitations.length > 0 && !isInviteDialogOpen) {
          setIsInviteDialogOpen(true);
          
          // 새로운 초대들을 표시된 목록에 추가
          const updatedShownInvitations = [...shownInvitations, ...newInvitations.map((inv: any) => inv.id)];
          localStorage.setItem(shownInvitationsKey, JSON.stringify(updatedShownInvitations));
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

  const settingsForm = useForm<WorkspaceSettingsForm>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      name: workspaceName,
      description: workspaceDescription,
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

  const onSettingsSubmit = async (data: WorkspaceSettingsForm) => {
    setIsSettingsLoading(true);
    try {
      // localStorage에 워크스페이스 정보 저장
      localStorage.setItem("workspaceName", data.name);
      if (data.description) {
        localStorage.setItem("workspaceDescription", data.description);
      }
      
      // 상태 업데이트
      setWorkspaceName(data.name);
      setWorkspaceDescription(data.description || "주요 업무 관리 워크스페이스");
      
      // 사이드바 실시간 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new Event('workspaceNameUpdated'));
      
      // 다이얼로그 닫기
      setIsSettingsDialogOpen(false);
      
      // 성공 토스트
      toast({
        title: "워크스페이스 설정 완료",
        description: "워크스페이스 정보가 성공적으로 업데이트되었습니다.",
      });
    } catch (error) {
      console.error("Workspace settings update error:", error);
      toast({
        title: "설정 업데이트 실패",
        description: "워크스페이스 설정 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSettingsLoading(false);
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
      // 초대 정보에서 role 가져오기
      const invitation = invitations.find(inv => inv.id === invitationId);
      const invitationRole = invitation?.role || '팀원'; // 기본값은 팀원
      
      // 현재 로그인된 사용자의 실제 username 가져오기 (워크스페이스 멤버만)
      const response = await fetch('/api/users?workspace=true');
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

      // 백엔드에 초대 상태 업데이트 (중요: 이것이 없으면 워크스페이스 멤버로 포함되지 않음!)
      await fetch(`/api/invitations/${invitationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action === 'accept' ? 'accepted' : 'declined'
        })
      });

      // 받은 초대 목록 업데이트
      const receivedInvitations = JSON.parse(localStorage.getItem(`receivedInvitations_${currentEmail}`) || '[]');
      const updatedInvitations = receivedInvitations.map((inv: any) => 
        inv.id === invitationId ? { ...inv, status: action === 'accept' ? 'accepted' : 'declined' } : inv
      );
      localStorage.setItem(`receivedInvitations_${currentEmail}`, JSON.stringify(updatedInvitations));

      // 로컬 상태 업데이트
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      // 표시된 초대 목록에서도 제거 (중복 표시 방지)
      const shownInvitationsKey = `shownInvitations_${currentEmail}`;
      const shownInvitations = JSON.parse(localStorage.getItem(shownInvitationsKey) || '[]');
      const updatedShownInvitations = shownInvitations.filter((id: string) => id !== invitationId);
      localStorage.setItem(shownInvitationsKey, JSON.stringify(updatedShownInvitations));

      // 초대를 수락한 경우 수락 플래그 설정
      if (action === 'accept') {
        localStorage.setItem(`hasAcceptedInvitation_${currentEmail}`, 'true');
        setIsNewUser(false); // 더 이상 신규 사용자가 아님
      }

      toast({
        title: action === 'accept' ? "초대 수락" : "초대 거절",
        description: action === 'accept' ? "워크스페이스에 참여했습니다." : "초대를 거절했습니다.",
      });

      // 초대를 수락한 경우 워크스페이스 멤버로 추가 및 신규 사용자 플래그 클리어
      if (action === 'accept') {
        try {
          // 현재 사용자 ID 가져오기
          let inviteeUserId = null;
          
          if (currentUser) {
            inviteeUserId = currentUser.id;
            
            // 기존 사용자의 role 업데이트
            try {
              await fetch(`/api/users/${currentUser.id}/role`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: invitationRole })
              });
              console.log('기존 사용자 role 업데이트 완료:', invitationRole);
            } catch (error) {
              console.error('기존 사용자 role 업데이트 실패:', error);
            }
          } else {
            // 신규 사용자의 경우 이메일로 사용자 조회 시도
            try {
              const userResponse = await fetch(`/api/users/by-email/${encodeURIComponent(userEmail)}`);
              if (userResponse.ok) {
                const userData = await userResponse.json();
                inviteeUserId = userData.id;
                
                // 기존 사용자의 role 업데이트 (hardcoded mapping에 없는 사용자)
                try {
                  await fetch(`/api/users/${userData.id}/role`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ role: invitationRole })
                  });
                  console.log('기존 사용자 role 업데이트 완료:', invitationRole);
                } catch (error) {
                  console.error('기존 사용자 role 업데이트 실패:', error);
                }
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
                    name: localStorage.getItem("userName") || userEmail.split('@')[0], // 가입시 입력한 이름 우선 사용
                    initials: (localStorage.getItem("userName") || userEmail).charAt(0).toUpperCase(), // 이름의 첫 글자를 이니셜로 사용
                    role: invitationRole, // 초대 시 지정된 권한 적용
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
          
          // 워크스페이스 멤버로 초대 수락 완료
          if (inviteeUserId) {
            console.log('워크스페이스 멤버로 초대 수락 완료');
          }
          
          // 실시간 반영을 위해 관련 캐시 무조건 무효화 (데이터베이스 기준)
          console.log('초대 수락 후 캐시 무효화 시작');
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          queryClient.invalidateQueries({ queryKey: ["/api/users", { workspace: true }] });
          queryClient.invalidateQueries({ queryKey: ["/api/users/with-stats"] });
          queryClient.invalidateQueries({ queryKey: ["/api/users/with-stats", { workspace: true }] });
          
          // 쿼리를 즉시 다시 가져오기 (refetch)
          await queryClient.refetchQueries({ queryKey: ["/api/users", { workspace: true }] });
          await queryClient.refetchQueries({ queryKey: ["/api/users/with-stats", { workspace: true }] });
          console.log('초대 수락 후 캐시 무효화 및 refetch 완료');
          
          toast({
            title: "워크스페이스 참여 완료",
            description: `${workspaceName} 워크스페이스에 참여했습니다.`,
          });
        } catch (error) {
          console.error('워크스페이스 멤버 추가 중 오류:', error);
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

  // 사용자 정보 로딩 중일 때 로딩 화면 제거 (즉시 렌더링)
  // if (!isUserInfoLoaded) {
  //   return null; // 로딩 화면 제거됨
  // }


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
          {isUserInfoLoaded && workspaceData
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
                    // 워크스페이스 설정 다이얼로그 열기
                    settingsForm.reset({
                      name: workspaceName,
                      description: workspaceDescription,
                    });
                    setIsSettingsDialogOpen(true);
                  }} data-testid="button-workspace-settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{workspace.memberCount}명</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{workspace.projectCount}개 프로젝트</span>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {workspace.lastAccess}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Workspace Card */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-dashed" 
            data-testid="card-create-workspace"
            onClick={() => {
              toast({
                title: "준비중입니다",
                description: "새 워크스페이스 기능은 곧 제공될 예정입니다.",
              });
            }}
          >
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
        </div>

      </main>

      {/* 워크스페이스 설정 다이얼로그 */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent data-testid="dialog-workspace-settings">
          <DialogHeader>
            <DialogTitle>워크스페이스 설정</DialogTitle>
            <DialogDescription>
              워크스페이스 정보를 수정하세요.
            </DialogDescription>
          </DialogHeader>
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>워크스페이스 이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: TaskFlow"
                        {...field}
                        data-testid="input-settings-workspace-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={settingsForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택사항)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="워크스페이스에 대한 간단한 설명"
                        {...field}
                        data-testid="input-settings-workspace-description"
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
                  onClick={() => setIsSettingsDialogOpen(false)}
                  data-testid="button-cancel-settings"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSettingsLoading}
                  data-testid="button-save-settings"
                >
                  {isSettingsLoading ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                    <p className="font-medium">{invitation.inviterName || invitation.inviterEmail?.split('@')[0] || '관리자'}님이 보낸 초대</p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.inviterEmail && (
                        <span className="block text-blue-600 mb-1">발신자: {invitation.inviterEmail}</span>
                      )}
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