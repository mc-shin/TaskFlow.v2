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
    email: z
      .string()
      .min(1, "이메일을 입력해 주세요.")
      .email("올바른 이메일 주소를 입력해주세요")
      .regex(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/,
        "올바른 이메일 형식이어야 합니다 (예: user@example.co.kr)"
      ),
    name: z.string().min(1, "이름을 입력해주세요"),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다") // 보안상 8자 이상 권장
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[!@#$%^*+=-])(?=.*[0-9]).{8,15}$/,
        "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다"
      ),
    confirmPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"), // 보안상 8자 이상 권장,
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
    mode: "onTouched",
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

      try {
        const response = await api.get(
          `/api/users/by-email/${encodeURIComponent(email)}`
        );

        const currentEmail = form.getValues("email");
        if (currentEmail !== email) {
          // 이메일이 바뀌었으면 이 응답은 무시
          return;
        }

        setEmailStatus("taken"); // 사용자가 존재하면 중복 (200 OK)
      } catch (error: any) {
        const currentEmail = form.getValues("email");
        if (currentEmail !== email) {
          return; // 이메일이 바뀌었으면 무시
        }

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
                render={({ field, fieldState }) => (
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
                            fieldState.error || emailStatus === "taken"
                              ? "border-red-500 focus-visible:ring-0 outline-none" // 에러가 있거나 중복일 때
                              : emailStatus === "available"
                              ? "border-green-500" // 사용 가능할 때
                              : "" // 기본 상태
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
                    {/* {emailStatus === "taken" && (
                      <p className="text-sm text-red-500 mt-1">
                        이미 사용 중인 이메일입니다.
                      </p>
                    )}
                    {emailStatus === "available" && (
                      <p className="text-sm text-green-500 mt-1">
                        사용 가능한 이메일입니다.
                      </p>
                    )}
                     */}
                    {!form.formState.errors.email && (
                      <>
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
                      </>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="이름을 입력하세요"
                        {...field}
                        data-testid="input-name"
                        className={
                          fieldState.error
                            ? "border-red-500 focus-visible:ring-0 outline-none"
                            : ""
                        }
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
                    {/* <FormLabel htmlFor="signup-pass-id">비밀번호</FormLabel> */}
                    <div className="h-[24px] flex justify-between items-center">
                      <FormLabel htmlFor="signup-pass-id">비밀번호</FormLabel>
                      <span className="text-[11px] text-muted-foreground">
                        영문, 숫자, 특수문자 포함 8~15자
                      </span>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="signup-pass-id"
                          type={showPassword ? "text" : "password"}
                          placeholder="비밀번호를 입력하세요"
                          {...field}
                          data-testid="input-password"
                          className={
                            fieldState.error
                              ? "border-red-500 focus-visible:ring-0 outline-none"
                              : ""
                          }
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
                render={({ field, fieldState }) => (
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
                          // className={
                          //   passwordsMatch === false
                          //     ? "border-red-500"
                          //     : passwordsMatch === true
                          //     ? "border-green-500"
                          //     : ""
                          // }
                          className={`
                ${
                  fieldState.error || passwordsMatch === false
                    ? "!border-red-500 !ring-0 !ring-offset-0"
                    : passwordsMatch === true
                    ? "!border-green-500 !ring-0 !ring-offset-0"
                    : ""
                }
              `}
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
                    {/* {passwordsMatch === false && (
                      <p className="text-sm text-red-500 mt-1">
                        비밀번호가 일치하지 않습니다.
                      </p>
                    )}
                    {passwordsMatch === true && (
                      <p className="text-sm text-green-500 mt-1">
                        비밀번호가 일치합니다.
                      </p>
                    )} */}
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
