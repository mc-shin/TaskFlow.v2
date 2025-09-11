import { Sidebar } from "@/components/sidebar";
import { ProgressOverview } from "@/components/progress-overview";
import { StatusCards } from "@/components/status-cards";
import { TaskTable } from "@/components/task-table";
import { ActivityFeed } from "@/components/activity-feed";
import { CalendarWidget } from "@/components/calendar-widget";
import { TaskModal } from "@/components/task-modal";
import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold" data-testid="header-title">
              안녕하세요, 하이더!
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
              오늘도 그동안 힘을 세부시 옳 좀미다 니다난가.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              data-testid="button-search"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              data-testid="button-notifications"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </header>
        
        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-auto" data-testid="main-content">
          {/* Progress Overview */}
          <ProgressOverview />
          
          {/* Status Cards */}
          <StatusCards />
          
          {/* Task Management Section */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            {/* Task List and Activity Feed */}
            <div className="col-span-2 space-y-6">
              <TaskTable 
                onCreateTask={handleCreateTask}
                onEditTask={handleEditTask}
              />
              <ActivityFeed />
            </div>
            
            {/* Calendar */}
            <CalendarWidget />
          </div>
        </main>
      </div>
      
      {/* Task Modal */}
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        editingTask={editingTask}
      />
    </div>
  );
}
