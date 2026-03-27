import { useLocation } from "wouter";
import { logout } from "@/lib/auth";

interface Props {
  visible: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onDismiss: () => void;
}

export default function SessionWarningModal({
  visible,
  remainingSeconds,
  onExtend,
  onDismiss,
}: Props) {
  const [, setLocation] = useLocation();

  if (!visible) return null;

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  const handleGoHome = async () => {
    onDismiss();
    setLocation("/login");
    logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg p-8 max-w-xl w-full mx-4">
        {/* 제목 */}
        <p className="text-sm text-muted-foreground mb-2">자동 로그아웃 시간</p>

        {/* 안내 메시지 */}
        {remainingSeconds > 0 ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500">&nbsp;</h2>
            <p className="text-4xl font-bold text-primary mt-4 mb-16">
              남은시간 {minutes}분 {seconds}초
            </p>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500">
              자동 로그아웃 처리됩니다.
            </h2>
            <p className="text-4xl font-bold text-primary mt-4 mb-16">
              남은시간 {minutes}분 {seconds}초
            </p>
          </div>
        )}

        {/* 안내 텍스트 */}
        <div className="text-sm text-muted-foreground text-left mb-10 space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="shrink-0 mt-0.5">ⓘ</span>
            <span>
              <p>
                접속 후 아무런 동작이 없는 상태로 일정 시간이 지날 경우 자동
                로그아웃 되며,
              </p>
              <p>마감시간 10분 전 연장 알림이 나타납니다.</p>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 mt-0.5">ⓘ</span>
            <span>로그인 시간을 연장하시려면 [로그인 연장] 을 눌러주세요.</span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-3">
          {remainingSeconds > 0 ? (
            <button
              onClick={onExtend}
              className="w-full py-3 bg-primary text-lg text-white font-medium rounded-lg hover:bg-primary/90 transition"
            >
              로그인 연장
            </button>
          ) : (
            <button
              onClick={handleGoHome}
              className="w-full py-3 bg-primary text-lg text-white font-medium rounded-lg hover:bg-primary/90 transition"
            >
              홈으로 이동
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
