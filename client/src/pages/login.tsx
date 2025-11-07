import { useState } from "react";
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
import { CheckSquare, Eye, EyeOff } from "lucide-react";
import api from "@/api/api-index";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);

    // ⭐⭐⭐ 1. 로컬 테스트 계정 하드코딩 처리 (핵심 수정 부분) ⭐⭐⭐
    const testEmail = "admin@qubicom.co.kr";
    const testPassword = "1"; // 테스트 비밀번호 (임의 설정)

    if (
      data.email.toLowerCase() === testEmail &&
      data.password === testPassword
    ) {
      console.log("Login successful with test account:", testEmail);

      // 더미 사용자 정보
      const dummyUser = {
        id: "test-admin-123",
        name: "관리자 (테스트)",
        initials: "AD",
        role: "admin",
      };

      // 로그인 상태와 사용자 정보를 localStorage에 저장
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", testEmail);
      localStorage.setItem("userId", dummyUser.id);
      localStorage.setItem("userName", dummyUser.name);
      localStorage.setItem("userInitials", dummyUser.initials);
      localStorage.setItem("userRole", dummyUser.role);

      // 워크스페이스 관리 페이지로 이동
      setLocation("/workspace");
      setIsLoading(false);
      return; // 하드코딩된 로직이 실행되면 여기서 종료
    }
    // ⭐⭐⭐ 로컬 테스트 계정 하드코딩 처리 끝 ⭐⭐⭐

    // try {
    //   console.log("Login attempt:", data);

    //   // 사용자 정보 조회
    //   const response = await fetch(
    //     `/api/users/by-email/${encodeURIComponent(data.email)}`
    //   );
    //   if (!response.ok) {
    //     throw new Error("사용자를 찾을 수 없습니다");
    //   }

    //   const user = await response.json();
    //   console.log("Found user:", user);

    //   // 로그인 상태와 사용자 정보를 localStorage에 저장
    //   localStorage.setItem("isLoggedIn", "true");
    //   localStorage.setItem("userEmail", data.email);
    //   localStorage.setItem("userId", user.id); // 실제 사용자 ID 저장
    //   localStorage.setItem("userName", user.name);
    //   localStorage.setItem("userInitials", user.initials);
    //   localStorage.setItem("userRole", user.role);

    //   // 워크스페이스 관리 페이지로 이동
    //   setLocation("/workspace");
    // } catch (error) {
    //   console.error("Login error:", error);
    //   // TODO: 에러 메시지 표시
    // } finally {
    //   setIsLoading(false);
    // }

    /////////////////////
    try {
      console.log("Login attempt:", data);

      // 1. 사용자 정보 조회
      // -----------------------------------------------------------------
      // 🚩 [수정] fetch('/api/users/by-email/...') 대신 api.get 사용
      const response = await api.get(`/api/users/by-email/${data.email}`);

      // Axios는 4xx/5xx 상태 코드에서 자동으로 에러를 throw하므로
      // if (!response.ok) { throw new Error(...) } 체크가 필요 없습니다.

      const user = response.data; // Axios가 JSON을 자동으로 파싱합니다.
      // -----------------------------------------------------------------

      console.log("Found user:", user);

      // 로그인 상태와 사용자 정보를 localStorage에 저장
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("userId", user.id); // 실제 사용자 ID 저장
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userInitials", user.initials);
      localStorage.setItem("userRole", user.role);

      // 워크스페이스 관리 페이지로 이동
      setLocation("/workspace");
    } catch (error) {
      console.error("Login error:", error);
      // TODO: 에러 메시지 표시
    } finally {
      setIsLoading(false);
    }
    /////////////////////
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
            <CardDescription>계정 정보를 입력해주세요</CardDescription>
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
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="이메일을 입력하세요"
                        {...field}
                        data-testid="input-email"
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
                    <FormLabel htmlFor="login-pass-id">비밀번호</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="login-pass-id"
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link href="/signup">
                <span
                  className="text-primary hover:underline cursor-pointer"
                  data-testid="link-signup"
                >
                  회원가입
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
