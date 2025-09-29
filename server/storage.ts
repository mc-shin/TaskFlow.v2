import { type User, type InsertUser, type Task, type InsertTask, type Activity, type InsertActivity, type TaskWithAssignees, type ActivityWithDetails, type Project, type InsertProject, type ProjectWithOwners, type UserWithStats, type SafeUser, type SafeUserWithStats, type SafeTaskWithAssignees, type SafeActivityWithDetails, type Meeting, type InsertMeeting, type MeetingComment, type InsertMeetingComment, type MeetingAttachment, type InsertMeetingAttachment, type MeetingCommentWithAuthor, type MeetingWithDetails, type Goal, type InsertGoal, type GoalWithTasks, type ProjectWithDetails, type Attachment, type InsertAttachment, type Comment, type InsertComment, type CommentWithAuthor, type Invitation, type InsertInvitation, users, projects, goals, tasks, activities, meetings, meetingComments, meetingAttachments, attachments, comments, invitations } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, inArray, sql, asc } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByIds(userIds: string[]): Promise<SafeUser[]>;
  getAllUsersWithStats(): Promise<SafeUserWithStats[]>;
  getAllSafeUsers(): Promise<SafeUser[]>;
  updateUserLastLogin(id: string): Promise<void>;
  getWorkspaceMembers(): Promise<SafeUser[]>;
  getDefaultWorkspaceMembers(): Promise<SafeUser[]>;
  getWorkspaceUsersWithStats(): Promise<SafeUserWithStats[]>;

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

  // Invitation methods
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationsByProject(projectId: string): Promise<Invitation[]>;
  getInvitationsByEmail(email: string): Promise<Invitation[]>;
  updateInvitationStatus(id: string, status: string): Promise<Invitation | undefined>;
  deleteInvitation(id: string): Promise<boolean>;
  getProjectMemberIds(projectId: string): Promise<string[]>; // 초대받은 사용자 ID 목록
  
  // Archive methods
  archiveProject(id: string, lastUpdatedBy?: string): Promise<Project | undefined>;
  unarchiveProject(id: string, lastUpdatedBy?: string): Promise<Project | undefined>;
  archiveGoal(id: string, lastUpdatedBy?: string): Promise<Goal | undefined>;
  unarchiveGoal(id: string, lastUpdatedBy?: string): Promise<Goal | undefined>;
  archiveTask(id: string, lastUpdatedBy?: string): Promise<Task | undefined>;
  unarchiveTask(id: string, lastUpdatedBy?: string): Promise<Task | undefined>;
  getArchivedProjects(): Promise<ProjectWithDetails[]>;
  getArchivedGoals(): Promise<GoalWithTasks[]>;
  getArchivedTasks(): Promise<SafeTaskWithAssignees[]>;
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
  private invitations: Map<string, Invitation>;

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
    this.invitations = new Map();
    
    // Initialize with some default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Initialize users
    const defaultUsers = [
      { username: "admin", email: "admin@qubicom.co.kr", password: "password", name: "테스트", initials: "테", role: "관리자", lastLoginAt: null },
      { username: "hyejin", email: "hyejin@qubicom.co.kr", password: "password", name: "전혜진", initials: "전", role: "팀원", lastLoginAt: null },
      { username: "hyejung", email: "hyejung@qubicom.co.kr", password: "password", name: "전혜중", initials: "전", role: "팀원", lastLoginAt: null },
      { username: "chamin", email: "chamin@qubicom.co.kr", password: "password", name: "차민", initials: "차", role: "팀원", lastLoginAt: null },
    ];

    for (const user of defaultUsers) {
      await this.createUser(user);
    }

    // Initialize projects
    const userArray = Array.from(this.users.values());
    const defaultProjects = [
      { 
        name: "메인 프로젝트", 
        code: "MAIN-01", 
        description: "메인 프로젝트 관리",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D-30
        status: "진행중",
        labels: ["관리", "메인"],
        ownerIds: userArray[0]?.id ? [userArray[0].id] : [] // admin 사용자 (첫 번째)
      },
      { 
        name: "지금 벙크 성장 기능 개발", 
        code: "RIIDO-41", 
        description: "성장 기능 구현",
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D-14
        status: "진행중",
        labels: ["개발", "핵심기능"],
        ownerIds: userArray[1]?.id ? [userArray[1].id] : [] // hyejin (두 번째)
      },
      { 
        name: "v0.10.4 업데이트", 
        code: "RIIDO-27", 
        description: "앱 업데이트",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D-7
        status: "진행중",
        labels: ["업데이트"],
        ownerIds: userArray[2]?.id ? [userArray[2].id] : [] // hyejung (세 번째)
      },
      { 
        name: "디스코드 연동", 
        code: "RIIDO-70", 
        description: "디스코드 연동 기능",
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D-1
        status: "진행전",
        labels: ["연동", "봇"],
        ownerIds: userArray[3]?.id ? [userArray[3].id] : [] // chamin (네 번째)
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
      { title: "프로젝트 관리", description: "메인 프로젝트 전체 관리", deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행중", labels: ["관리", "계획"], assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], projectId: projectArray[0]?.id },
      { title: "팀 관리", description: "팀원들의 업무 및 성과 관리", deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행중", labels: ["팀", "관리"], assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], projectId: projectArray[0]?.id },
      { title: "메인 기능 개발", description: "핵심 기능 구현", deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행중", labels: ["개발", "핵심"], assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], projectId: projectArray[1]?.id },
      { title: "UI/UX 개선", description: "사용자 인터페이스 개선", deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "목표", labels: ["디자인"], assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], projectId: projectArray[1]?.id },
      { title: "API 연동", description: "외부 API 연동 작업", deadline: null, status: "진행전", labels: ["연동", "API"], assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], projectId: projectArray[2]?.id },
      { title: "시스템 최적화", description: "성능 및 안정성 개선", deadline: null, status: "목표", labels: ["성능"], assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], projectId: projectArray[2]?.id },
      { title: "연동 기능", description: "다른 서비스와의 연동", deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행전", labels: ["연동"], assigneeIds: userArray[3]?.id ? [userArray[3].id] : [], projectId: projectArray[3]?.id },
    ];

    for (let i = 0; i < defaultGoals.length; i++) {
      const goal = defaultGoals[i];
      const creator = userArray[i % userArray.length]; // Cycle through users
      await this.createGoal(goal, creator?.id);
    }

    // Initialize tasks for goals
    const goalArray = Array.from(this.goals.values());
    const defaultTasks = [
      // 메인 프로젝트 tasks (프로젝트 관리, 팀 관리)
      { title: "프로젝트 계획 수립", description: "", status: "완료", goalId: goalArray[0]?.id, projectId: projectArray[0]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["계획", "관리"] },
      { title: "일정 관리 시스템 구축", description: "", status: "진행중", goalId: goalArray[0]?.id, projectId: projectArray[0]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["시스템", "관리"] },
      { title: "팀원 역할 분담", description: "", status: "완료", goalId: goalArray[1]?.id, projectId: projectArray[0]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["팀", "관리"] },
      { title: "성과 평가 시스템", description: "", status: "진행전", goalId: goalArray[1]?.id, projectId: projectArray[0]?.id, assigneeIds: userArray[0]?.id ? [userArray[0].id] : [], deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["평가", "시스템"] },

      // Goal 3 tasks (메인 기능 개발) - 지금 벙크 성장 기능 개발
      { title: "지금 벙크 성장 기능", description: "", status: "완료", goalId: goalArray[2]?.id, projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["개발"] },
      { title: "업데이트 창 폭을 정함", description: "", status: "진행전", goalId: goalArray[2]?.id, projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["디자인"] },
      { title: "프로젝트 UI 개선", description: "", status: "진행전", goalId: goalArray[3]?.id, projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["UI", "개선"] },
      { title: "지금벙 API 연동", description: "", status: "진행중", goalId: goalArray[2]?.id, projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["API", "연동"] },
      { title: "지금벙 Webhook 설정", description: "", status: "진행전", goalId: goalArray[2]?.id, projectId: projectArray[1]?.id, assigneeIds: userArray[1]?.id ? [userArray[1].id] : [], deadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "4", labels: ["설정"] },
      
      // v0.10.4 업데이트 tasks  
      { title: "미니 번번 생성 및 알림 기능", description: "", status: "완료", goalId: goalArray[4]?.id, projectId: projectArray[2]?.id, assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["기능", "알림"] },
      { title: "넥스트 센터 개선 - 블랙 센터네트 업데이트", description: "", status: "진행전", goalId: goalArray[5]?.id, projectId: projectArray[2]?.id, assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["업데이트"] },
      { title: "널링앱 설정창 이동을 성능 향 숫 안정 개선", description: "", status: "진행전", goalId: goalArray[5]?.id, projectId: projectArray[2]?.id, assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["성능", "개선"] },
      { title: "리스트에서 차례 드래그로널스 기능 발밑", description: "", status: "진행전", goalId: goalArray[4]?.id, projectId: projectArray[2]?.id, assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "4", labels: ["기능"] },
      { title: "리스트에서 차례 사제지 즤저 방밎 입한", description: "", status: "진행전", goalId: goalArray[4]?.id, projectId: projectArray[2]?.id, assigneeIds: userArray[2]?.id ? [userArray[2].id] : [], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["기능"] },
      
      // 디스코드 연동 tasks
      { title: "차례 변경사항에 대한 알림", description: "", status: "진행전", goalId: goalArray[6]?.id, projectId: projectArray[3]?.id, assigneeIds: userArray[3]?.id ? [userArray[3].id] : [], deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["알림", "봇"] },
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
      role: insertUser.role || "팀원", // 기본값 설정
      lastLoginAt: insertUser.lastLoginAt || null
    };
    this.users.set(id, user);
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    // 사용자 존재 확인
    const user = this.users.get(id);
    if (!user) {
      return false;
    }
    
    // 관리자 사용자 삭제 방지
    if (user.role === "관리자") {
      throw new Error("관리자 계정은 삭제할 수 없습니다.");
    }
    
    // 모든 프로젝트에서 해당 사용자를 ownerIds에서 제거
    const projects = Array.from(this.projects.values());
    for (const project of projects) {
      if (project.ownerIds && project.ownerIds.includes(id)) {
        project.ownerIds = project.ownerIds.filter(ownerId => ownerId !== id);
        this.projects.set(project.id, project);
      }
    }
    
    // 모든 목표에서 해당 사용자를 assigneeIds에서 제거
    const goals = Array.from(this.goals.values());
    for (const goal of goals) {
      if (goal.assigneeIds && goal.assigneeIds.includes(id)) {
        goal.assigneeIds = goal.assigneeIds.filter(assigneeId => assigneeId !== id);
        this.goals.set(goal.id, goal);
      }
    }
    
    // 모든 작업에서 해당 사용자를 assigneeIds에서 제거
    const tasks = Array.from(this.tasks.values());
    for (const task of tasks) {
      if (task.assigneeIds && task.assigneeIds.includes(id)) {
        task.assigneeIds = task.assigneeIds.filter(assigneeId => assigneeId !== id);
        this.tasks.set(task.id, task);
      }
    }
    
    // 모든 미팅에서 해당 사용자를 attendeeIds에서 제거
    const meetings = Array.from(this.meetings.values());
    for (const meeting of meetings) {
      if (meeting.attendeeIds && meeting.attendeeIds.includes(id)) {
        meeting.attendeeIds = meeting.attendeeIds.filter(attendeeId => attendeeId !== id);
        this.meetings.set(meeting.id, meeting);
      }
    }
    
    // 사용자 삭제
    this.users.delete(id);
    
    return true;
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
    
    return projectsWithOwner.sort((a, b) => {
      const aTime = new Date(a.createdAt!).getTime();
      const bTime = new Date(b.createdAt!).getTime();
      if (aTime !== bTime) {
        return aTime - bTime; // Sort by createdAt ascending (oldest first)
      }
      return a.id.localeCompare(b.id); // Stable secondary sort by id
    });
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
    
    return projectsWithDetails.sort((a, b) => {
      const aTime = new Date(a.createdAt!).getTime();
      const bTime = new Date(b.createdAt!).getTime();
      if (aTime !== bTime) {
        return aTime - bTime; // Sort by createdAt ascending (oldest first)
      }
      return a.id.localeCompare(b.id); // Stable secondary sort by id
    });
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
      
      // Add assignees info to goal
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
      
      goalsWithTasks.push({
        ...goal,
        tasks: tasksWithAssignees,
        totalTasks: goalTasks.length,
        completedTasks: completedTasks.length,
        progressPercentage: Math.round(progressPercentage),
        assignees: goalAssignees,
      });
    }
    
    return goalsWithTasks.sort((a, b) => {
      const aTime = new Date(a.createdAt!).getTime();
      const bTime = new Date(b.createdAt!).getTime();
      if (aTime !== bTime) {
        return aTime - bTime; // Sort by createdAt ascending (oldest first)
      }
      return a.id.localeCompare(b.id); // Stable secondary sort by id
    });
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
    
    // Add assignees info to goal
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
    
    return {
      ...goal,
      tasks: tasksWithAssignees,
      totalTasks: goalTasks.length,
      completedTasks: completedTasks.length,
      progressPercentage: Math.round(progressPercentage),
      assignees: goalAssignees,
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
    
    // Create activity log for goal creation
    if (createdBy) {
      await this.createActivity({
        description: `새 목표가 생성되었습니다`,
        taskId: null, // Goal creation doesn't have a taskId
        userId: createdBy,
      });
    }
    
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

  async getUsersByIds(userIds: string[]): Promise<SafeUser[]> {
    const users: SafeUser[] = [];
    for (const userId of userIds) {
      const user = await this.getUser(userId);
      if (user) {
        const { password, ...safeUser } = user;
        users.push(safeUser);
      }
    }
    return users;
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
    
    return tasksWithAssignees.sort((a, b) => {
      const aTime = new Date(a.createdAt!).getTime();
      const bTime = new Date(b.createdAt!).getTime();
      if (aTime !== bTime) {
        return aTime - bTime; // Sort by createdAt ascending (oldest first)
      }
      return a.id.localeCompare(b.id); // Stable secondary sort by id
    });
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
          role: author.role,
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

  // Invitation methods
  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const id = randomUUID();
    const invitation: Invitation = {
      ...insertInvitation,
      id,
      status: insertInvitation.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invitations.set(id, invitation);
    return invitation;
  }

  async getInvitationsByProject(projectId: string): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter(invitation => invitation.projectId === projectId);
  }

  async getInvitationsByEmail(email: string): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter(invitation => invitation.inviteeEmail === email);
  }

  async updateInvitationStatus(id: string, status: string): Promise<Invitation | undefined> {
    const invitation = this.invitations.get(id);
    if (!invitation) return undefined;
    
    invitation.status = status;
    invitation.updatedAt = new Date();
    this.invitations.set(id, invitation);
    return invitation;
  }

  async deleteInvitation(id: string): Promise<boolean> {
    return this.invitations.delete(id);
  }

  async getProjectMemberIds(projectId: string): Promise<string[]> {
    // 프로젝트 owner들의 ID 목록을 반환
    const project = this.projects.get(projectId);
    if (!project) return [];
    
    // 현재 프로젝트의 ownerIds와 초대를 수락한 사용자들을 포함
    const ownerIds = project.ownerIds || [];
    
    // 초대를 수락한 사용자들의 이메일을 찾아서 해당 사용자 ID로 변환
    const acceptedInvitations = Array.from(this.invitations.values())
      .filter(inv => inv.projectId === projectId && inv.status === 'accepted');
    
    const invitedUserIds: string[] = [];
    for (const invitation of acceptedInvitations) {
      const user = Array.from(this.users.values()).find(u => u.email === invitation.inviteeEmail);
      if (user) {
        invitedUserIds.push(user.id);
      }
    }
    
    // 중복 제거하여 반환
    const allIds = ownerIds.concat(invitedUserIds);
    return Array.from(new Set(allIds));
  }

  async getWorkspaceMembers(): Promise<SafeUser[]> {
    // 워크스페이스 멤버는 다음과 같습니다:
    // 1. admin 사용자만 자동 포함 (워크스페이스 관리를 위해)
    // 2. 초대를 수락한 사용자들
    
    const allUsers = Array.from(this.users.values());
    
    // admin 사용자만 자동 포함
    const adminUsers = allUsers.filter(user => user.role === '관리자');
    
    // 초대를 수락한 사용자들의 이메일 목록
    const acceptedInvitations = Array.from(this.invitations.values())
      .filter(inv => inv.status === 'accepted');
    
    const invitedUserEmails = new Set(acceptedInvitations.map(inv => inv.inviteeEmail));
    
    // 초대를 수락한 사용자들 (admin 사용자 제외)
    const invitedUsers = allUsers.filter(user => 
      invitedUserEmails.has(user.email) && user.role !== '관리자'
    );
    
    // admin 사용자와 초대 수락한 사용자들을 합침
    const workspaceUsers = [...adminUsers, ...invitedUsers];
    
    // SafeUser 형태로 변환 (비밀번호 제거)
    return workspaceUsers.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  async getDefaultWorkspaceMembers(): Promise<SafeUser[]> {
    // 기본 워크스페이스 멤버만 반환 (프로젝트 담당자 선택용)
    // 초대를 수락한 사용자는 포함하지 않음
    
    const allUsers = Array.from(this.users.values());
    const defaultUserEmails = [
      'admin@qubicom.co.kr',
      'hyejin@qubicom.co.kr', 
      'hyejung@qubicom.co.kr',
      'chamin@qubicom.co.kr'
    ];
    
    // 기본 사용자들만 필터링
    const defaultUsers = allUsers.filter(user => defaultUserEmails.includes(user.email));
    
    // SafeUser 형태로 변환 (비밀번호 제거)
    return defaultUsers.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  async getWorkspaceUsersWithStats(): Promise<SafeUserWithStats[]> {
    // 워크스페이스 멤버들의 통계와 함께 정보 반환
    const workspaceMembers = await this.getWorkspaceMembers();
    
    // 각 사용자의 통계 계산
    const usersWithStats = await Promise.all(
      workspaceMembers.map(async (user) => {
        // 사용자가 생성한 프로젝트 수
        const projectCount = Array.from(this.projects.values())
          .filter(project => project.createdBy === user.id).length;

        // 사용자가 담당한 작업 수
        const taskCount = Array.from(this.tasks.values())
          .filter(task => task.assigneeIds && task.assigneeIds.includes(user.id)).length;

        // 사용자가 완료한 작업 수
        const completedTaskCount = Array.from(this.tasks.values())
          .filter(task => 
            task.assigneeIds && 
            task.assigneeIds.includes(user.id) && 
            task.status === '완료'
          ).length;

        return {
          ...user,
          projectCount,
          taskCount,
          completedTaskCount,
        };
      })
    );

    return usersWithStats;
  }

  // Archive methods
  async archiveProject(id: string, lastUpdatedBy?: string): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, isArchived: true, lastUpdatedBy, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async unarchiveProject(id: string, lastUpdatedBy?: string): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, isArchived: false, lastUpdatedBy, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async archiveGoal(id: string, lastUpdatedBy?: string): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, isArchived: true, lastUpdatedBy, updatedAt: new Date() };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async unarchiveGoal(id: string, lastUpdatedBy?: string): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, isArchived: false, lastUpdatedBy, updatedAt: new Date() };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async archiveTask(id: string, lastUpdatedBy?: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, isArchived: true, lastUpdatedBy, updatedAt: new Date() };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async unarchiveTask(id: string, lastUpdatedBy?: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, isArchived: false, lastUpdatedBy, updatedAt: new Date() };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async getArchivedProjects(): Promise<ProjectWithDetails[]> {
    const archivedProjects = Array.from(this.projects.values()).filter(p => p.isArchived);
    const projectsWithDetails: ProjectWithDetails[] = [];

    for (const project of archivedProjects) {
      const ownerIds = project.ownerIds || [];
      let ownerUsers: SafeUser[] = [];
      if (ownerIds.length > 0) {
        ownerUsers = await this.getUsersByIds(ownerIds);
      }

      const projectGoals = Array.from(this.goals.values()).filter(g => g.projectId === project.id);
      const projectTasks = Array.from(this.tasks.values()).filter(t => t.projectId === project.id);

      const goalTaskCounts = projectGoals.map(goal => {
        return Array.from(this.tasks.values()).filter(t => t.goalId === goal.id).length;
      });

      const totalTasks = projectTasks.length + goalTaskCounts.reduce((sum, count) => sum + count, 0);
      const completedTasks = projectTasks.filter(task => task.status === '완료').length +
        projectGoals.map(goal => {
          return Array.from(this.tasks.values()).filter(t => t.goalId === goal.id && t.status === '완료').length;
        }).reduce((sum, count) => sum + count, 0);

      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      projectsWithDetails.push({
        ...project,
        owners: ownerUsers,
        totalTasks,
        completedTasks,
        progressPercentage,
        hasOverdueTasks: false,
        overdueTaskCount: 0
      });
    }

    return projectsWithDetails;
  }

  async getArchivedGoals(): Promise<GoalWithTasks[]> {
    const archivedGoals = Array.from(this.goals.values()).filter(g => g.isArchived);
    const goalsWithTasks: GoalWithTasks[] = [];

    for (const goal of archivedGoals) {
      const goalTasks = Array.from(this.tasks.values()).filter(t => t.goalId === goal.id);
      
      const tasksWithAssignees: SafeTaskWithAssignees[] = [];
      for (const task of goalTasks) {
        const assigneeIds = task.assigneeIds || [];
        let assigneeUsers: SafeUser[] = [];
        if (assigneeIds.length > 0) {
          assigneeUsers = await this.getUsersByIds(assigneeIds);
        }
        tasksWithAssignees.push({
          ...task,
          assignees: assigneeUsers
        });
      }

      const assigneeIds = goal.assigneeIds || [];
      let assigneeUsers: SafeUser[] = [];
      if (assigneeIds.length > 0) {
        assigneeUsers = await this.getUsersByIds(assigneeIds);
      }

      const totalTasks = goalTasks.length;
      const completedTasks = goalTasks.filter(task => task.status === '완료').length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      goalsWithTasks.push({
        ...goal,
        tasks: tasksWithAssignees,
        assignees: assigneeUsers,
        totalTasks,
        completedTasks,
        progressPercentage
      });
    }

    return goalsWithTasks;
  }

  async getArchivedTasks(): Promise<SafeTaskWithAssignees[]> {
    const archivedTasks = Array.from(this.tasks.values()).filter(t => t.isArchived);
    const tasksWithAssignees: SafeTaskWithAssignees[] = [];

    for (const task of archivedTasks) {
      const assigneeIds = task.assigneeIds || [];
      let assigneeUsers: SafeUser[] = [];
      if (assigneeIds.length > 0) {
        assigneeUsers = await this.getUsersByIds(assigneeIds);
      }

      tasksWithAssignees.push({
        ...task,
        assignees: assigneeUsers
      });
    }

    return tasksWithAssignees;
  }
}

// Database connection setup
let db: ReturnType<typeof drizzle> | undefined;

function getDatabase() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    
    // Use HTTP connection instead of WebSocket to avoid connection issues
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
  }
  return db;
}

export class DrizzleStorage implements IStorage {
  private db = getDatabase();

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values({
      ...insertUser,
      role: insertUser.role || "팀원",
      lastLoginAt: insertUser.lastLoginAt || null
    }).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    // Check if user exists
    const user = await this.getUser(id);
    if (!user) {
      return false;
    }
    
    // Prevent deletion of admin users
    if (user.role === "관리자") {
      throw new Error("관리자 계정은 삭제할 수 없습니다.");
    }
    
    // Remove user from all project ownerIds
    await this.db.update(projects)
      .set({ 
        ownerIds: sql`array_remove(${projects.ownerIds}, ${id})`,
        updatedAt: new Date()
      })
      .where(sql`${id} = ANY(${projects.ownerIds})`);
    
    // Remove user from all goal assigneeIds
    await this.db.update(goals)
      .set({ 
        assigneeIds: sql`array_remove(${goals.assigneeIds}, ${id})`,
        updatedAt: new Date()
      })
      .where(sql`${id} = ANY(${goals.assigneeIds})`);
    
    // Remove user from all task assigneeIds
    await this.db.update(tasks)
      .set({ 
        assigneeIds: sql`array_remove(${tasks.assigneeIds}, ${id})`,
        updatedAt: new Date()
      })
      .where(sql`${id} = ANY(${tasks.assigneeIds})`);
    
    // Remove user from all meeting attendeeIds
    await this.db.update(meetings)
      .set({ 
        attendeeIds: sql`array_remove(${meetings.attendeeIds}, ${id})`,
        updatedAt: new Date()
      })
      .where(sql`${id} = ANY(${meetings.attendeeIds})`);
    
    // Delete the user
    const result = await this.db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUsersByIds(userIds: string[]): Promise<SafeUser[]> {
    if (userIds.length === 0) return [];
    
    const userResults = await this.db.select().from(users).where(inArray(users.id, userIds));
    return userResults.map(({ password, ...safeUser }) => safeUser);
  }

  async getAllUsersWithStats(): Promise<SafeUserWithStats[]> {
    const allUsers = await this.db.select().from(users);
    const usersWithStats: SafeUserWithStats[] = [];
    
    for (const user of allUsers) {
      const userTasks = await this.db.select()
        .from(tasks)
        .where(sql`${user.id} = ANY(${tasks.assigneeIds})`);
      
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
    const allUsers = await this.db.select().from(users);
    return allUsers.map(({ password, ...safeUser }) => safeUser);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await this.db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async getWorkspaceMembers(): Promise<SafeUser[]> {
    // 워크스페이스 멤버는 다음과 같습니다:
    // 1. admin 사용자만 자동 포함 (워크스페이스 관리를 위해)
    // 2. 초대를 수락한 사용자들
    
    const allUsers = await this.db.select().from(users);
    
    // admin 사용자만 자동 포함
    const adminUsers = allUsers.filter(user => user.role === '관리자');
    
    // 초대를 수락한 사용자들의 이메일 목록
    const acceptedInvitations = await this.db.select().from(invitations)
      .where(eq(invitations.status, 'accepted'));
    
    const invitedUserEmails = new Set(acceptedInvitations.map(inv => inv.inviteeEmail));
    
    // 초대를 수락한 사용자들 (admin 사용자 제외)
    const invitedUsers = allUsers.filter(user => 
      invitedUserEmails.has(user.email) && user.role !== '관리자'
    );
    
    // admin 사용자와 초대 수락한 사용자들을 합침
    const workspaceUsers = [...adminUsers, ...invitedUsers];
    
    // SafeUser 형태로 변환 (비밀번호 제거)
    return workspaceUsers.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  async getDefaultWorkspaceMembers(): Promise<SafeUser[]> {
    const defaultUserEmails = [
      "admin@qubicom.co.kr",
      "hyejin@qubicom.co.kr", 
      "hyejung@qubicom.co.kr",
      "chamin@qubicom.co.kr"
    ];
    
    const allUsers = await this.db.select().from(users);
    const defaultUsers = allUsers.filter(user => defaultUserEmails.includes(user.email));
    return defaultUsers.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  async getWorkspaceUsersWithStats(): Promise<SafeUserWithStats[]> {
    const workspaceMembers = await this.getWorkspaceMembers();
    
    const usersWithStats = await Promise.all(
      workspaceMembers.map(async (user) => {
        const projectCount = await this.db.select({ count: sql`count(*)` })
          .from(projects)
          .where(eq(projects.createdBy, user.id));

        const taskCount = await this.db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(sql`${user.id} = ANY(${tasks.assigneeIds})`);

        const completedTaskCount = await this.db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(
            and(
              sql`${user.id} = ANY(${tasks.assigneeIds})`,
              eq(tasks.status, '완료')
            )
          );

        return {
          ...user,
          projectCount: Number(projectCount[0]?.count || 0),
          taskCount: Number(taskCount[0]?.count || 0),
          completedTaskCount: Number(completedTaskCount[0]?.count || 0),
        };
      })
    );

    return usersWithStats;
  }

  // Project methods
  async getAllProjects(): Promise<ProjectWithOwners[]> {
    const projectResults = await this.db.select().from(projects).orderBy(projects.createdAt, projects.id);
    
    const projectsWithOwners = await Promise.all(
      projectResults.map(async (project) => {
        const owners = (project.ownerIds && project.ownerIds.length > 0) 
          ? await this.getUsersByIds(project.ownerIds)
          : [];
        
        return {
          ...project,
          owners
        };
      })
    );
    
    return projectsWithOwners;
  }

  async getAllProjectsWithDetails(): Promise<ProjectWithDetails[]> {
    const projectResults = await this.db.select().from(projects).orderBy(projects.createdAt, projects.id);
    
    const projectsWithDetails = await Promise.all(
      projectResults.map(async (project) => {
        // Get goals for this project
        const projectGoals = await this.db.select().from(goals).where(eq(goals.projectId, project.id)).orderBy(goals.createdAt, goals.id);
        
        // Get goals with their tasks
        const goalsWithTasks = await Promise.all(
          projectGoals.map(async (goal) => {
            const goalTasks = await this.db.select().from(tasks).where(eq(tasks.goalId, goal.id)).orderBy(tasks.createdAt, tasks.id);
            
            const tasksWithAssignees = await Promise.all(
              goalTasks.map(async (task) => {
                const assignees = task.assigneeIds?.length > 0 
                  ? await this.getUsersByIds(task.assigneeIds)
                  : [];
                
                return {
                  ...task,
                  assignees
                };
              })
            );
            
            return {
              ...goal,
              tasks: tasksWithAssignees
            };
          })
        );
        
        return {
          ...project,
          goals: goalsWithTasks
        };
      })
    );
    
    return projectsWithDetails;
  }

  async getProject(id: string): Promise<ProjectWithOwners | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    const project = result[0];
    const owners = project.ownerIds?.length > 0 
      ? await this.getUsersByIds(project.ownerIds)
      : [];
    
    return {
      ...project,
      owners
    };
  }

  async createProject(insertProject: InsertProject, createdBy?: string): Promise<Project> {
    const result = await this.db.insert(projects).values({
      ...insertProject,
      createdBy,
      lastUpdatedBy: createdBy,
    }).returning();
    return result[0];
  }

  async updateProject(id: string, projectUpdate: Partial<InsertProject>, lastUpdatedBy?: string): Promise<Project | undefined> {
    const result = await this.db.update(projects)
      .set({
        ...projectUpdate,
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning();
    
    return result[0];
  }

  async deleteProject(id: string): Promise<boolean> {
    // Delete associated goals and tasks first
    const projectGoals = await this.db.select().from(goals).where(eq(goals.projectId, id));
    
    for (const goal of projectGoals) {
      await this.deleteGoal(goal.id);
    }
    
    // Delete project
    const result = await this.db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Goal methods
  async getAllGoals(): Promise<GoalWithTasks[]> {
    const goalResults = await this.db.select().from(goals).orderBy(goals.createdAt, goals.id);
    
    const goalsWithTasks = await Promise.all(
      goalResults.map(async (goal) => {
        const goalTasks = await this.db.select().from(tasks).where(eq(tasks.goalId, goal.id)).orderBy(tasks.createdAt, tasks.id);
        
        const tasksWithAssignees = await Promise.all(
          goalTasks.map(async (task) => {
            const assignees = task.assigneeIds?.length > 0 
              ? await this.getUsersByIds(task.assigneeIds)
              : [];
            
            return {
              ...task,
              assignees
            };
          })
        );
        
        // Add assignees info to goal
        const goalAssignees = goal.assigneeIds?.length > 0 
          ? await this.getUsersByIds(goal.assigneeIds)
          : [];
        
        return {
          ...goal,
          tasks: tasksWithAssignees,
          assignees: goalAssignees
        };
      })
    );
    
    return goalsWithTasks;
  }

  async getGoal(id: string): Promise<GoalWithTasks | undefined> {
    const result = await this.db.select().from(goals).where(eq(goals.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    const goal = result[0];
    const goalTasks = await this.db.select().from(tasks).where(eq(tasks.goalId, goal.id)).orderBy(tasks.createdAt, tasks.id);
    
    const tasksWithAssignees = await Promise.all(
      goalTasks.map(async (task) => {
        const assignees = task.assigneeIds?.length > 0 
          ? await this.getUsersByIds(task.assigneeIds)
          : [];
        
        return {
          ...task,
          assignees
        };
      })
    );
    
    return {
      ...goal,
      tasks: tasksWithAssignees
    };
  }

  async createGoal(insertGoal: InsertGoal, createdBy?: string): Promise<Goal> {
    const result = await this.db.insert(goals).values({
      ...insertGoal,
      createdBy,
      lastUpdatedBy: createdBy,
    }).returning();
    return result[0];
  }

  async updateGoal(id: string, goalUpdate: Partial<InsertGoal>, lastUpdatedBy?: string): Promise<Goal | undefined> {
    const result = await this.db.update(goals)
      .set({
        ...goalUpdate,
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(goals.id, id))
      .returning();
    
    return result[0];
  }

  async deleteGoal(id: string): Promise<boolean> {
    // Delete associated tasks first
    await this.db.delete(tasks).where(eq(tasks.goalId, id));
    
    // Delete goal
    const result = await this.db.delete(goals).where(eq(goals.id, id));
    return true;
  }

  async getGoalsByProject(projectId: string): Promise<GoalWithTasks[]> {
    const goalResults = await this.db.select().from(goals).where(eq(goals.projectId, projectId)).orderBy(goals.createdAt, goals.id);
    
    const goalsWithTasks = await Promise.all(
      goalResults.map(async (goal) => {
        const goalTasks = await this.db.select().from(tasks).where(eq(tasks.goalId, goal.id)).orderBy(tasks.createdAt, tasks.id);
        
        const tasksWithAssignees = await Promise.all(
          goalTasks.map(async (task) => {
            const assignees = task.assigneeIds?.length > 0 
              ? await this.getUsersByIds(task.assigneeIds)
              : [];
            
            return {
              ...task,
              assignees
            };
          })
        );
        
        // Add assignees info to goal
        const goalAssignees = goal.assigneeIds?.length > 0 
          ? await this.getUsersByIds(goal.assigneeIds)
          : [];
        
        return {
          ...goal,
          tasks: tasksWithAssignees,
          assignees: goalAssignees
        };
      })
    );
    
    return goalsWithTasks;
  }

  // Task methods
  async getAllTasks(): Promise<SafeTaskWithAssignees[]> {
    const taskResults = await this.db.select().from(tasks).orderBy(tasks.createdAt, tasks.id);
    
    const tasksWithAssignees = await Promise.all(
      taskResults.map(async (task) => {
        const assignees = task.assigneeIds?.length > 0 
          ? await this.getUsersByIds(task.assigneeIds)
          : [];
        
        return {
          ...task,
          assignees
        };
      })
    );
    
    return tasksWithAssignees;
  }

  async getTask(id: string): Promise<SafeTaskWithAssignees | undefined> {
    const result = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    const task = result[0];
    const assignees = task.assigneeIds?.length > 0 
      ? await this.getUsersByIds(task.assigneeIds)
      : [];
    
    return {
      ...task,
      assignees
    };
  }

  async createTask(insertTask: InsertTask, createdBy?: string): Promise<Task> {
    const result = await this.db.insert(tasks).values({
      ...insertTask,
      createdBy,
      lastUpdatedBy: createdBy,
    }).returning();
    return result[0];
  }

  async updateTask(id: string, taskUpdate: Partial<InsertTask>, lastUpdatedBy?: string): Promise<Task | undefined> {
    const result = await this.db.update(tasks)
      .set({
        ...taskUpdate,
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await this.db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  async getTasksByStatus(status: string): Promise<SafeTaskWithAssignees[]> {
    const taskResults = await this.db.select().from(tasks).where(eq(tasks.status, status));
    
    const tasksWithAssignees = await Promise.all(
      taskResults.map(async (task) => {
        const assignees = task.assigneeIds?.length > 0 
          ? await this.getUsersByIds(task.assigneeIds)
          : [];
        
        return {
          ...task,
          assignees
        };
      })
    );
    
    return tasksWithAssignees;
  }

  async getTasksByProject(projectId: string): Promise<SafeTaskWithAssignees[]> {
    const taskResults = await this.db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(tasks.createdAt, tasks.id);
    
    const tasksWithAssignees = await Promise.all(
      taskResults.map(async (task) => {
        const assignees = task.assigneeIds?.length > 0 
          ? await this.getUsersByIds(task.assigneeIds)
          : [];
        
        return {
          ...task,
          assignees
        };
      })
    );
    
    return tasksWithAssignees;
  }

  async getTasksByGoal(goalId: string): Promise<SafeTaskWithAssignees[]> {
    const taskResults = await this.db.select().from(tasks).where(eq(tasks.goalId, goalId)).orderBy(tasks.createdAt, tasks.id);
    
    const tasksWithAssignees = await Promise.all(
      taskResults.map(async (task) => {
        const assignees = task.assigneeIds?.length > 0 
          ? await this.getUsersByIds(task.assigneeIds)
          : [];
        
        return {
          ...task,
          assignees
        };
      })
    );
    
    return tasksWithAssignees;
  }

  // Activity methods
  async getAllActivities(): Promise<SafeActivityWithDetails[]> {
    const activityResults = await this.db.select().from(activities);
    
    const activitiesWithDetails = await Promise.all(
      activityResults.map(async (activity) => {
        const user = activity.userId ? await this.getUser(activity.userId) : undefined;
        const task = activity.taskId ? await this.getTask(activity.taskId) : undefined;
        
        return {
          ...activity,
          user: user ? { ...user, password: undefined } : undefined,
          task
        };
      })
    );
    
    return activitiesWithDetails;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const result = await this.db.insert(activities).values(insertActivity).returning();
    return result[0];
  }

  // Meeting methods
  async listMeetings(options?: { from?: string; to?: string }): Promise<Meeting[]> {
    let query = this.db.select().from(meetings);
    
    if (options?.from || options?.to) {
      const conditions = [];
      if (options.from) {
        conditions.push(sql`${meetings.startAt} >= ${options.from}`);
      }
      if (options.to) {
        conditions.push(sql`${meetings.startAt} <= ${options.to}`);
      }
      query = query.where(and(...conditions));
    }
    
    return await query;
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const result = await this.db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    return result[0];
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const result = await this.db.insert(meetings).values(insertMeeting).returning();
    return result[0];
  }

  async updateMeeting(id: string, meetingUpdate: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const result = await this.db.update(meetings)
      .set({
        ...meetingUpdate,
        updatedAt: new Date()
      })
      .where(eq(meetings.id, id))
      .returning();
    
    return result[0];
  }

  async deleteMeeting(id: string): Promise<boolean> {
    // Delete associated comments and attachments first
    await this.db.delete(meetingComments).where(eq(meetingComments.meetingId, id));
    await this.db.delete(meetingAttachments).where(eq(meetingAttachments.meetingId, id));
    
    // Delete meeting
    const result = await this.db.delete(meetings).where(eq(meetings.id, id));
    return true;
  }

  async addAttendee(meetingId: string, userId: string): Promise<Meeting | undefined> {
    const meeting = await this.getMeeting(meetingId);
    if (!meeting) return undefined;
    
    const attendeeIds = meeting.attendeeIds || [];
    if (!attendeeIds.includes(userId)) {
      attendeeIds.push(userId);
      
      const result = await this.db.update(meetings)
        .set({ 
          attendeeIds,
          updatedAt: new Date()
        })
        .where(eq(meetings.id, meetingId))
        .returning();
      
      return result[0];
    }
    
    return meeting;
  }

  async removeAttendee(meetingId: string, userId: string): Promise<Meeting | undefined> {
    const meeting = await this.getMeeting(meetingId);
    if (!meeting) return undefined;
    
    const attendeeIds = (meeting.attendeeIds || []).filter(id => id !== userId);
    
    const result = await this.db.update(meetings)
      .set({ 
        attendeeIds,
        updatedAt: new Date()
      })
      .where(eq(meetings.id, meetingId))
      .returning();
    
    return result[0];
  }

  // Meeting Comment methods
  async getMeetingComments(meetingId: string): Promise<MeetingCommentWithAuthor[]> {
    const commentResults = await this.db.select()
      .from(meetingComments)
      .where(eq(meetingComments.meetingId, meetingId));
    
    const commentsWithAuthor = await Promise.all(
      commentResults.map(async (comment) => {
        const author = await this.getUser(comment.authorId);
        
        return {
          ...comment,
          author: author ? { ...author, password: undefined } : undefined
        };
      })
    );
    
    return commentsWithAuthor;
  }

  async createMeetingComment(insertComment: InsertMeetingComment): Promise<MeetingComment> {
    const result = await this.db.insert(meetingComments).values(insertComment).returning();
    return result[0];
  }

  async deleteMeetingComment(id: string): Promise<boolean> {
    const result = await this.db.delete(meetingComments).where(eq(meetingComments.id, id));
    return true;
  }

  // Meeting Attachment methods
  async getMeetingAttachments(meetingId: string): Promise<MeetingAttachment[]> {
    return await this.db.select().from(meetingAttachments).where(eq(meetingAttachments.meetingId, meetingId));
  }

  async createMeetingAttachment(insertAttachment: InsertMeetingAttachment): Promise<MeetingAttachment> {
    const result = await this.db.insert(meetingAttachments).values(insertAttachment).returning();
    return result[0];
  }

  async deleteMeetingAttachment(id: string): Promise<boolean> {
    const result = await this.db.delete(meetingAttachments).where(eq(meetingAttachments.id, id));
    return true;
  }

  // General Attachment methods
  async getAttachments(entityType: string, entityId: string): Promise<Attachment[]> {
    return await this.db.select()
      .from(attachments)
      .where(
        and(
          eq(attachments.entityType, entityType),
          eq(attachments.entityId, entityId)
        )
      );
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const result = await this.db.insert(attachments).values(insertAttachment).returning();
    return result[0];
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const result = await this.db.delete(attachments).where(eq(attachments.id, id));
    return true;
  }

  // Comment methods
  async getComments(entityType: string, entityId: string): Promise<CommentWithAuthor[]> {
    const commentResults = await this.db.select()
      .from(comments)
      .where(
        and(
          eq(comments.entityType, entityType),
          eq(comments.entityId, entityId)
        )
      );
    
    const commentsWithAuthor = await Promise.all(
      commentResults.map(async (comment) => {
        const author = await this.getUser(comment.authorId);
        
        return {
          ...comment,
          author: author ? { ...author, password: undefined } : undefined
        };
      })
    );
    
    return commentsWithAuthor;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const result = await this.db.insert(comments).values(insertComment).returning();
    return result[0];
  }

  async updateComment(id: string, content: string): Promise<Comment | undefined> {
    const result = await this.db.update(comments)
      .set({ 
        content,
        updatedAt: new Date()
      })
      .where(eq(comments.id, id))
      .returning();
    
    return result[0];
  }

  async deleteComment(id: string): Promise<boolean> {
    const result = await this.db.delete(comments).where(eq(comments.id, id));
    return true;
  }

  // Invitation methods
  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const result = await this.db.insert(invitations).values(insertInvitation).returning();
    return result[0];
  }

  async getInvitationsByProject(projectId: string): Promise<Invitation[]> {
    return await this.db.select().from(invitations).where(eq(invitations.projectId, projectId));
  }

  async getInvitationsByEmail(email: string): Promise<Invitation[]> {
    return await this.db.select().from(invitations).where(eq(invitations.inviteeEmail, email));
  }

  async updateInvitationStatus(id: string, status: string): Promise<Invitation | undefined> {
    const result = await this.db.update(invitations)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(invitations.id, id))
      .returning();
    
    return result[0];
  }

  async deleteInvitation(id: string): Promise<boolean> {
    const result = await this.db.delete(invitations).where(eq(invitations.id, id));
    return true;
  }

  async getProjectMemberIds(projectId: string): Promise<string[]> {
    const acceptedInvitations = await this.db.select()
      .from(invitations)
      .where(
        and(
          eq(invitations.projectId, projectId),
          eq(invitations.status, 'accepted')
        )
      );
    
    // Get users by email from accepted invitations
    const memberIds: string[] = [];
    for (const invitation of acceptedInvitations) {
      const user = await this.getUserByEmail(invitation.inviteeEmail);
      if (user) {
        memberIds.push(user.id);
      }
    }
    
    return memberIds;
  }

  // Archive methods
  async archiveProject(id: string, lastUpdatedBy?: string): Promise<Project | undefined> {
    const result = await this.db.update(projects)
      .set({ 
        isArchived: true, 
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async unarchiveProject(id: string, lastUpdatedBy?: string): Promise<Project | undefined> {
    const result = await this.db.update(projects)
      .set({ 
        isArchived: false, 
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async archiveGoal(id: string, lastUpdatedBy?: string): Promise<Goal | undefined> {
    const result = await this.db.update(goals)
      .set({ 
        isArchived: true, 
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(goals.id, id))
      .returning();
    return result[0];
  }

  async unarchiveGoal(id: string, lastUpdatedBy?: string): Promise<Goal | undefined> {
    const result = await this.db.update(goals)
      .set({ 
        isArchived: false, 
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(goals.id, id))
      .returning();
    return result[0];
  }

  async archiveTask(id: string, lastUpdatedBy?: string): Promise<Task | undefined> {
    const result = await this.db.update(tasks)
      .set({ 
        isArchived: true, 
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async unarchiveTask(id: string, lastUpdatedBy?: string): Promise<Task | undefined> {
    const result = await this.db.update(tasks)
      .set({ 
        isArchived: false, 
        lastUpdatedBy,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async getArchivedProjects(): Promise<ProjectWithDetails[]> {
    const result = await this.db.select().from(projects).where(eq(projects.isArchived, true));
    const projectsWithDetails: ProjectWithDetails[] = [];

    for (const project of result) {
      const ownerIds = project.ownerIds || [];
      let ownerUsers: SafeUser[] = [];
      if (ownerIds.length > 0) {
        ownerUsers = await this.getUsersByIds(ownerIds);
      }

      const projectGoals = await this.db.select().from(goals).where(eq(goals.projectId, project.id));
      const projectTasks = await this.db.select().from(tasks).where(eq(tasks.projectId, project.id));

      const goalTaskCounts = await Promise.all(
        projectGoals.map(async (goal) => {
          const goalTasks = await this.db.select().from(tasks).where(eq(tasks.goalId, goal.id));
          return goalTasks.length;
        })
      );

      const totalTasks = projectTasks.length + goalTaskCounts.reduce((sum, count) => sum + count, 0);
      const completedTasks = projectTasks.filter(task => task.status === '완료').length +
        (await Promise.all(
          projectGoals.map(async (goal) => {
            const goalTasks = await this.db.select().from(tasks).where(eq(tasks.goalId, goal.id));
            return goalTasks.filter(task => task.status === '완료').length;
          })
        )).reduce((sum, count) => sum + count, 0);

      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      projectsWithDetails.push({
        ...project,
        owners: ownerUsers,
        totalTasks,
        completedTasks,
        progressPercentage,
        hasOverdueTasks: false,
        overdueTaskCount: 0
      });
    }

    return projectsWithDetails;
  }

  async getArchivedGoals(): Promise<GoalWithTasks[]> {
    const result = await this.db.select().from(goals).where(eq(goals.isArchived, true));
    const goalsWithTasks: GoalWithTasks[] = [];

    for (const goal of result) {
      const goalTasks = await this.db.select().from(tasks).where(eq(tasks.goalId, goal.id));
      
      const tasksWithAssignees: SafeTaskWithAssignees[] = [];
      for (const task of goalTasks) {
        const assigneeIds = task.assigneeIds || [];
        let assigneeUsers: SafeUser[] = [];
        if (assigneeIds.length > 0) {
          assigneeUsers = await this.getUsersByIds(assigneeIds);
        }
        tasksWithAssignees.push({
          ...task,
          assignees: assigneeUsers
        });
      }

      const assigneeIds = goal.assigneeIds || [];
      let assigneeUsers: SafeUser[] = [];
      if (assigneeIds.length > 0) {
        assigneeUsers = await this.getUsersByIds(assigneeIds);
      }

      const totalTasks = goalTasks.length;
      const completedTasks = goalTasks.filter(task => task.status === '완료').length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      goalsWithTasks.push({
        ...goal,
        tasks: tasksWithAssignees,
        assignees: assigneeUsers,
        totalTasks,
        completedTasks,
        progressPercentage
      });
    }

    return goalsWithTasks;
  }

  async getArchivedTasks(): Promise<SafeTaskWithAssignees[]> {
    const result = await this.db.select().from(tasks).where(eq(tasks.isArchived, true));
    const tasksWithAssignees: SafeTaskWithAssignees[] = [];

    for (const task of result) {
      const assigneeIds = task.assigneeIds || [];
      let assigneeUsers: SafeUser[] = [];
      if (assigneeIds.length > 0) {
        assigneeUsers = await this.getUsersByIds(assigneeIds);
      }

      tasksWithAssignees.push({
        ...task,
        assignees: assigneeUsers
      });
    }

    return tasksWithAssignees;
  }
}

// Initialize database with default data only if tables are empty
async function initializeDefaultDataIfNeeded() {
  const db = getDatabase();
  
  try {
    // Check if users table has any data
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length > 0) {
      console.log("Database already contains data, skipping initialization");
      return;
    }
    
    console.log("Initializing database with default data...");
    
    // Initialize users
    const defaultUsers = [
      { username: "admin", email: "admin@qubicom.co.kr", password: "password", name: "테스트", initials: "테", role: "관리자", lastLoginAt: null },
      { username: "hyejin", email: "hyejin@qubicom.co.kr", password: "password", name: "전혜진", initials: "전", role: "팀원", lastLoginAt: null },
      { username: "hyejung", email: "hyejung@qubicom.co.kr", password: "password", name: "전혜중", initials: "전", role: "팀원", lastLoginAt: null },
      { username: "chamin", email: "chamin@qubicom.co.kr", password: "password", name: "차민", initials: "차", role: "팀원", lastLoginAt: null },
    ];

    const createdUsers: User[] = [];
    for (const user of defaultUsers) {
      const result = await db.insert(users).values(user).returning();
      createdUsers.push(result[0]);
    }

    // Initialize projects
    const defaultProjects = [
      { 
        name: "메인 프로젝트", 
        code: "MAIN-01", 
        description: "메인 프로젝트 관리",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "진행중",
        labels: ["관리", "메인"],
        ownerIds: [createdUsers[0].id] // admin 사용자
      },
      { 
        name: "지금 벙크 성장 기능 개발", 
        code: "RIIDO-41", 
        description: "성장 기능 구현",
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "진행중",
        labels: ["개발", "핵심기능"],
        ownerIds: [createdUsers[1].id] // hyejin
      },
      { 
        name: "v0.10.4 업데이트", 
        code: "RIIDO-27", 
        description: "앱 업데이트",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "진행중",
        labels: ["업데이트"],
        ownerIds: [createdUsers[2].id] // hyejung
      },
      { 
        name: "디스코드 연동", 
        code: "RIIDO-70", 
        description: "디스코드 연동 기능",
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "진행전",
        labels: ["연동", "봇"],
        ownerIds: [createdUsers[3].id] // chamin
      },
    ];

    const createdProjects: Project[] = [];
    for (let i = 0; i < defaultProjects.length; i++) {
      const project = defaultProjects[i];
      const creator = createdUsers[i % createdUsers.length];
      const result = await db.insert(projects).values({
        ...project,
        createdBy: creator.id,
        lastUpdatedBy: creator.id,
      }).returning();
      createdProjects.push(result[0]);
    }

    // Initialize goals for projects
    const defaultGoals = [
      { title: "프로젝트 관리", description: "메인 프로젝트 전체 관리", deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행중", labels: ["관리", "계획"], assigneeIds: [createdUsers[0].id], projectId: createdProjects[0].id },
      { title: "팀 관리", description: "팀원들의 업무 및 성과 관리", deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행중", labels: ["팀", "관리"], assigneeIds: [createdUsers[0].id], projectId: createdProjects[0].id },
      { title: "메인 기능 개발", description: "핵심 기능 구현", deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행중", labels: ["개발", "핵심"], assigneeIds: [createdUsers[1].id], projectId: createdProjects[1].id },
      { title: "UI/UX 개선", description: "사용자 인터페이스 개선", deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "목표", labels: ["디자인"], assigneeIds: [createdUsers[1].id], projectId: createdProjects[1].id },
      { title: "API 연동", description: "외부 API 연동 작업", deadline: null, status: "진행전", labels: ["연동", "API"], assigneeIds: [createdUsers[2].id], projectId: createdProjects[2].id },
      { title: "시스템 최적화", description: "성능 및 안정성 개선", deadline: null, status: "목표", labels: ["성능"], assigneeIds: [createdUsers[2].id], projectId: createdProjects[2].id },
      { title: "연동 기능", description: "다른 서비스와의 연동", deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: "진행전", labels: ["연동"], assigneeIds: [createdUsers[3].id], projectId: createdProjects[3].id },
    ];

    const createdGoals: Goal[] = [];
    for (let i = 0; i < defaultGoals.length; i++) {
      const goal = defaultGoals[i];
      const creator = createdUsers[i % createdUsers.length];
      const result = await db.insert(goals).values({
        ...goal,
        createdBy: creator.id,
        lastUpdatedBy: creator.id,
      }).returning();
      createdGoals.push(result[0]);
    }

    // Initialize tasks for goals
    const defaultTasks = [
      // 메인 프로젝트 tasks
      { title: "프로젝트 계획 수립", description: "", status: "완료", goalId: createdGoals[0].id, projectId: createdProjects[0].id, assigneeIds: [createdUsers[0].id], deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["계획", "관리"] },
      { title: "일정 관리 시스템 구축", description: "", status: "진행중", goalId: createdGoals[0].id, projectId: createdProjects[0].id, assigneeIds: [createdUsers[0].id], deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["시스템", "관리"] },
      { title: "팀원 역할 분담", description: "", status: "완료", goalId: createdGoals[1].id, projectId: createdProjects[0].id, assigneeIds: [createdUsers[0].id], deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["팀", "관리"] },
      { title: "성과 평가 시스템", description: "", status: "진행전", goalId: createdGoals[1].id, projectId: createdProjects[0].id, assigneeIds: [createdUsers[0].id], deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["평가", "시스템"] },

      // 지금 벙크 성장 기능 개발 tasks
      { title: "지금 벙크 성장 기능", description: "", status: "완료", goalId: createdGoals[2].id, projectId: createdProjects[1].id, assigneeIds: [createdUsers[1].id], deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["개발"] },
      { title: "업데이트 창 폭을 정함", description: "", status: "진행전", goalId: createdGoals[2].id, projectId: createdProjects[1].id, assigneeIds: [createdUsers[1].id], deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["디자인"] },
      { title: "프로젝트 UI 개선", description: "", status: "진행전", goalId: createdGoals[3].id, projectId: createdProjects[1].id, assigneeIds: [createdUsers[1].id], deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["UI", "개선"] },
      { title: "지금벙 API 연동", description: "", status: "진행중", goalId: createdGoals[2].id, projectId: createdProjects[1].id, assigneeIds: [createdUsers[1].id], deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["API", "연동"] },
      { title: "지금벙 Webhook 설정", description: "", status: "진행전", goalId: createdGoals[2].id, projectId: createdProjects[1].id, assigneeIds: [createdUsers[1].id], deadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "4", labels: ["설정"] },
      
      // v0.10.4 업데이트 tasks  
      { title: "미니 번번 생성 및 알림 기능", description: "", status: "완료", goalId: createdGoals[4].id, projectId: createdProjects[2].id, assigneeIds: [createdUsers[2].id], deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["기능", "알림"] },
      { title: "넥스트 센터 개선 - 블랙 센터네트 업데이트", description: "", status: "진행전", goalId: createdGoals[5].id, projectId: createdProjects[2].id, assigneeIds: [createdUsers[2].id], deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "3", labels: ["업데이트"] },
      { title: "널링앱 설정창 이동을 성능 향 숫 안정 개선", description: "", status: "진행전", goalId: createdGoals[5].id, projectId: createdProjects[2].id, assigneeIds: [createdUsers[2].id], deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["성능", "개선"] },
      { title: "리스트에서 차례 드래그로널스 기능 발밑", description: "", status: "진행전", goalId: createdGoals[4].id, projectId: createdProjects[2].id, assigneeIds: [createdUsers[2].id], deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "4", labels: ["기능"] },
      { title: "리스트에서 차례 사제지 즤저 방밎 입한", description: "", status: "진행전", goalId: createdGoals[4].id, projectId: createdProjects[2].id, assigneeIds: [createdUsers[2].id], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "2", labels: ["기능"] },
      
      // 디스코드 연동 tasks
      { title: "차례 변경사항에 대한 알림", description: "", status: "진행전", goalId: createdGoals[6].id, projectId: createdProjects[3].id, assigneeIds: [createdUsers[3].id], deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], duration: 0, priority: "1", labels: ["알림", "봇"] },
    ];

    for (let i = 0; i < defaultTasks.length; i++) {
      const task = defaultTasks[i];
      const creator = createdUsers[i % createdUsers.length];
      
      // Set progress based on status
      let progress = 0;
      if (task.status === '완료') {
        progress = 100;
      } else if (task.status === '진행중') {
        progress = 50;
      }
      
      await db.insert(tasks).values({
        ...task,
        progress,
        createdBy: creator.id,
        lastUpdatedBy: creator.id,
      });
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
        attendeeIds: [createdUsers[0].id, createdUsers[1].id, createdUsers[2].id]
      },
      {
        title: "주간 스프린트 리뷰",
        description: "이번 주 진행된 작업들을 검토하고 다음 주 계획을 논의합니다.",
        startAt: "2025-09-15T14:00:00.000Z",
        endAt: "2025-09-15T15:00:00.000Z",
        type: "other",
        location: "Zoom",
        attendeeIds: [createdUsers[0].id, createdUsers[1].id]
      },
      {
        title: "클라이언트 미팅",
        description: "프로젝트 진행 상황을 클라이언트에게 보고합니다.",
        startAt: "2025-09-16T10:00:00.000Z",
        endAt: "2025-09-16T11:30:00.000Z",
        type: "other",
        location: "회의실 A",
        attendeeIds: [createdUsers[0].id]
      },
      {
        title: "4년 회의",
        description: "연간 계획 및 리뷰 미팅입니다.",
        startAt: "2025-09-17T10:00:00.000Z",
        endAt: "2025-09-17T11:00:00.000Z",
        type: "other",
        location: "회의실 B",
        attendeeIds: [createdUsers[0].id, createdUsers[1].id, createdUsers[2].id]
      },
      {
        title: "스팸티브 어린이",
        description: "특별 미팅입니다.",
        startAt: "2025-09-18T20:00:00.000Z",
        endAt: "2025-09-18T20:30:00.000Z",
        type: "other",
        location: "Zoom",
        attendeeIds: [createdUsers[0].id]
      }
    ];

    for (const meeting of defaultMeetings) {
      await db.insert(meetings).values(meeting);
    }
    
    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Initialize storage with proper synchronous fallback
async function initializeStorage(): Promise<IStorage> {
  try {
    // Try to initialize DrizzleStorage
    console.log("Attempting to connect to database...");
    const drizzleStorage = new DrizzleStorage();
    
    // Test database connection by trying to fetch users
    await drizzleStorage.getAllUsers();
    
    // If successful, initialize with default data if needed
    await initializeDefaultDataIfNeeded();
    
    console.log("Database connection successful - using persistent storage");
    return drizzleStorage;
  } catch (error) {
    console.error("Database connection failed, falling back to memory storage:", error);
    console.log("Using memory storage as fallback");
    return new MemStorage();
  }
}

// Initialize storage synchronously with promise that resolves to actual storage
export const storage = await initializeStorage();
