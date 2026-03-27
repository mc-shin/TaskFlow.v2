import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useSession } from "@/contexts/session-context";

export function SessionTimer() {
  const { expiresAt } = useSession();
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      const m = String(Math.floor(diff / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setRemaining(`${m}:${s}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span className="font-medium p-2 inline-block w-[52px] text-right">{remaining}</span>
    </div>
  );
}
