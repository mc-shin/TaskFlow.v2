import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Team from "@/pages/team";
import MyTasks from "@/pages/my-tasks";
import List from "@/pages/list";
import Kanban from "@/pages/kanban";
import Priority from "@/pages/priority";
import Backlog from "@/pages/backlog";
import Meeting from "@/pages/meeting";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  const showSidebar = location !== "/meeting";

  return (
    <div className="flex h-screen bg-background text-foreground">
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/team" component={Team} />
          <Route path="/my-tasks" component={MyTasks} />
          <Route path="/list" component={List} />
          <Route path="/kanban" component={Kanban} />
          <Route path="/priority" component={Priority} />
          <Route path="/backlog" component={Backlog} />
          <Route path="/meeting" component={Meeting} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
