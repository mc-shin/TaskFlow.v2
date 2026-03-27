import { clearUserInfo } from "@/lib/auth";
import axios from "axios";

// 1. 환경 변수 읽기
// 개발환경 (배포할땐 비활성화)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

if (!apiBaseUrl) {
  // 개발 환경이나 배포 환경에서 설정 누락 시 경고
  console.error(
    "VITE_API_BASE_URL 환경 변수가 설정되지 않았습니다. API 호출이 실패할 수 있습니다."
  );
  // 환경 변수가 없을 경우 상대 경로를 사용하도록 fallback (로컬 개발 환경의 프록시 설정에 의존)
}

// 2. Axios 인스턴스의 baseURL로 설정
const api = axios.create({
  // apiBaseUrl이 있다면 해당 주소를, 없다면 undefined를 사용 (Axios는 undefined일 경우 상대 경로 사용)
  baseURL: apiBaseUrl,    // 개발환경 (배포할땐 비활성화)
  // baseURL: "",   // 실제 환경
  withCredentials: true, // 쿠키/세션 기반 인증을 위해 필수
  headers: {
    "Content-Type": "application/json",
  },
});

// ── CSRF 토큰 초기화 ──
export async function initCsrf() {
  try {
    const { data } = await api.get("/api/csrf-token");
    api.defaults.headers.common["X-CSRF-Token"] = data.csrfToken;
  } catch (error) {
    console.error("CSRF 토큰 초기화 실패:", error);
  }
}

// 요청 인터셉터
// HTTP-Only 쿠키 방식이므로 Authorization 헤더를 수동으로 추가할 필요 없음
// 브라우저가 쿠키를 자동으로 포함시킴
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 에러 시 토큰 갱신 시도
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 아직 재시도하지 않은 요청인 경우
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/api/login" &&
      originalRequest.url !== "/api/token/refresh" &&
      originalRequest.url !== "/api/auth/me" &&
      originalRequest.url !== "/api/auth/logout"
    ) {
      originalRequest._retry = true;

      try {
        // 리프레시 토큰 쿠키를 사용하여 새 액세스 토큰 요청
        // 서버가 새 HTTP-Only 쿠키를 Set-Cookie로 설정해줌
        await axios.post("/api/token/refresh", null, {
          withCredentials: true,
        });

        // 새 쿠키가 설정되었으므로 원래 요청을 재시도
        return api(originalRequest);
      } catch {
        // 리프레시 토큰도 만료된 경우 로그아웃 처리
        clearUserInfo();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
