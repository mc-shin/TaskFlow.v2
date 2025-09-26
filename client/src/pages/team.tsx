import { ProgressOverview } from "@/components/progress-overview";
import { StatusCards } from "@/components/status-cards";
import { TaskTable } from "@/components/task-table";
import { ActivityFeed } from "@/components/activity-feed";
import { CalendarWidget } from "@/components/calendar-widget";
import { TaskModal } from "@/components/task-modal";
import { useState } from "react";

export default function Team() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);


  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="header-title">
            팀
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
            오늘도 그동안 힘을 세부시 옳 좀미다 니다난가.
          </p>
        </div>
      </header>
      
      {/* Team Content */}
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
              onEditTask={handleEditTask}
            />
            <ActivityFeed />
          </div>
          
          {/* Calendar */}
          <CalendarWidget />
        </div>
      </main>
      
      {/* Task Modal */}
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        editingTask={editingTask}
      />
    </>
  );
}