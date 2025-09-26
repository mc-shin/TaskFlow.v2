import { Switch, Route } from "wouter";
import { Sidebar } from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Team from "@/pages/team";
import MyTasks from "@/pages/my-tasks";
import ListTree from "@/pages/list-tree";
import ListHorizontal from "@/pages/list-horizontal";
import Kanban from "@/pages/kanban";
import Priority from "@/pages/priority";
import Archive from "@/pages/archive";
import Meeting from "@/pages/meeting";
import NewMeeting from "@/pages/new-meeting";
import MeetingDetail from "@/pages/meeting-detail";
import ProjectDetail from "@/pages/project-detail";
import GoalDetail from "@/pages/goal-detail";
import TaskDetail from "@/pages/task-detail";
import NotFound from "@/pages/not-found";

export function AppShell() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/app" component={Team} />
          <Route path="/app/admin" component={Admin} />
          <Route path="/app/team" component={Team} />
          <Route path="/app/my-tasks" component={MyTasks} />
          <Route path="/app/list" component={ListTree} />
          <Route path="/app/list-horizontal" component={ListHorizontal} />
          <Route path="/app/kanban" component={Kanban} />
          <Route path="/app/priority" component={Priority} />
          <Route path="/app/archive" component={Archive} />
          <Route path="/app/meeting" component={Meeting} />
          <Route path="/app/meeting/new" component={NewMeeting} />
          <Route path="/app/meeting/:id" component={MeetingDetail} />
          <Route path="/app/detail/project/:id" component={ProjectDetail} />
          <Route path="/app/detail/goal/:id" component={GoalDetail} />
          <Route path="/app/detail/task/:id" component={TaskDetail} />
          <Route path="/app/*" component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}