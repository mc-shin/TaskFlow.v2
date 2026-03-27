// JWT 인증 유틸리티 (HTTP-Only Cookie 방식)
//
// [보안 원칙]
// - accessToken / refreshToken은 서버가 Set-Cookie (HttpOnly, Secure, SameSite=Strict)로 설정
// - 프론트엔드 JavaScript는 토큰에 접근 불가 → XSS로 토큰 탈취 차단
// - 브라우저가 withCredentials: true 요청 시 쿠키를 자동으로 포함
// - localStorage에는 UI 표시용 사용자 정보만 저장 (비민감 데이터)

import api from "@/api/api-index";

// --- 사용자 정보 (UI 표시용, 비민감 데이터만) ---

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
}

export function saveUserInfo(user: UserInfo): void {
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userEmail", user.email);
  localStorage.setItem("userId", user.id);
  localStorage.setItem("userName", user.name);
  localStorage.setItem("userInitials", user.initials);
  localStorage.setItem("userRole", user.role);
}

export function getUserInfo(): UserInfo | null {
  const email = localStorage.getItem("userEmail");
  if (!email) return null;

  return {
    id: localStorage.getItem("userId") || "",
    name: localStorage.getItem("userName") || "",
    email,
    initials: localStorage.getItem("userInitials") || "",
    role: localStorage.getItem("userRole") || "",
  };
}

export function clearUserInfo(): void {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userInitials");
  localStorage.removeItem("userRole");
  localStorage.removeItem("expiresAt");
}

// --- 인증 상태 확인 (서버에 확인 요청) ---

/**
 * 서버에 현재 인증 상태를 확인합니다.
 * HTTP-Only 쿠키는 JS에서 읽을 수 없으므로 서버에 직접 물어봐야 합니다.
 *
 * GET /api/auth/me → 200 (인증됨) or 401 (미인증)
 */
export async function checkAuthStatus(): Promise<UserInfo | null> {
  try {
    const response = await api.get("/api/auth/me");
    return response.data as UserInfo;
  } catch {
    return null;
  }
}

/**
 * 로컬 저장소 기준으로 로그인 여부를 빠르게 확인합니다.
 * (쿠키 유효성까지는 보장하지 않음 — UI 힌트용)
 */
export function isLoggedIn(): boolean {
  return localStorage.getItem("isLoggedIn") === "true";
}

// --- 로그아웃 ---

/**
 * 서버에 로그아웃 요청을 보내 HTTP-Only 쿠키를 삭제합니다.
 * POST /api/auth/logout → 서버가 Set-Cookie로 쿠키를 만료시킴
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/api/auth/logout");
  } catch {
    // 서버 오류가 나더라도 클라이언트 정리는 진행
  } finally {
    clearUserInfo();
  }
}
