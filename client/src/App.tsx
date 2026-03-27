import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceAppShell } from "@/components/workspace-app-shell";
import Landing from "@/pages/landing";
import { LoginPage } from "@/pages/login";
import { SignupPage } from "@/pages/signup";
import { WorkspacePage } from "@/pages/workspace";
import NotFound from "@/pages/not-found";
import { useSessionWarning } from "./hooks/use-sessionwarning";
import SessionWarningModal from "./components/sessionWarning-modal";
import { SessionContext } from "./contexts/session-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/workspace" component={WorkspacePage} />
      <Route path="/workspace/:id/*">
        <WorkspaceAppShell />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // return (
  //   <QueryClientProvider client={queryClient}>
  //     <TooltipProvider>
  //       <div className="dark">
  //         <Toaster />
  //         <Router />
  //       </div>
  //     </TooltipProvider>
  //   </QueryClientProvider>
  // );
  const { visible, remainingSeconds, startTimer, expiresAt, extendSession, dismiss } = useSessionWarning();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionContext.Provider value={{ startTimer, expiresAt }}>
          <div className="dark">
            <Toaster />
            <SessionWarningModal
              visible={visible}
              remainingSeconds={remainingSeconds}
              onExtend={extendSession}
              onDismiss={dismiss}
            />
            <Router />
          </div>
        </SessionContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
