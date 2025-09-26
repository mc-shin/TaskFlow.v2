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

export function WorkspaceAppShell() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/workspace/app" component={Team} />
          <Route path="/workspace/app/admin" component={Admin} />
          <Route path="/workspace/app/team" component={Team} />
          <Route path="/workspace/app/my-tasks" component={MyTasks} />
          <Route path="/workspace/app/list" component={ListTree} />
          <Route path="/workspace/app/list-horizontal" component={ListHorizontal} />
          <Route path="/workspace/app/kanban" component={Kanban} />
          <Route path="/workspace/app/priority" component={Priority} />
          <Route path="/workspace/app/archive" component={Archive} />
          <Route path="/workspace/app/meeting" component={Meeting} />
          <Route path="/workspace/app/meeting/new" component={NewMeeting} />
          <Route path="/workspace/app/meeting/:id" component={MeetingDetail} />
          <Route path="/workspace/app/detail/project/:id" component={ProjectDetail} />
          <Route path="/workspace/app/detail/goal/:id" component={GoalDetail} />
          <Route path="/workspace/app/detail/task/:id" component={TaskDetail} />
          <Route path="/workspace/app/*" component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}