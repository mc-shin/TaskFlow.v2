import { type User, type InsertUser, type Task, type InsertTask, type Activity, type InsertActivity, type TaskWithAssignee, type ActivityWithDetails, type Project, type InsertProject, type ProjectWithOwner, type UserWithStats, type SafeUser, type SafeUserWithStats, type SafeTaskWithAssignee, type SafeActivityWithDetails, type Meeting, type InsertMeeting, type MeetingComment, type InsertMeetingComment, type MeetingAttachment, type InsertMeetingAttachment, type MeetingCommentWithAuthor, type MeetingWithDetails } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getAllUsersWithStats(): Promise<SafeUserWithStats[]>;
  getAllSafeUsers(): Promise<SafeUser[]>;
  updateUserLastLogin(id: string): Promise<void>;

  // Project methods
  getAllProjects(): Promise<ProjectWithOwner[]>;
  getProject(id: string): Promise<ProjectWithOwner | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Task methods
  getAllTasks(): Promise<SafeTaskWithAssignee[]>;
  getTask(id: string): Promise<SafeTaskWithAssignee | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getTasksByStatus(status: string): Promise<SafeTaskWithAssignee[]>;
  getTasksByProject(projectId: string): Promise<SafeTaskWithAssignee[]>;

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private tasks: Map<string, Task>;
  private activities: Map<string, Activity>;
  private meetings: Map<string, Meeting>;
  private meetingComments: Map<string, MeetingComment>;
  private meetingAttachments: Map<string, MeetingAttachment>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.activities = new Map();
    this.meetings = new Map();
    this.meetingComments = new Map();
    this.meetingAttachments = new Map();
    
    // Initialize with some default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Initialize users
    const defaultUsers = [
      { username: "hyejin", password: "password", name: "전혜진", initials: "전", lastLoginAt: null },
      { username: "hyejung", password: "password", name: "전혜중", initials: "전", lastLoginAt: null },
      { username: "chamin", password: "password", name: "차민", initials: "차", lastLoginAt: null },
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
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // D-14
        ownerId: userArray[0]?.id || null
      },
      { 
        name: "v0.10.4 업데이트", 
        code: "RIIDO-27", 
        description: "앱 업데이트",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // D-7
        ownerId: userArray[1]?.id || null
      },
      { 
        name: "디스코드 연동", 
        code: "RIIDO-70", 
        description: "디스코드 연동 기능",
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // D-1
        ownerId: userArray[2]?.id || null
      },
    ];

    for (const project of defaultProjects) {
      await this.createProject(project);
    }

    // Initialize tasks for projects
    const projectArray = Array.from(this.projects.values());
    const defaultTasks = [
      // RIIDO-41 tasks
      { title: "지금 벙크 성장 기능", description: "", status: "완료", projectId: projectArray[0]?.id, assigneeId: userArray[0]?.id, deadline: null, duration: 0, priority: "높음" },
      { title: "업데이트 창 폭을 정함", description: "", status: "실행대기", projectId: projectArray[0]?.id, assigneeId: userArray[0]?.id, deadline: null, duration: 0, priority: "중간" },
      { title: "프로젝트 UI 개선", description: "", status: "실행대기", projectId: projectArray[0]?.id, assigneeId: userArray[1]?.id, deadline: null, duration: 0, priority: "중간" },
      { title: "지금벙 API 연동", description: "", status: "이슈함", projectId: projectArray[0]?.id, assigneeId: userArray[0]?.id, deadline: null, duration: 0, priority: "높음" },
      { title: "지금벙 Webhook 설정", description: "", status: "실행대기", projectId: projectArray[0]?.id, assigneeId: userArray[1]?.id, deadline: null, duration: 0, priority: "중간" },
      
      // RIIDO-27 tasks  
      { title: "미니 번번 생성 및 알림 기능", description: "", status: "완료", projectId: projectArray[1]?.id, assigneeId: userArray[1]?.id, deadline: null, duration: 0, priority: "높음" },
      { title: "넥스트 센터 개선 - 블랙 센터네트 업데이트", description: "", status: "실행대기", projectId: projectArray[1]?.id, assigneeId: userArray[1]?.id, deadline: null, duration: 0, priority: "중간" },
      { title: "널링앱 설정창 이동을 성능 향 숫 안정 개선", description: "", status: "실행대기", projectId: projectArray[1]?.id, assigneeId: userArray[0]?.id, deadline: null, duration: 0, priority: "중간" },
      { title: "리스트에서 차례 드래그로널스 기능 발밑", description: "", status: "실행대기", projectId: projectArray[1]?.id, assigneeId: userArray[2]?.id, deadline: null, duration: 0, priority: "낮음" },
      { title: "리스트에서 차례 사제지 즤저 방밎 입한", description: "", status: "실행대기", projectId: projectArray[1]?.id, assigneeId: userArray[1]?.id, deadline: null, duration: 0, priority: "낮음" },
      
      // RIIDO-70 tasks
      { title: "차례 변경사항에 대한 알림", description: "", status: "실행대기", projectId: projectArray[2]?.id, assigneeId: userArray[2]?.id, deadline: null, duration: 0, priority: "중간" },
    ];

    for (const task of defaultTasks) {
      await this.createTask(task);
    }

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
      const userTasks = Array.from(this.tasks.values()).filter(task => task.assigneeId === user.id);
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
  async getAllProjects(): Promise<ProjectWithOwner[]> {
    const projects = Array.from(this.projects.values());
    const projectsWithOwner: ProjectWithOwner[] = [];
    
    for (const project of projects) {
      const ownerUser = project.ownerId ? await this.getUser(project.ownerId) : undefined;
      const owner = ownerUser ? (({ password, ...safeUser }) => safeUser)(ownerUser) : undefined;
      const projectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === project.id);
      const completedTasks = projectTasks.filter(task => task.status === "완료");
      const overdueTasks = projectTasks.filter(task => {
        if (!task.deadline) return false;
        return new Date(task.deadline) < new Date();
      });
      
      const progressPercentage = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;
      
      // Add assignee info to tasks
      const tasksWithAssignees: SafeTaskWithAssignee[] = [];
      for (const task of projectTasks) {
        const assigneeUser = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
        const assignee = assigneeUser ? (({ password, ...safeUser }) => safeUser)(assigneeUser) : undefined;
        tasksWithAssignees.push({ ...task, assignee });
      }
      
      projectsWithOwner.push({
        ...project,
        owner,
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

  async getProject(id: string): Promise<ProjectWithOwner | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const ownerUser = project.ownerId ? await this.getUser(project.ownerId) : undefined;
    const owner = ownerUser ? (({ password, ...safeUser }) => safeUser)(ownerUser) : undefined;
    const projectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === project.id);
    const completedTasks = projectTasks.filter(task => task.status === "완료");
    const overdueTasks = projectTasks.filter(task => {
      if (!task.deadline) return false;
      return new Date(task.deadline) < new Date();
    });
    
    const progressPercentage = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;
    
    // Add assignee info to tasks
    const tasksWithAssignees: SafeTaskWithAssignee[] = [];
    for (const task of projectTasks) {
      const assigneeUser = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
      const assignee = assigneeUser ? (({ password, ...safeUser }) => safeUser)(assigneeUser) : undefined;
      tasksWithAssignees.push({ ...task, assignee });
    }
    
    return {
      ...project,
      owner,
      tasks: tasksWithAssignees,
      totalTasks: projectTasks.length,
      completedTasks: completedTasks.length,
      progressPercentage: Math.round(progressPercentage),
      hasOverdueTasks: overdueTasks.length > 0,
      overdueTaskCount: overdueTasks.length,
    };
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const project: Project = { 
      ...insertProject, 
      id, 
      description: insertProject.description || null,
      deadline: insertProject.deadline || null,
      ownerId: insertProject.ownerId || null,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, project);
    
    // Create activity
    if (insertProject.ownerId) {
      await this.createActivity({
        description: `새 프로젝트가 생성되었습니다`,
        taskId: null,
        userId: insertProject.ownerId,
      });
    }
    
    return project;
  }

  async updateProject(id: string, updateData: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject: Project = {
      ...existingProject,
      ...updateData,
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

  async getTasksByProject(projectId: string): Promise<SafeTaskWithAssignee[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.projectId === projectId);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getAllTasks(): Promise<SafeTaskWithAssignee[]> {
    const tasks = Array.from(this.tasks.values());
    const tasksWithAssignees: SafeTaskWithAssignee[] = [];
    
    for (const task of tasks) {
      const assigneeUser = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
      const assignee = assigneeUser ? (({ password, ...safeUser }) => safeUser)(assigneeUser) : undefined;
      tasksWithAssignees.push({ ...task, assignee });
    }
    
    return tasksWithAssignees.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getTask(id: string): Promise<SafeTaskWithAssignee | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const assigneeUser = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
    const assignee = assigneeUser ? (({ password, ...safeUser }) => safeUser)(assigneeUser) : undefined;
    return { ...task, assignee };
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const now = new Date();
    const task: Task = { 
      ...insertTask, 
      id, 
      description: insertTask.description || null,
      deadline: insertTask.deadline || null,
      duration: insertTask.duration || null,
      priority: insertTask.priority || null,
      status: insertTask.status || "실행대기",
      assigneeId: insertTask.assigneeId || null,
      projectId: insertTask.projectId || null,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.set(id, task);
    
    // Create activity
    if (insertTask.assigneeId) {
      await this.createActivity({
        description: `새 작업이 생성되었습니다`,
        taskId: id,
        userId: insertTask.assigneeId,
      });
    }
    
    return task;
  }

  async updateTask(id: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask: Task = {
      ...existingTask,
      ...updateData,
      updatedAt: new Date(),
    };
    
    this.tasks.set(id, updatedTask);
    
    // Create activity
    if (updateData.assigneeId) {
      await this.createActivity({
        description: `작업이 수정되었습니다`,
        taskId: id,
        userId: updateData.assigneeId,
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

  async getTasksByStatus(status: string): Promise<SafeTaskWithAssignee[]> {
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
}

export const storage = new MemStorage();
