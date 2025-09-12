import { useState, useEffect } from "react";

export function RealtimeClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="text-right" data-testid="realtime-clock">
      <div className="text-sm text-muted-foreground" data-testid="clock-date">
        {formatDate(currentTime)}
      </div>
      <div className="text-lg font-mono font-semibold" data-testid="clock-time">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}