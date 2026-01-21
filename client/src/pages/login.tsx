import { useEffect, useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckSquare, Eye, EyeOff, AlertCircle } from "lucide-react";
import api from "@/api/api-index";
import axios, { AxiosError } from "axios";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 주소를 입력해주세요")
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/,
      "올바른 이메일 형식이어야 합니다 (예: user@example.co.kr)"
    ),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다") // 보안상 8자 이상 권장
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[!@#$%^*+=-])(?=.*[0-9]).{8,15}$/,
      "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다"
    ),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post("/api/login", {
        email: data.email,
        password: data.password,
      });

      const user = response.data;

      // 로그인 상태와 사용자 정보를 localStorage에 저장
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userInitials", user.initials);
      localStorage.setItem("userRole", user.role);

      // 워크스페이스 관리 페이지로 이동
      setLocation("/workspace");
    } catch (error: unknown) {
      console.error("Login error:", error);

      let errorMessage = "로그인 중 오류가 발생했습니다.";

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          errorMessage = "등록되지 않은 이메일입니다.";
        } else if (status === 401) {
          // [추가] 비밀번호 틀림 처리
          errorMessage = "비밀번호가 틀렸습니다. 다시 확인해주세요.";
        } else {
          errorMessage = "서버 오류가 발생했습니다. 잠시 후 시도해주세요.";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 특정 필드의 값 변화를 감시합니다.
  const watchAllFields = form.watch();

  // 값이 변경될 때마다 에러 메시지를 초기화합니다.
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [watchAllFields.email, watchAllFields.password]); // 이메일이나 비밀번호가 수정되면 실행

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
          {error && (
            <Alert
              // variant="destructive"
              className="mb-4 border-red-500 text-red-500"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription>{error}</AlertDescription>
              </div>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="이메일을 입력하세요"
                        {...field}
                        data-testid="input-email"
                        className={(fieldState.error || error) ? "border-red-500 focus-visible:ring-0 outline-none" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
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
                          className={(fieldState.error || error) ? "border-red-500 focus-visible:ring-0 outline-none" : ""}
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
