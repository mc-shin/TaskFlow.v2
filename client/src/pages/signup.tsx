import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckSquare,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import api from "@/api/api-index";

const signupSchema = z
  .object({
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
    name: z.string().min(1, "이름을 입력해주세요"),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<
    "available" | "taken" | "unchecked"
  >("unchecked");
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const { toast } = useToast();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 이메일 중복확인 함수 (경합 상태 방지)
  const checkEmailDuplicate = useCallback(
    async (email: string) => {
      if (!email || !email.includes("@")) {
        setEmailStatus("unchecked");
        return;
      }

      setEmailCheckLoading(true);

      // try {
      //   // Response 객체를 직접 받기 위해 fetch 사용
      //   const response = await fetch(`/api/users/by-email/${encodeURIComponent(email)}`, {
      //     credentials: "include",
      //   });

      //   // 응답을 받았을 때 현재 이메일과 일치하는지 확인 (경합 상태 방지)
      //   const currentEmail = form.getValues('email');
      //   if (currentEmail !== email) {
      //     // 이메일이 바뀌었으면 이 응답은 무시
      //     return;
      //   }

      //   if (response.status === 200) {
      //     // 사용자가 존재하면 중복
      //     setEmailStatus('taken');
      //   } else if (response.status === 404) {
      //     // 사용자가 없으면 사용 가능
      //     setEmailStatus('available');
      //   } else {
      //     // 기타 오류
      //     setEmailStatus('unchecked');
      //   }
      // } catch (error: any) {
      //   // 에러 시에도 현재 이메일과 일치하는지 확인
      //   const currentEmail = form.getValues('email');
      //   if (currentEmail === email) {
      //     setEmailStatus('unchecked');
      //   }
      // } finally {
      //   setEmailCheckLoading(false);
      // }

      /////////////
      try {
        // 🚩 [수정] fetch 대신 api.get 사용 및 `credentials: "include"` 제거
        // Axios 인스턴스(api)에 이미 `withCredentials: true`가 설정되어 있습니다.
        // -----------------------------------------------------------------
        const response = await api.get(
          `/api/users/by-email/${encodeURIComponent(email)}`
        );
        // -----------------------------------------------------------------

        // 응답을 받았을 때 현재 이메일과 일치하는지 확인 (경합 상태 방지)
        const currentEmail = form.getValues("email");
        if (currentEmail !== email) {
          // 이메일이 바뀌었으면 이 응답은 무시
          return;
        }

        // Axios는 200 (OK) 응답일 때만 이 라인에 도달합니다.
        // 🚩 [수정] response.status === 200 대신 이 라인에 도달한 것 자체로 성공 처리
        setEmailStatus("taken"); // 사용자가 존재하면 중복 (200 OK)
      } catch (error: any) {
        // 에러 시에도 현재 이메일과 일치하는지 확인
        const currentEmail = form.getValues("email");
        if (currentEmail !== email) {
          return; // 이메일이 바뀌었으면 무시
        }

        // 🚩 [수정] Axios 에러 처리 로직 추가
        // -----------------------------------------------------------------
        // AxiosError 타입인지 확인하고, 서버 응답이 있는지 확인합니다.
        if (error.response && error.response.status === 404) {
          // 404 Not Found는 사용자가 없음을 의미합니다.
          setEmailStatus("available"); // 사용자가 없으면 사용 가능 (404 Not Found)
        } else {
          // 404가 아니거나 네트워크 오류인 경우
          console.error("Email check failed with error:", error);
          setEmailStatus("unchecked");
        }
        // -----------------------------------------------------------------
      } finally {
        setEmailCheckLoading(false);
      }
      /////////////
    },
    [form]
  );

  // 이메일 변경 감지
  const watchEmail = form.watch("email");
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkEmailDuplicate(watchEmail);
    }, 500); // 500ms 지연으로 API 호출 최적화

    return () => clearTimeout(timeoutId);
  }, [watchEmail, checkEmailDuplicate]);

  // 비밀번호 일치 여부 확인
  const watchPassword = form.watch("password");
  const watchConfirmPassword = form.watch("confirmPassword");
  useEffect(() => {
    if (!watchPassword || !watchConfirmPassword) {
      setPasswordsMatch(null);
    } else if (watchPassword === watchConfirmPassword) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  }, [watchPassword, watchConfirmPassword]);

  const onSubmit = async (data: SignupForm) => {
    // 이메일 중복 체크
    if (emailStatus === "taken") {
      toast({
        title: "회원가입 실패",
        description: "이미 사용 중인 이메일입니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 실제 회원가입 API 호출
      const { confirmPassword, ...userData } = data;

      // 이름에서 이니셜 자동 생성 (첫 글자)
      const initials = userData.name.charAt(0);

      await apiRequest("POST", "/api/users", {
        email: userData.email,
        username: userData.email, // 이메일을 username으로 사용 (유니크 보장)
        name: userData.name,
        password: userData.password,
        initials: initials,
        role: "팀원", // 기본 역할
      });

      toast({
        title: "회원가입 성공",
        description: "계정이 성공적으로 생성되었습니다. 로그인해주세요.",
      });

      // 로그인 페이지로 이동
      setLocation("/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = "회원가입 중 오류가 발생했습니다.";

      if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 400) {
        errorMessage = "입력한 정보를 다시 확인해주세요.";
      }

      toast({
        title: "회원가입 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <CheckSquare className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">프로젝트 관리 시스템</CardTitle>
            <CardDescription>새 계정을 생성해주세요</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="signup-email-id">이메일</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="signup-email-id"
                          type="email"
                          placeholder="이메일을 입력하세요"
                          {...field}
                          data-testid="input-email"
                          className={
                            emailStatus === "taken"
                              ? "border-red-500"
                              : emailStatus === "available"
                              ? "border-green-500"
                              : ""
                          }
                        />
                        {emailCheckLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                          </div>
                        )}
                        {!emailCheckLoading && emailStatus === "available" && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                        {!emailCheckLoading && emailStatus === "taken" && (
                          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {emailStatus === "taken" && (
                      <p className="text-sm text-red-500 mt-1">
                        이미 사용 중인 이메일입니다.
                      </p>
                    )}
                    {emailStatus === "available" && (
                      <p className="text-sm text-green-500 mt-1">
                        사용 가능한 이메일입니다.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="이름을 입력하세요"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="signup-pass-id">비밀번호</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="signup-pass-id"
                          type={showPassword ? "text" : "password"}
                          placeholder="비밀번호를 입력하세요"
                          {...field}
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="signup-pass-check-id">
                      비밀번호 확인
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="signup-pass-check-id"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="비밀번호를 다시 입력하세요"
                          {...field}
                          data-testid="input-confirm-password"
                          className={
                            passwordsMatch === false
                              ? "border-red-500"
                              : passwordsMatch === true
                              ? "border-green-500"
                              : ""
                          }
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center">
                          {passwordsMatch === true && (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          )}
                          {passwordsMatch === false && (
                            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {passwordsMatch === false && (
                      <p className="text-sm text-red-500 mt-1">
                        비밀번호가 일치하지 않습니다.
                      </p>
                    )}
                    {passwordsMatch === true && (
                      <p className="text-sm text-green-500 mt-1">
                        비밀번호가 일치합니다.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  emailStatus === "taken" ||
                  emailCheckLoading ||
                  passwordsMatch === false
                }
                data-testid="button-signup"
              >
                {isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login">
                <span
                  className="text-primary hover:underline cursor-pointer"
                  data-testid="link-login"
                >
                  로그인
                </span>
              </Link>
            </p>
            <Link href="/">
              <span
                className="text-sm text-muted-foreground hover:underline cursor-pointer"
                data-testid="link-home"
              >
                홈으로 돌아가기
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
