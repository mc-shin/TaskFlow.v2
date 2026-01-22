import axios from "axios";

// 1. 환경 변수 읽기
// VITE_ 접두사를 통해 환경 변수(.env.local 또는 Vercel 설정)를 가져옵니다.
// const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

// if (!apiBaseUrl) {
//   // 개발 환경이나 배포 환경에서 설정 누락 시 경고
//   console.error(
//     "VITE_API_BASE_URL 환경 변수가 설정되지 않았습니다. API 호출이 실패할 수 있습니다."
//   );
//   // 환경 변수가 없을 경우 상대 경로를 사용하도록 fallback (로컬 개발 환경의 프록시 설정에 의존)
// }

// 2. Axios 인스턴스의 baseURL로 설정
const api = axios.create({
  // apiBaseUrl이 있다면 해당 주소를, 없다면 undefined를 사용 (Axios는 undefined일 경우 상대 경로 사용)
  // baseURL: apiBaseUrl,
  baseURL: "",
  withCredentials: true, // 쿠키/세션 기반 인증을 위해 필수
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
