// import { QueryClient, QueryFunction } from "@tanstack/react-query";

// async function throwIfResNotOk(res: Response) {
//   if (!res.ok) {
//     const text = (await res.text()) || res.statusText;
//     throw new Error(`${res.status}: ${text}`);
//   }
// }

// export async function apiRequest(
//   method: string,
//   url: string,
//   data?: unknown | undefined,
//   customHeaders?: Record<string, string>,
// ): Promise<Response> {
//   const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

//   // 현재 로그인한 사용자 이메일을 헤더에 추가
//   const userEmail = localStorage.getItem("userEmail");
//   if (userEmail) {
//     headers["X-User-Email"] = userEmail;
//   }

//   if (customHeaders) {
//     Object.assign(headers, customHeaders);
//   }

//   const res = await fetch(url, {
//     method,
//     headers,
//     body: data ? JSON.stringify(data) : undefined,
//     credentials: "include",
//   });

//   await throwIfResNotOk(res);
//   return res;
// }

// type UnauthorizedBehavior = "returnNull" | "throw";
// export const getQueryFn: <T>(options: {
//   on401: UnauthorizedBehavior;
// }) => QueryFunction<T> =
//   ({ on401: unauthorizedBehavior }) =>
//   async ({ queryKey }) => {
//     // 현재 로그인한 사용자 이메일을 헤더에 추가
//     const headers: Record<string, string> = {};
//     const userEmail = localStorage.getItem("userEmail");
//     if (userEmail) {
//       headers["X-User-Email"] = userEmail;
//     }

//     const res = await fetch(queryKey.join("/") as string, {
//       credentials: "include",
//       headers,
//     });

//     if (unauthorizedBehavior === "returnNull" && res.status === 401) {
//       return null;
//     }

//     await throwIfResNotOk(res);
//     return await res.json();
//   };

// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       queryFn: getQueryFn({ on401: "throw" }),
//       refetchInterval: false,
//       refetchOnWindowFocus: false,
//       staleTime: Infinity,
//       retry: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import api from "@/api/api-index"; // 👈 [1] 새로 만든 Axios 클라이언트 임포트
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios"; // 👈 Axios 타입 임포트

// ---
// 🚩 [제거] throwIfResNotOk 함수는 Axios의 자동 오류 처리 기능으로 인해 더 이상 필요하지 않습니다.
// ---

/**
 * 범용 API 요청 처리 함수 (POST, PUT, GET 등 모두 처리)
 * @param method HTTP 메서드 (예: 'GET', 'POST')
 * @param url 요청 URL (상대 경로)
 * @param data 요청 본문 데이터 (POST/PUT/PATCH 시)
 * @param customHeaders 추가 헤더
 * @returns 응답 데이터 (JSON 파싱 완료된 객체)
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>
): Promise<T> {
  // 👈 [2] Promise<Response> 대신 Promise<T> (파싱된 데이터) 반환

  // 1. 기본 헤더 설정 (Axios는 Content-Type을 data 유무에 따라 자동으로 설정하므로 생략 가능)
  // X-User-Email 헤더는 계속 유지합니다.
  const headers: Record<string, string> = {};

  // 현재 로그인한 사용자 이메일을 헤더에 추가 (localStorage 사용 유지)
  const userEmail = localStorage.getItem("userEmail");
  if (userEmail) {
    headers["X-User-Email"] = userEmail;
  }

  if (customHeaders) {
    // customHeaders를 headers에 병합합니다.
    Object.assign(headers, customHeaders);
  }

  // 2. Axios 요청 구성 객체를 준비합니다.
  const config: AxiosRequestConfig = {
    headers: headers,
    // [제거] credentials: "include"는 api 인스턴스에 withCredentials: true로 설정되어 있어 불필요.
  };

  let response: AxiosResponse<T>;

  // 3. method에 따라 적절한 Axios 함수를 호출합니다.
  try {
    switch (method.toLowerCase()) {
      case "get":
      case "delete":
        // GET/DELETE는 data(body)를 전달하지 않고, config만 전달합니다.
        // data가 undefined인 경우에도 Axios는 자동으로 body를 설정하지 않습니다.
        response = await api[method.toLowerCase() as "get" | "delete"](
          url,
          config
        );
        break;
      case "post":
      case "put":
      case "patch":
        // POST/PUT/PATCH는 두 번째 인자로 data(body)를 전달하고, 세 번째 인자로 config를 전달합니다.
        response = await api[method.toLowerCase() as "post" | "put" | "patch"](
          url,
          data,
          config
        );
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    // [제거] await throwIfResNotOk(res); 가 필요 없습니다.
    // Axios는 2xx 성공 시에만 이 라인에 도달하며, response.data에 파싱된 데이터가 들어 있습니다.
    return response.data; // 👈 파싱된 데이터 자체를 반환합니다.
  } catch (error) {
    // 4. AxiosError를 포착하여 fetch의 'throwIfResNotOk'와 유사하게 오류를 처리합니다.
    if (axios.isAxiosError(error) && error.response) {
      // 서버 응답이 있는 경우 (4xx, 5xx)
      const status = error.response.status;
      const message =
        (error.response.data as { message?: string })?.message || error.message;
      throw new Error(`${status}: ${message}`);
    }
    // 네트워크 오류 또는 기타 오류
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // 1. 쿼리 키를 URL로 변환 (쿼리 키가 배열로 구성되어 있을 수 있으므로 첫 번째 요소만 사용)
    const url = queryKey.join("/");

    // 2. 인증 헤더 추가 (apiRequest 함수와 동일)
    const headers: Record<string, string> = {};
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
      headers["X-User-Email"] = userEmail;
    }

    try {
      // 🚩 [3] fetch를 api.get으로 교체
      const response = await api.get(url, {
        headers,
        // [제거] credentials: "include"는 api 인스턴스에 설정됨
      });

      // [4] 401 처리는 Axios의 catch에서 처리되므로,
      // 이곳에서는 성공적인 데이터만 반환합니다.
      return response.data;
    } catch (error) {
      // 5. Axios 오류를 포착하여 401을 처리합니다.
      if (axios.isAxiosError(error) && error.response) {
        if (
          unauthorizedBehavior === "returnNull" &&
          error.response.status === 401
        ) {
          return null; // 401 시 null 반환
        }
      }

      // 401이 아니거나 unauthorizedBehavior가 "throw"인 경우 오류를 다시 던집니다.
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
