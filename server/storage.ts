import { type User, type InsertUser, type Task, type InsertTask, type Activity, type InsertActivity, type TaskWithAssignees, type ActivityWithDetails, type Project, type InsertProject, type ProjectWithOwners, type UserWithStats, type SafeUser, type SafeUserWithStats, type SafeTaskWithAssignees, type SafeActivityWithDetails, type Meeting, type InsertMeeting, type MeetingComment, type InsertMeetingComment, type MeetingAttachment, type InsertMeetingAttachment, type MeetingCommentWithAuthor, type MeetingWithDetails, type Goal, type InsertGoal, type GoalWithTasks, type ProjectWithDetails, type Attachment, type InsertAttachment, type Comment, type InsertComment, type CommentWithAuthor } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getAllUsersWithStats(): Promise<SafeUserWithStats[]>;
  getAllSafeUsers(): Promise<SafeUser[]>;
  updateUserLastLogin(id: string): Promise<void>;

  // Project methods
  getAllProjects(): Promise<ProjectWithOwners[]>;
  getAllProjectsWithDetails(): Promise<ProjectWithDetails[]>;
  getProject(id: string): Promise<ProjectWithOwners | undefined>;
  createProject(project: InsertProject, createdBy?: string): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>, lastUpdatedBy?: string): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Goal methods
  getAllGoals(): Promise<GoalWithTasks[]>;
  getGoal(id: string): Promise<GoalWithTasks | undefined>;
  createGoal(goal: InsertGoal, createdBy?: string): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>, lastUpdatedBy?: string): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;
  getGoalsByProject(projectId: string): Promise<GoalWithTasks[]>;

  // Task methods
  getAllTasks(): Promise<SafeTaskWithAssignees[]>;
  getTask(id: string): Promise<SafeTaskWithAssignees | undefined>;
  createTask(task: InsertTask, createdBy?: string): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>, lastUpdatedBy?: string): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getTasksByStatus(status: string): Promise<SafeTaskWithAssignees[]>;
  getTasksByProject(projectId: string): Promise<SafeTaskWithAssignees[]>;
  getTasksByGoal(goalId: string): Promise<SafeTaskWithAssignees[]>;

  // Activity methods
  getAllActivities(): Promise<SafeActivityWithDetails[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Meeting methods
  listMeetings(options?: { from?: string; to?: string }): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<boolean>;
  addAttendee(meetingId: string, userId: string): Promise<Meeting | undefined>;
  removeAttendee(meetingId: string, userId: string): Promise<Meeting | undefined>;
  
  // Meeting Comment methods
  getMeetingComments(meetingId: string): Promise<MeetingCommentWithAuthor[]>;
  createMeetingComment(comment: InsertMeetingComment): Promise<MeetingComment>;
  deleteMeetingComment(id: string): Promise<boolean>;
  
  // Meeting Attachment methods
  getMeetingAttachments(meetingId: string): Promise<MeetingAttachment[]>;
  createMeetingAttachment(attachment: InsertMeetingAttachment): Promise<MeetingAttachment>;
  deleteMeetingAttachment(id: string): Promise<boolean>;
  
  // General Attachment methods
  getAttachments(entityType: string, entityId: string): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<boolean>;
  
  // Comment methods
  getComments(entityType: string, entityId: string): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, content: string): Promise<Comment | undefined>;
  deleteComment(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  // Helper function to get task progress - use stored progress value if available, otherwise derive from status
  private getTaskProgress(task: Task | { status: string; progress?: number | null }): number {
    // If progress is explicitly stored, use that value
    if ('progress' in task && task.progress !== null && task.progress !== undefined) {
      return task.progress;
    }
    
    // Otherwise, derive from status for backward compatibility
    switch (task.status) {
      case '완료': return 100;
      case '진행전': return 0;
      default: return 50;
    }
  }

  // Helper function to calculate average progress from tasks
  private calculateAverageProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, task) => sum + this.getTaskProgress(task), 0);
    return totalProgress / tasks.length;
  }
  
  // Backfill progress values for existing tasks that might not have proper progress set
  private backfillTaskProgress(): void {
    for (const task of Array.from(this.tasks.values())) {
      // Only update if progress is 0 and status suggests otherwise
      if (task.progress === 0) {
        let correctedProgress: number | null = null;
        
        if (task.status === '완료') {
          correctedProgress = 100;
        } else if (task.status === '진행중') {
          correctedProgress = 50;
        }
        
        if (correctedProgress !== null) {
          task.progress = correctedProgress;
          task.updatedAt = new Date();
        }
      }
    }
  }
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private goals: Map<string, Goal>;
  private tasks: Map<string, Task>;
  private activities: Map<string, Activity>;
  private meetings: Map<string, Meeting>;
  private meetingComments: Map<string, MeetingComment>;
  private meetingAttachments: Map<string, MeetingAttachment>;
  private attachments: Map<string, Attachment>;
  private comments: Map<string, Comment>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.goals = new Map();
    this.tasks = new Map();
    this.activities = new Map();
    this.meetings = new Map();
    this.meetingComments = new Map();
    this.meetingAttachments = new Map();
    this.attachments = new Map();
    this.comments = new Map();
    
    // Initialize with some default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Initialize users
    const defaultUsers = [
      { username: "hyejin", email: "hyejin@qubicom.co.kr", password: "password", name: "전혜진", initials: "전", lastLoginAt: null },
      { username: "hyejung", email: "hyejung@qubicom.co.kr", password: "password", name: "전혜중", initials: "전", lastLoginAt: null },
      { username: "chamin", email: "chamin@qubicom.co.kr", password: "password", name: "차민", initials: "차", lastLoginAt: null },
    ];

    for (const user of defaultUsers) {
      await this.createUser(user);
    }

    // Initialize projects
    const userArray = Array.from(this.users.values());
    const defaultProjects = [
      { 
        name: "지금 벙크 성장 기능 개발", 
        code: "RIIDO-41", 
        description: "성장 기능 구현",
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D-14
        status: "진행중",
        labels: ["개발", "핵심기능"],
        ownerIds: userArray[0]?.id ? [userArray[0].id] : []
      },
      { 
        name: "v0.10.4 업데이트", 
        code: "RIIDO-27", 
        description: "앱 업데이트",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D-7
        status: "진행중",
        labels: ["업데이트"],
        ownerIds: userArray[1]?.id ? [userArray[1].id] : []
      },
      { 
        name: "디스코드 연동", 
        code: "RIIDO-70", 
        description: "디스코드 연동 기능",
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D-1
        status: "진행전",
        labels: ["연동", "봇"],
        ownerIds: userArray[2]?.id ? [userArray[2].id] : []
      },
    ];

    for (let i = 0; i < defaultProjects.length; i++) {
      const project = defaultProjects[i];
      const creator = userArray[i % userArray.length]; // Cycle through users
      await this.createProject(project, creator?.id);
    }

    // Initialize goals for projects
    const projectArray = Array.from(this.projects.values());
    const defaultGoals = [
      { title: "메인 기능 개발", description: "핵심 기능 구현", deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행중", labels: ["개발", "핵심"], assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], projectId: projectArray[0]?.id },
      { title: "UI/UX 개선", description: "사용자 인터페이스 개선", deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "목표", labels: ["디자인"], assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], projectId: projectArray[0]?.id },
      { title: "API 연동", description: "외부 API 연동 작업", deadline: null, status: "진행전", labels: ["연동", "API"], assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], projectId: projectArray[1]?.id },
      { title: "시스템 최적화", description: "성능 및 안정성 개선", deadline: null, status: "목표", labels: ["성능"], assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], projectId: projectArray[1]?.id },
      { title: "연동 기능", description: "다른 서비스와의 연동", deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행전", labels: ["연동"], assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], projectId: projectArray[2]?.id },
    ];

    for (let i = 0; i < defaultGoals.length; i++) {
      const goal = defaultGoals[i];
      const creator = userArray[i % userArray.length]; // Cycle through users
      await this.createGoal(goal, creator?.id);
    }

    // Initialize tasks for goals
    const goalArray = Array.from(this.goals.values());
    const defaultTasks = [
      // Goal 1 tasks (메인 기능 개발) - 우선순위별 분배
      { title: "지금 벙크 성장 기능", description: "", status: "완료", goalId: goalArray[0]?.id, projectId: projectArray[0]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["개발"] },
      { title: "업데이트 창 폭을 정함", description: "", status: "진행전", goalId: goalArray[0]?.id, projectId: projectArray[0]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["디자인"] },
      { title: "프로젝트 UI 개선", description: "", status: "진행전", projectId: projectArray[0]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["UI", "개선"] },
      { title: "지금벙 API 연동", description: "", status: "진행중", projectId: projectArray[0]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["API", "연동"] },
      { title: "지금벙 Webhook 설정", description: "", status: "진행전", projectId: projectArray[0]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "4", labels: ["설정"] },
      
      // RIIDO-27 tasks  
      { title: "미니 번번 생성 및 알림 기능", description: "", status: "완료", projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["기능", "알림"] },
      { title: "넥스트 센터 개선 - 블랙 센터네트 업데이트", description: "", status: "진행전", projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["업데이트"] },
      { title: "널링앱 설정창 이동을 성능 향 숫 안정 개선", description: "", status: "진행전", projectId: projectArray[1]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["성능", "개선"] },
      { title: "리스트에서 차례 드래그로널스 기능 발밑", description: "", status: "진행전", projectId: projectArray[1]?.id, assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "4", labels: ["기능"] },
      { title: "리스트에서 차례 사제지 즤저 방밎 입한", description: "", status: "진행전", projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["기능"] },
      
      // RIIDO-70 tasks
      { title: "차례 변경사항에 대한 알림", description: "", status: "진행전", projectId: projectArray[2]?.id, assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["알림", "봇"] },
    ];

    for (let i = 0; i < defaultTasks.length; i++) {
      const task = defaultTasks[i];
      const creator = userArray[i % userArray.length]; // Cycle through users
      await this.createTask(task, creator?.id);
    }
    
    // Backfill progress values for any existing tasks that might have been created without proper progress
    this.backfillTaskProgress();

    // Initialize meetings
    const defaultMeetings = [
      {
        title: "데일리 스탠드업",
        description: "오늘의 작업 계획과 이슈를 공유합니다.",
        startAt: "2025-09-12T09:30:00.000Z",
        endAt: "2025-09-12T10:00:00.000Z",
        type: "standup",
        location: "Google Meet",
        attendeeIds: [userArray[0]?.id, userArray[1]?.id, userArray[2]?.id].filter(Boolean) as string[]
      },
      {
        title: "주간 스프린트 리뷰",
        description: "이번 주 진행된 작업들을 검토하고 다음 주 계획을 논의합니다.",
        startAt: "2025-09-15T14:00:00.000Z",
        endAt: "2025-09-15T15:00:00.000Z",
        type: "other",
        location: "Zoom",
        attendeeIds: [userArray[0]?.id, userArray[1]?.id].filter(Boolean) as string[]
      },
      {
        title: "클라이언트 미팅",
        description: "프로젝트 진행 상황을 클라이언트에게 보고합니다.",
        startAt: "2025-09-16T10:00:00.000Z",
        endAt: "2025-09-16T11:30:00.000Z",
        type: "other",
        location: "회의실 A",
        attendeeIds: [userArray[0]?.id].filter(Boolean) as string[]
      },
      {
        title: "4년 회의",
        description: "연간 계획 및 리뷰 미팅입니다.",
        startAt: "2025-09-17T10:00:00.000Z",
        endAt: "2025-09-17T11:00:00.000Z",
        type: "other",
        location: "회의실 B",
        attendeeIds: [userArray[0]?.id, userArray[1]?.id, userArray[2]?.id].filter(Boolean) as string[]
      },
      {
        title: "스팸티브 어린이",
        description: "특별 미팅입니다.",
        startAt: "2025-09-18T20:00:00.000Z",
        endAt: "2025-09-18T20:30:00.000Z",
        type: "other",
        location: "Zoom",
        attendeeIds: [userArray[0]?.id].filter(Boolean) as string[]
      }
    ];

    for (const meeting of defaultMeetings) {
      await this.createMeeting(meeting);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      lastLoginAt: insertUser.lastLoginAt || null
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsersWithStats(): Promise<SafeUserWithStats[]> {
    const users = Array.from(this.users.values());
    const usersWithStats: SafeUserWithStats[] = [];
    
    for (const user of users) {
      const userTasks = Array.from(this.tasks.values()).filter(task => task.assigneeIds && task.assigneeIds.includes(user.id));
      const completedTasks = userTasks.filter(task => task.status === "완료");
      const overdueTasks = userTasks.filter(task => {
        if (!task.deadline) return false;
        return new Date(task.deadline) < new Date();
      });
      
      const progressPercentage = userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0;
      
      const { password, ...safeUser } = user;
      usersWithStats.push({
        ...safeUser,
        taskCount: userTasks.length,
        completedTaskCount: completedTasks.length,
        overdueTaskCount: overdueTasks.length,
        progressPercentage: Math.round(progressPercentage),
        hasOverdueTasks: overdueTasks.length > 0,
      });
    }
    
    return usersWithStats;
  }

  async getAllSafeUsers(): Promise<SafeUser[]> {
    const users = Array.from(this.users.values());
    return users.map(({ password, ...safeUser }) => safeUser);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(id, user);
    }
  }

  // Project methods
  async getAllProjects(): Promise<ProjectWithOwners[]> {
    const projects = Array.from(this.projects.values());
    const projectsWithOwner: ProjectWithOwners[] = [];
    
    for (const project of projects) {
      const owners: SafeUser[] = [];
      if (project.ownerIds && Array.isArray(project.ownerIds)) {
        for (const ownerId of project.ownerIds) {
          const ownerUser = await this.getUser(ownerId);
          if (ownerUser) {
            const { password, ...safeOwner } = ownerUser;
            owners.push(safeOwner);
          }
        }
      }
      const projectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === project.id);
      const completedTasks = projectTasks.filter(task => task.status === "완료");
      const overdueTasks = projectTasks.filter(task => {
        if (!task.deadline) return false;
        return new Date(task.deadline) < new Date();
      });
      
      const progressPercentage = this.calculateAverageProgress(projectTasks);
      
      // Add assignees info to tasks
      const tasksWithAssignees: SafeTaskWithAssignees[] = [];
      for (const task of projectTasks) {
        const assignees: SafeUser[] = [];
        if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
          for (const assigneeId of task.assigneeIds) {
            const assigneeUser = await this.getUser(assigneeId);
            if (assigneeUser) {
              const { password, ...safeAssignee } = assigneeUser;
              assignees.push(safeAssignee);
            }
          }
        }
        tasksWithAssignees.push({ ...task, assignees });
      }
      
      projectsWithOwner.push({
        ...project,
        owners,
        tasks: tasksWithAssignees,
        totalTasks: projectTasks.length,
        completedTasks: completedTasks.length,
        progressPercentage: Math.round(progressPercentage),
        hasOverdueTasks: overdueTasks.length > 0,
        overdueTaskCount: overdueTasks.length,
      });
    }
    
    return projectsWithOwner.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getAllProjectsWithDetails(): Promise<ProjectWithDetails[]> {
    const projects = Array.from(this.projects.values());
    const projectsWithDetails: ProjectWithDetails[] = [];
    
    for (const project of projects) {
      const owners: SafeUser[] = [];
      if (project.ownerIds && Array.isArray(project.ownerIds)) {
        for (const ownerId of project.ownerIds) {
          const ownerUser = await this.getUser(ownerId);
          if (ownerUser) {
            const { password, ...safeOwner } = ownerUser;
            owners.push(safeOwner);
          }
        }
      }
      
      // Get all direct project tasks
      const directProjectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === project.id);
      
      // Get goals for this project with their tasks
      const projectGoals = Array.from(this.goals.values()).filter(goal => goal.projectId === project.id);
      
      // Collect all tasks from all goals within this project
      const allGoalTasks: Task[] = [];
      projectGoals.forEach(goal => {
        const goalTasks = Array.from(this.tasks.values()).filter(task => task.goalId === goal.id);
        allGoalTasks.push(...goalTasks);
      });
      
      // Combine direct project tasks with all goal tasks for progress calculation
      const allProjectTasks = [...directProjectTasks, ...allGoalTasks];
      const completedTasks = allProjectTasks.filter(task => task.status === "완료");
      const overdueTasks = allProjectTasks.filter(task => {
        if (!task.deadline) return false;
        return new Date(task.deadline) < new Date();
      });
      
      const goalsWithTasks: GoalWithTasks[] = [];
      
      for (const goal of projectGoals) {
        // Get tasks for this goal
        const goalTasks = Array.from(this.tasks.values()).filter(task => task.goalId === goal.id);
        const goalCompletedTasks = goalTasks.filter(task => task.status === "완료");
        const goalProgressPercentage = this.calculateAverageProgress(goalTasks);
        
        // Add assignees info to goal itself
        const goalAssignees: SafeUser[] = [];
        if (goal.assigneeIds && Array.isArray(goal.assigneeIds)) {
          for (const assigneeId of goal.assigneeIds) {
            const assigneeUser = await this.getUser(assigneeId);
            if (assigneeUser) {
              const { password, ...safeAssignee } = assigneeUser;
              goalAssignees.push(safeAssignee);
            }
          }
        }
        
        // Add assignees info to goal tasks
        const goalTasksWithAssignees: SafeTaskWithAssignees[] = [];
        for (const task of goalTasks) {
          const assignees: SafeUser[] = [];
          if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
            for (const assigneeId of task.assigneeIds) {
              const assigneeUser = await this.getUser(assigneeId);
              if (assigneeUser) {
                const { password, ...safeAssignee } = assigneeUser;
                assignees.push(safeAssignee);
              }
            }
          }
          goalTasksWithAssignees.push({ ...task, assignees });
        }
        
        goalsWithTasks.push({
          ...goal,
          assignees: goalAssignees,
          tasks: goalTasksWithAssignees,
          totalTasks: goalTasks.length,
          completedTasks: goalCompletedTasks.length,
          progressPercentage: Math.round(goalProgressPercentage),
        });
      }
      
      // Calculate project progress as average of goal progress
      let projectProgressPercentage: number;
      if (goalsWithTasks.length > 0) {
        // Project progress = sum of goal progress / number of goals
        const totalGoalProgress = goalsWithTasks.reduce((sum, goal) => sum + (goal.progressPercentage || 0), 0);
        projectProgressPercentage = totalGoalProgress / goalsWithTasks.length;
      } else {
        // If no goals, use direct project tasks for progress calculation
        projectProgressPercentage = this.calculateAverageProgress(directProjectTasks);
      }
      
      // Add assignees info to direct project tasks
      const tasksWithAssignees: SafeTaskWithAssignees[] = [];
      for (const task of directProjectTasks) {
        const assignees: SafeUser[] = [];
        if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
          for (const assigneeId of task.assigneeIds) {
            const assigneeUser = await this.getUser(assigneeId);
            if (assigneeUser) {
              const { password, ...safeAssignee } = assigneeUser;
              assignees.push(safeAssignee);
            }
          }
        }
        tasksWithAssignees.push({ ...task, assignees });
      }
      
      projectsWithDetails.push({
        ...project,
        owners,
        goals: goalsWithTasks,
        tasks: tasksWithAssignees,
        totalTasks: allProjectTasks.length,
        completedTasks: completedTasks.length,
        progressPercentage: Math.round(projectProgressPercentage),
        hasOverdueTasks: overdueTasks.length > 0,
        overdueTaskCount: overdueTasks.length,
      });
    }
    
    return projectsWithDetails.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getProject(id: string): Promise<ProjectWithOwners | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const owners: SafeUser[] = [];
    if (project.ownerIds && Array.isArray(project.ownerIds)) {
      for (const ownerId of project.ownerIds) {
        const ownerUser = await this.getUser(ownerId);
        if (ownerUser) {
          const { password, ...safeOwner } = ownerUser;
          owners.push(safeOwner);
        }
      }
    }
    
    // Get all direct project tasks
    const directProjectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === project.id);
    
    // Get goals for this project
    const projectGoals = Array.from(this.goals.values()).filter(goal => goal.projectId === project.id);
    
    // Collect all tasks from all goals within this project
    const allGoalTasks: Task[] = [];
    projectGoals.forEach(goal => {
      const goalTasks = Array.from(this.tasks.values()).filter(task => task.goalId === goal.id);
      allGoalTasks.push(...goalTasks);
    });
    
    // Combine direct project tasks with all goal tasks for progress calculation
    const allProjectTasks = [...directProjectTasks, ...allGoalTasks];
    const completedTasks = allProjectTasks.filter(task => task.status === "완료");
    const overdueTasks = allProjectTasks.filter(task => {
      if (!task.deadline) return false;
      return new Date(task.deadline) < new Date();
    });
    
    // Calculate project progress using the same logic as getAllProjectsWithDetails
    let progressPercentage: number;
    if (projectGoals.length > 0) {
      // Project progress = average of goal progress
      const goalProgressSum = projectGoals.reduce((sum, goal) => {
        const goalTasks = Array.from(this.tasks.values()).filter(task => task.goalId === goal.id);
        const goalProgress = this.calculateAverageProgress(goalTasks);
        return sum + goalProgress;
      }, 0);
      progressPercentage = goalProgressSum / projectGoals.length;
    } else {
      // If no goals, use direct project tasks for progress calculation
      progressPercentage = this.calculateAverageProgress(directProjectTasks);
    }
    
    // Add assignees info to direct project tasks
    const tasksWithAssignees: SafeTaskWithAssignees[] = [];
    for (const task of directProjectTasks) {
      const assignees: SafeUser[] = [];
      if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
        for (const assigneeId of task.assigneeIds) {
          const assigneeUser = await this.getUser(assigneeId);
          if (assigneeUser) {
            const { password, ...safeAssignee } = assigneeUser;
            assignees.push(safeAssignee);
          }
        }
      }
      tasksWithAssignees.push({ ...task, assignees });
    }
    
    return {
      ...project,
      owners,
      tasks: tasksWithAssignees,
      totalTasks: allProjectTasks.length,
      completedTasks: completedTasks.length,
      progressPercentage: Math.round(progressPercentage),
      hasOverdueTasks: overdueTasks.length > 0,
      overdueTaskCount: overdueTasks.length,
    };
  }

  async createProject(insertProject: InsertProject, createdBy?: string): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const project: Project = { 
      ...insertProject, 
      id, 
      description: insertProject.description || null,
      deadline: insertProject.deadline || null,
      status: insertProject.status || null,
      labels: insertProject.labels || [],
      ownerIds: insertProject.ownerIds || [],
      createdBy: createdBy || null,
      lastUpdatedBy: createdBy || null,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, project);
    
    // Create activity
    if (insertProject.ownerIds && insertProject.ownerIds.length > 0) {
      await this.createActivity({
        description: `새 프로젝트가 생성되었습니다`,
        taskId: null,
        userId: insertProject.ownerIds[0], // Use first owner for activity
      });
    }
    
    return project;
  }

  async updateProject(id: string, updateData: Partial<InsertProject>, lastUpdatedBy?: string): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject: Project = {
      ...existingProject,
      ...updateData,
      lastUpdatedBy: lastUpdatedBy || existingProject.lastUpdatedBy,
      updatedAt: new Date(),
    };
    
    this.projects.set(id, updatedProject);
    
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const deleted = this.projects.delete(id);
    
    if (deleted) {
      // Remove related tasks and activities
      for (const [taskId, task] of Array.from(this.tasks.entries())) {
        if (task.projectId === id) {
          this.tasks.delete(taskId);
          // Remove activities for this task
          for (const [activityId, activity] of Array.from(this.activities.entries())) {
            if (activity.taskId === taskId) {
              this.activities.delete(activityId);
            }
          }
        }
      }
    }
    
    return deleted;
  }

  async getTasksByProject(projectId: string): Promise<SafeTaskWithAssignees[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.projectId === projectId);
  }

  async getTasksByGoal(goalId: string): Promise<SafeTaskWithAssignees[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.goalId === goalId);
  }

  // Goal methods
  async getAllGoals(): Promise<GoalWithTasks[]> {
    const goals = Array.from(this.goals.values());
    const goalsWithTasks: GoalWithTasks[] = [];
    
    for (const goal of goals) {
      const goalTasks = Array.from(this.tasks.values()).filter(task => task.goalId === goal.id);
      const completedTasks = goalTasks.filter(task => task.status === "완료");
      
      const progressPercentage = this.calculateAverageProgress(goalTasks);
      
      // Add assignees info to tasks
      const tasksWithAssignees: SafeTaskWithAssignees[] = [];
      for (const task of goalTasks) {
        const assignees: SafeUser[] = [];
        if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
          for (const assigneeId of task.assigneeIds) {
            const assigneeUser = await this.getUser(assigneeId);
            if (assigneeUser) {
              const { password, ...safeAssignee } = assigneeUser;
              assignees.push(safeAssignee);
            }
          }
        }
        tasksWithAssignees.push({ ...task, assignees });
      }
      
      goalsWithTasks.push({
        ...goal,
        tasks: tasksWithAssignees,
        totalTasks: goalTasks.length,
        completedTasks: completedTasks.length,
        progressPercentage: Math.round(progressPercentage),
      });
    }
    
    return goalsWithTasks.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getGoal(id: string): Promise<GoalWithTasks | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const goalTasks = Array.from(this.tasks.values()).filter(task => task.goalId === goal.id);
    const completedTasks = goalTasks.filter(task => task.status === "완료");
    
    const progressPercentage = this.calculateAverageProgress(goalTasks);
    
    // Add assignees info to tasks
    const tasksWithAssignees: SafeTaskWithAssignees[] = [];
    for (const task of goalTasks) {
      const assignees: SafeUser[] = [];
      if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
        for (const assigneeId of task.assigneeIds) {
          const assigneeUser = await this.getUser(assigneeId);
          if (assigneeUser) {
            const { password, ...safeAssignee } = assigneeUser;
            assignees.push(safeAssignee);
          }
        }
      }
      tasksWithAssignees.push({ ...task, assignees });
    }
    
    return {
      ...goal,
      tasks: tasksWithAssignees,
      totalTasks: goalTasks.length,
      completedTasks: completedTasks.length,
      progressPercentage: Math.round(progressPercentage),
    };
  }

  async createGoal(insertGoal: InsertGoal, createdBy?: string): Promise<Goal> {
    const id = randomUUID();
    const now = new Date();
    const goal: Goal = { 
      ...insertGoal, 
      id, 
      description: insertGoal.description || null,
      deadline: insertGoal.deadline || null,
      status: insertGoal.status || null,
      labels: insertGoal.labels || [],
      assigneeIds: insertGoal.assigneeIds || [],
      createdBy: createdBy || null,
      lastUpdatedBy: createdBy || null,
      createdAt: now,
      updatedAt: now
    };
    this.goals.set(id, goal);
    
    return goal;
  }

  async updateGoal(id: string, updateData: Partial<InsertGoal>, lastUpdatedBy?: string): Promise<Goal | undefined> {
    const existingGoal = this.goals.get(id);
    if (!existingGoal) return undefined;
    
    const updatedGoal: Goal = {
      ...existingGoal,
      ...updateData,
      lastUpdatedBy: lastUpdatedBy || existingGoal.lastUpdatedBy,
      updatedAt: new Date(),
    };
    
    this.goals.set(id, updatedGoal);
    
    return updatedGoal;
  }

  async deleteGoal(id: string): Promise<boolean> {
    // Check if goal has tasks - prevent deletion if it does
    const goalTasks = Array.from(this.tasks.values()).filter(task => task.goalId === id);
    if (goalTasks.length > 0) {
      throw new Error("목표에 작업이 있어 삭제할 수 없습니다. 먼저 작업을 삭제하거나 다른 목표로 이동해주세요.");
    }
    
    return this.goals.delete(id);
  }

  async getGoalsByProject(projectId: string): Promise<GoalWithTasks[]> {
    const allGoals = await this.getAllGoals();
    return allGoals.filter(goal => goal.projectId === projectId);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getAllTasks(): Promise<SafeTaskWithAssignees[]> {
    const tasks = Array.from(this.tasks.values());
    const tasksWithAssignees: SafeTaskWithAssignees[] = [];
    
    for (const task of tasks) {
      const assignees: SafeUser[] = [];
      if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
        for (const assigneeId of task.assigneeIds) {
          const assigneeUser = await this.getUser(assigneeId);
          if (assigneeUser) {
            const { password, ...safeAssignee } = assigneeUser;
            assignees.push(safeAssignee);
          }
        }
      }
      tasksWithAssignees.push({ ...task, assignees });
    }
    
    return tasksWithAssignees.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getTask(id: string): Promise<SafeTaskWithAssignees | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const assignees: SafeUser[] = [];
    if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
      for (const assigneeId of task.assigneeIds) {
        const assigneeUser = await this.getUser(assigneeId);
        if (assigneeUser) {
          const { password, ...safeAssignee } = assigneeUser;
          assignees.push(safeAssignee);
        }
      }
    }
    return { ...task, assignees };
  }

  async createTask(insertTask: InsertTask, createdBy?: string): Promise<Task> {
    const id = randomUUID();
    const now = new Date();
    
    // Auto-set projectId from goal if goalId is provided but projectId is not
    let finalProjectId = insertTask.projectId || null;
    if (insertTask.goalId && !insertTask.projectId) {
      const goal = this.goals.get(insertTask.goalId);
      if (goal) {
        finalProjectId = goal.projectId;
      }
    }
    
    // Initialize progress based on status if not explicitly provided
    let initialProgress = insertTask.progress;
    const status = insertTask.status || "진행전";
    
    if (initialProgress === undefined || initialProgress === null) {
      switch (status) {
        case '완료':
          initialProgress = 100;
          break;
        case '진행전':
          initialProgress = 0;
          break;
        default:
          initialProgress = 50;
          break;
      }
    }
    
    const task: Task = { 
      ...insertTask, 
      id, 
      description: insertTask.description || null,
      deadline: insertTask.deadline || null,
      duration: insertTask.duration || null,
      priority: insertTask.priority || null,
      labels: insertTask.labels || [],
      status: status,
      progress: initialProgress,
      assigneeIds: insertTask.assigneeIds || [],
      projectId: finalProjectId,
      goalId: insertTask.goalId || null,
      createdBy: createdBy || null,
      lastUpdatedBy: createdBy || null,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.set(id, task);
    
    // Create activity
    if (insertTask.assigneeIds && insertTask.assigneeIds.length > 0) {
      await this.createActivity({
        description: `새 작업이 생성되었습니다`,
        taskId: id,
        userId: insertTask.assigneeIds[0], // Use first assignee for activity
      });
    }
    
    return task;
  }

  async updateTask(id: string, updateData: Partial<InsertTask>, lastUpdatedBy?: string): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    // Auto-set projectId from goal if goalId is provided but projectId is not
    let finalProjectId = updateData.projectId !== undefined ? updateData.projectId : existingTask.projectId;
    if (updateData.goalId && updateData.projectId === undefined) {
      const goal = this.goals.get(updateData.goalId);
      if (goal) {
        finalProjectId = goal.projectId;
      }
    }
    
    const updatedTask: Task = {
      ...existingTask,
      ...updateData,
      projectId: finalProjectId,
      lastUpdatedBy: lastUpdatedBy || existingTask.lastUpdatedBy,
      updatedAt: new Date(),
    };
    
    this.tasks.set(id, updatedTask);
    
    // Create activity
    if (updateData.assigneeIds && updateData.assigneeIds.length > 0) {
      await this.createActivity({
        description: `작업이 수정되었습니다`,
        taskId: id,
        userId: updateData.assigneeIds[0], // Use first assignee for activity
      });
    }
    
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const deleted = this.tasks.delete(id);
    
    if (deleted) {
      // Remove related activities
      for (const [activityId, activity] of Array.from(this.activities.entries())) {
        if (activity.taskId === id) {
          this.activities.delete(activityId);
        }
      }
    }
    
    return deleted;
  }

  async getTasksByStatus(status: string): Promise<SafeTaskWithAssignees[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.status === status);
  }

  async getAllActivities(): Promise<SafeActivityWithDetails[]> {
    const activities = Array.from(this.activities.values());
    const activitiesWithDetails: SafeActivityWithDetails[] = [];
    
    for (const activity of activities) {
      const userWithPassword = activity.userId ? await this.getUser(activity.userId) : undefined;
      const user = userWithPassword ? (({ password, ...safeUser }) => safeUser)(userWithPassword) : undefined;
      const task = activity.taskId ? this.tasks.get(activity.taskId) : undefined;
      activitiesWithDetails.push({ ...activity, user, task });
    }
    
    return activitiesWithDetails.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { 
      ...insertActivity, 
      id, 
      taskId: insertActivity.taskId || null,
      userId: insertActivity.userId || null,
      createdAt: new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }

  // Meeting methods
  async listMeetings(options?: { from?: string; to?: string }): Promise<Meeting[]> {
    const meetings = Array.from(this.meetings.values());
    
    if (!options?.from && !options?.to) {
      return meetings.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    
    return meetings.filter(meeting => {
      const meetingStart = new Date(meeting.startAt);
      if (options.from && meetingStart < new Date(options.from)) return false;
      if (options.to && meetingStart > new Date(options.to)) return false;
      return true;
    }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const id = randomUUID();
    const now = new Date();
    const meeting: Meeting = {
      ...insertMeeting,
      id,
      type: insertMeeting.type || "standup",
      description: insertMeeting.description || null,
      endAt: insertMeeting.endAt || null,
      location: insertMeeting.location || null,
      attendeeIds: insertMeeting.attendeeIds || [],
      createdAt: now,
      updatedAt: now
    };
    this.meetings.set(id, meeting);
    return meeting;
  }

  async updateMeeting(id: string, updateData: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const existingMeeting = this.meetings.get(id);
    if (!existingMeeting) return undefined;
    
    const updatedMeeting: Meeting = {
      ...existingMeeting,
      ...updateData,
      updatedAt: new Date(),
    };
    
    this.meetings.set(id, updatedMeeting);
    return updatedMeeting;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    return this.meetings.delete(id);
  }

  async addAttendee(meetingId: string, userId: string): Promise<Meeting | undefined> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return undefined;
    
    if (!meeting.attendeeIds.includes(userId)) {
      const updatedMeeting: Meeting = {
        ...meeting,
        attendeeIds: [...meeting.attendeeIds, userId],
        updatedAt: new Date(),
      };
      this.meetings.set(meetingId, updatedMeeting);
      return updatedMeeting;
    }
    
    return meeting;
  }

  async removeAttendee(meetingId: string, userId: string): Promise<Meeting | undefined> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return undefined;
    
    const updatedMeeting: Meeting = {
      ...meeting,
      attendeeIds: meeting.attendeeIds.filter(id => id !== userId),
      updatedAt: new Date(),
    };
    this.meetings.set(meetingId, updatedMeeting);
    return updatedMeeting;
  }

  // Meeting Comment methods
  async getMeetingComments(meetingId: string): Promise<MeetingCommentWithAuthor[]> {
    const comments = Array.from(this.meetingComments.values())
      .filter(comment => comment.meetingId === meetingId)
      .sort((a, b) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
    
    const commentsWithAuthor = await Promise.all(
      comments.map(async comment => {
        const author = this.users.get(comment.authorId);
        if (!author) {
          throw new Error(`Author not found for comment ${comment.id}`);
        }
        const safeAuthor: SafeUser = {
          id: author.id,
          username: author.username,
          email: author.email,
          name: author.name,
          initials: author.initials,
          lastLoginAt: author.lastLoginAt
        };
        return {
          ...comment,
          author: safeAuthor
        };
      })
    );
    
    return commentsWithAuthor;
  }

  async createMeetingComment(insertComment: InsertMeetingComment): Promise<MeetingComment> {
    const id = randomUUID();
    const now = new Date();
    const comment: MeetingComment = {
      ...insertComment,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.meetingComments.set(id, comment);
    return comment;
  }

  async deleteMeetingComment(id: string): Promise<boolean> {
    return this.meetingComments.delete(id);
  }

  // Meeting Attachment methods
  async getMeetingAttachments(meetingId: string): Promise<MeetingAttachment[]> {
    return Array.from(this.meetingAttachments.values())
      .filter(attachment => attachment.meetingId === meetingId)
      .sort((a, b) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
  }

  async createMeetingAttachment(insertAttachment: InsertMeetingAttachment): Promise<MeetingAttachment> {
    const id = randomUUID();
    const now = new Date();
    const attachment: MeetingAttachment = {
      ...insertAttachment,
      id,
      fileSize: insertAttachment.fileSize ?? null,
      mimeType: insertAttachment.mimeType ?? null,
      createdAt: now
    };
    this.meetingAttachments.set(id, attachment);
    return attachment;
  }

  async deleteMeetingAttachment(id: string): Promise<boolean> {
    return this.meetingAttachments.delete(id);
  }

  // General Attachment methods
  async getAttachments(entityType: string, entityId: string): Promise<Attachment[]> {
    return Array.from(this.attachments.values())
      .filter(attachment => attachment.entityType === entityType && attachment.entityId === entityId)
      .sort((a, b) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const id = randomUUID();
    const now = new Date();
    const attachment: Attachment = {
      ...insertAttachment,
      id,
      fileSize: insertAttachment.fileSize ?? null,
      mimeType: insertAttachment.mimeType ?? null,
      createdAt: now
    };
    this.attachments.set(id, attachment);
    return attachment;
  }

  async deleteAttachment(id: string): Promise<boolean> {
    return this.attachments.delete(id);
  }

  // Comment methods
  async getComments(entityType: string, entityId: string): Promise<CommentWithAuthor[]> {
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.entityType === entityType && comment.entityId === entityId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

    const commentsWithAuthor: CommentWithAuthor[] = [];
    for (const comment of comments) {
      const author = this.users.get(comment.authorId);
      if (author) {
        const { password, ...safeAuthor } = author;
        commentsWithAuthor.push({ ...comment, author: safeAuthor });
      }
    }

    return commentsWithAuthor;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const now = new Date();
    const newComment: Comment = {
      ...comment,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async updateComment(id: string, content: string): Promise<Comment | undefined> {
    const comment = this.comments.get(id);
    if (!comment) return undefined;

    const updatedComment: Comment = {
      ...comment,
      content,
      updatedAt: new Date(),
    };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }

  async deleteComment(id: string): Promise<boolean> {
    return this.comments.delete(id);
  }
}

export const storage = new MemStorage();
