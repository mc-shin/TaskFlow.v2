// src/contexts/SessionContext.ts
import { createContext, useContext } from "react";

interface SessionContextType {
  startTimer: (expiresIn: number) => void;
  expiresAt: number;
}

export const SessionContext = createContext<SessionContextType>({
  startTimer: () => {},
  expiresAt: 0,
});

export const useSession = () => useContext(SessionContext);
