// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// export default defineConfig({
//   plugins: [
//     react(),
//     runtimeErrorOverlay(),
//     ...(process.env.NODE_ENV !== "production" &&
//     process.env.REPL_ID !== undefined
//       ? [
//           await import("@replit/vite-plugin-cartographer").then((m) =>
//             m.cartographer(),
//           ),
//         ]
//       : []),
//   ],
//   resolve: {
//     alias: {
//       "@": path.resolve(import.meta.dirname, "client", "src"),
//       "@shared": path.resolve(import.meta.dirname, "shared"),
//       "@assets": path.resolve(import.meta.dirname, "attached_assets"),
//     },
//   },
//   root: path.resolve(import.meta.dirname, "client"),
//   build: {
//     outDir: path.resolve(import.meta.dirname, "dist/public"),
//     emptyOutDir: true,
//   },
//   server: {
//     fs: {
//       strict: true,
//       deny: ["**/.*"],
//     },
//   },
// });
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// import.meta.dirname은 일부 환경에서 불안정하므로 안전하게 계산
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // 로컬 클라이언트 루트
  root: resolve(__dirname, "client"),

  /////
  envDir: __dirname,
  /////

  plugins: [
    react(), // Fast Refresh 포함
    // Replit 관련 플러그인/동적 import 제거
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "client", "src"),
      "@shared": resolve(__dirname, "shared"),
      "@assets": resolve(__dirname, "attached_assets"),
    },
  },

  // build: {
  //   // 정적 빌드 산출물: dist/public
  //   outDir: resolve(__dirname, "dist", "public"),
  //   emptyOutDir: true,
  // },
  build: {
    // ⭐️ 이 부분을 'dist'로 변경하거나 아예 삭제해야 합니다.
    // outDir: "dist",

    //////
    // outDir: resolve(__dirname, "dist"),
    outDir: "dist",
    // outDir: "../dist",
    emptyOutDir: true,
    ///////
  },

  server: {
    port: 5173,
    open: true,
    // 🚩 API 요청을 백엔드로 포워딩하는 프록시 설정 추가 (핵심)
    proxy: {
      "/api": {
        target: "http://121.190.39.238:5000", // 백엔드 서버 주소
        changeOrigin: true, // 호스트 헤더를 백엔드 서버의 호스트로 변경
      },
    },
    // 서버 보안/프록시 등은 제거. 로컬 정적 자원만 서비스
  },
});
