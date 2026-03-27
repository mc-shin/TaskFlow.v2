import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/api/api-index";
import { clearUserInfo } from "@/lib/auth";

const WARN_BEFORE = 10 * 60 * 1000; // 만료 10분 전 알림

export function useSessionWarning() {
  const [visible, setVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<number>(0);

  const clearTimers = () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    countdownRef.current = null;
  };

  // 카운트다운 시작
  const startCountdown = () => {
    // 모달 표시 전에 남은 시간을 즉시 계산하여 설정
    const remaining = Math.max(
      0,
      Math.floor((expiresAtRef.current - Date.now()) / 1000),
    );
    setRemainingSeconds(remaining);
    setVisible(true);

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAtRef.current - Date.now()) / 1000),
      );
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearTimers();
        clearUserInfo();
        // window.location.href = "/login";
      }
    }, 1000);
  };

  // 타이머 시작 (로그인 또는 연장 후 호출)
  const startTimer = useCallback((expiresIn: number) => {
    clearTimers();
    setVisible(false);
    setRemainingSeconds(0); // 상태 초기화

    const newExpiresAt = Date.now() + expiresIn;
    expiresAtRef.current = newExpiresAt;
    setExpiresAt(newExpiresAt); // 추가
    localStorage.setItem("expiresAt", String(newExpiresAt));

    const delay = expiresIn - WARN_BEFORE;

    if (delay <= 0) {
      startCountdown();
      return;
    }

    warningTimerRef.current = setTimeout(() => {
      startCountdown();
    }, delay);
  }, []);

  // 시간 연장 (토큰 갱신 요청)
  const extendSession = useCallback(async () => {
    setVisible(false);
    setRemainingSeconds(0);
    clearTimers();

    try {
      const res = await api.post("/api/token/refresh");
      const expiresIn = res.data.expiresIn;
      startTimer(expiresIn);
    } catch {
      localStorage.removeItem("expiresAt"); 
      clearUserInfo();
      window.location.href = "/login";
    }
  }, [startTimer]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // 새로고침 시 타이머 복원
useEffect(() => {
  const saved = localStorage.getItem("expiresAt");
  if (saved) {
    const savedExpiresAt = Number(saved);
    const remaining = savedExpiresAt - Date.now();
    if (remaining > 0) {
      startTimer(remaining);
    } else {
      // 이미 만료됨
      localStorage.removeItem("expiresAt");
      clearUserInfo();
    }
  }
}, []);

  return {
    visible,
    remainingSeconds,
    expiresAt,
    startTimer,
    extendSession,
    dismiss: () => setVisible(false),
  };
}
