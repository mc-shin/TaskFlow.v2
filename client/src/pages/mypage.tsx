import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Mail,
  ArrowLeft,
  Camera,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// 1. 비밀번호 변경 스키마 (SignupPage의 로직 적용)
const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[!@#$%^*+=-])(?=.*[0-9]).{8,15}$/,
        "영문, 숫자, 특수문자를 포함해야 합니다"
      ),
    newPassword: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[!@#$%^*+=-])(?=.*[0-9]).{8,15}$/,
        "영문, 숫자, 특수문자를 포함해야 합니다"
      ),
    confirmPassword: z.string().min(8, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "새 비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function MyPage() {
  const { toast } = useToast();
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [, setLocation] = useLocation();
  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "사용자"
  );
  const [userInitials, setUserInitials] = useState(
    localStorage.getItem("userInitials") || "사"
  );
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // 비밀번호 일치 상태 (UI 아이콘용)
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    mode: "onTouched",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // 비밀번호 일치 실시간 감지 (SignupPage 로직)
  const watchNew = form.watch("newPassword");
  const watchConfirm = form.watch("confirmPassword");

  const handleBack = () => {
    window.history.back();
  };

  const handleLogout = () => {
    localStorage.clear();
    setLocation("/");
  };

  useEffect(() => {
    if (!watchNew || !watchConfirm) setPasswordsMatch(null);
    else setPasswordsMatch(watchNew === watchConfirm);
  }, [watchNew, watchConfirm]);

  const onUpdateProfile = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId)
      return toast({
        title: "로그인 정보가 없습니다.",
        variant: "destructive",
      });

    setIsProfileLoading(true);
    try {
      const updatedUser = await apiRequest(
        "PATCH",
        `/api/users/${userId}/profile`,
        {
          name: userName,
        }
      );

      localStorage.setItem("userName", updatedUser.name);
      localStorage.setItem("userInitials", updatedUser.initials);
      setUserInitials(updatedUser.initials);

      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      toast({ title: "프로필 저장 완료" });
    } catch (error: any) {
      console.error("Update profile error:", error);

      // 에러 객체 내부에 메시지가 있다면 추출
      const errorMessage =
        error.message || "프로필 수정 중 오류가 발생했습니다.";

      toast({
        title: "저장 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  // 2. 비밀번호 업데이트
  const onUpdatePassword = async (data: PasswordForm) => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    setIsPasswordLoading(true);
    try {
      await apiRequest("PATCH", `/api/users/${userId}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast({ title: "비밀번호가 변경되었습니다." });
      form.reset();
    } catch (error: any) {
      const errorMessage = error.message || "";

      if (
        errorMessage.includes("비밀번호") ||
        errorMessage.includes("password") ||
        error.status === 400
      ) {
        form.setError("currentPassword", {
          type: "manual",
          message: "현재 비밀번호가 일치하지 않습니다.",
        });
      } else {
        toast({
          title: "변경 실패",
          description: errorMessage || "비밀번호 확인 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleFeatureNotReady = () => {
    toast({
      title: "안내",
      description: "사진 변경은 추후 업데이트될 예정입니다.",
      // 조금 더 부드러운 느낌을 주려면 variant를 생략(기본)하거나 설정하세요.
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">마이페이지</h1>
              <p className="text-sm text-muted-foreground">
                개인 정보 및 보안 설정
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-transparent text-red-500 border-red-500 border hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>

        <Separator />

        {/* 프로필 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">기본 프로필</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-8 items-center">
            {/* 왼쪽: 프로필 이미지 영역 */}
            <div className="flex flex-col items-center space-y-3 mx-auto md:mx-0">
              <div className="relative group">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-3xl text-primary-foreground font-bold shadow-sm border-4 border-background">
                  {userInitials}
                </div>
                {/* 사진 변경 버튼을 이미지 위에 겹치거나 바로 아래에 배치 */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8 shadow-md border border-border"
                  onClick={handleFeatureNotReady}
                  title="사진 변경"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                프로필 이미지
              </span>
            </div>

            {/* 오른쪽: 입력 필드 영역 */}
            <div className="flex-1 w-full space-y-5">
              {/* 이름 필드 */}
              <div className="grid gap-2.5">
                <Label
                  htmlFor="name"
                  className="text-sm font-semibold flex items-center"
                >
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  이름
                </Label>
                <Input
                  id="name"
                  placeholder="이름을 입력하세요"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="focus-visible:ring-primary"
                />
              </div>

              {/* 이메일 필드 (비활성) */}
              <div className="grid gap-2.5">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold flex items-center opacity-70"
                >
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  이메일 주소
                </Label>
                <Input
                  id="email"
                  value={localStorage.getItem("userEmail") || ""}
                  disabled
                  className="bg-muted/50 cursor-not-allowed border-dashed"
                />
                <p className="text-[12px] text-muted-foreground font-bold ml-3">
                  이메일은 변경할 수 없습니다.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t p-4 flex justify-end">
            <Button onClick={onUpdateProfile} disabled={isProfileLoading}>
              {isProfileLoading ? "저장 중..." : "프로필 저장"}
            </Button>
          </CardFooter>
        </Card>

        {/* 비밀번호 변경 섹션 (SignupPage 스타일 적용) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> 비밀번호 변경
            </CardTitle>
            <CardDescription>
              보안 규칙: 영문, 숫자, 특수문자 포함 8~15자
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onUpdatePassword)}
                className="space-y-4"
              >
                {/* 현재 비밀번호 */}
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel htmlFor="mypage-pass-id">
                        현재 비밀번호
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="mypage-pass-id"
                            type={showPass.current ? "text" : "password"}
                            placeholder="현재 비밀번호를 입력하세요"
                            {...field}
                            data-testid="current-password"
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
                            className="absolute right-0 top-0 h-full hover:bg-transparent"
                            onClick={() =>
                              setShowPass((prev) => ({
                                ...prev,
                                current: !prev.current,
                              }))
                            }
                          >
                            {showPass.current ? (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 새 비밀번호 */}
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel htmlFor="mypage-new-pass-id">
                          새 비밀번호
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              id="mypage-new-pass-id"
                              type={showPass.new ? "text" : "password"}
                              placeholder="새 비밀번호를 입력하세요"
                              {...field}
                              data-testid="input-new-password"
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
                              className="absolute right-0 top-0 h-full hover:bg-transparent"
                              onClick={() =>
                                setShowPass((prev) => ({
                                  ...prev,
                                  new: !prev.new,
                                }))
                              }
                              data-testid="button-toggle-password"
                            >
                              {showPass.new ? (
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

                  {/* 새 비밀번호 확인 */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel htmlFor="mypage-pass-check-id">
                          비밀번호 확인
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              id="mypage-pass-check-id"
                              type={showPass.confirm ? "text" : "password"}
                              placeholder="새 비밀번호를 다시 입력하세요"
                              {...field}
                              data-testid="input-confirm-password"
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
                            <div className="absolute right-10 top-0 h-full flex items-center">
                              {passwordsMatch === true && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {passwordsMatch === false && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowPass((prev) => ({
                                  ...prev,
                                  confirm: !prev.confirm,
                                }))
                              }
                              data-testid="button-toggle-confirm-password"
                            >
                              {showPass.confirm ? (
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
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isPasswordLoading || passwordsMatch === false}
                  >
                    {isPasswordLoading ? "변경 중..." : "비밀번호 업데이트"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* 위험 구역 */}
        {/* <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg text-red-500">위험 구역</CardTitle>
            <CardDescription>계정 탈퇴 시 복구가 불가능합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              회원 탈퇴
            </Button>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
