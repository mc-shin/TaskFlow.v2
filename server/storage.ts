import { type User, type InsertUser, type Task, type InsertTask, type Activity, type InsertActivity, type TaskWithAssignee, type ActivityWithDetails, type Project, type InsertProject, type ProjectWithOwner, type UserWithStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getAllUsersWithStats(): Promise<UserWithStats[]>;
  updateUserLastLogin(id: string): Promise<void>;

  // Project methods
  getAllProjects(): Promise<ProjectWithOwner[]>;
  getProject(id: string): Promise<ProjectWithOwner | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Task methods
  getAllTasks(): Promise<TaskWithAssignee[]>;
  getTask(id: string): Promise<TaskWithAssignee | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getTasksByStatus(status: string): Promise<TaskWithAssignee[]>;
  getTasksByProject(projectId: string): Promise<TaskWithAssignee[]>;

  // Activity methods
  getAllActivities(): Promise<ActivityWithDetails[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private tasks: Map<string, Task>;
  private activities: Map<string, Activity>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.activities = new Map();
    
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

  async getAllUsersWithStats(): Promise<UserWithStats[]> {
    const users = Array.from(this.users.values());
    const usersWithStats: UserWithStats[] = [];
    
    for (const user of users) {
      const userTasks = Array.from(this.tasks.values()).filter(task => task.assigneeId === user.id);
      const completedTasks = userTasks.filter(task => task.status === "완료");
      const overdueTasks = userTasks.filter(task => {
        if (!task.deadline) return false;
        return new Date(task.deadline) < new Date();
      });
      
      const progressPercentage = userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0;
      
      usersWithStats.push({
        ...user,
        taskCount: userTasks.length,
        completedTaskCount: completedTasks.length,
        overdueTaskCount: overdueTasks.length,
        progressPercentage: Math.round(progressPercentage),
        hasOverdueTasks: overdueTasks.length > 0,
      });
    }
    
    return usersWithStats;
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
      const owner = project.ownerId ? await this.getUser(project.ownerId) : undefined;
      const projectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === project.id);
      const completedTasks = projectTasks.filter(task => task.status === "완료");
      const overdueTasks = projectTasks.filter(task => {
        if (!task.deadline) return false;
        return new Date(task.deadline) < new Date();
      });
      
      const progressPercentage = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;
      
      // Add assignee info to tasks
      const tasksWithAssignees: TaskWithAssignee[] = [];
      for (const task of projectTasks) {
        const assignee = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
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
      });
    }
    
    return projectsWithOwner.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getProject(id: string): Promise<ProjectWithOwner | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const owner = project.ownerId ? await this.getUser(project.ownerId) : undefined;
    const projectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === project.id);
    const completedTasks = projectTasks.filter(task => task.status === "완료");
    const overdueTasks = projectTasks.filter(task => {
      if (!task.deadline) return false;
      return new Date(task.deadline) < new Date();
    });
    
    const progressPercentage = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;
    
    // Add assignee info to tasks
    const tasksWithAssignees: TaskWithAssignee[] = [];
    for (const task of projectTasks) {
      const assignee = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
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
    };
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const project: Project = { 
      ...insertProject, 
      id, 
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
      for (const [taskId, task] of this.tasks.entries()) {
        if (task.projectId === id) {
          this.tasks.delete(taskId);
          // Remove activities for this task
          for (const [activityId, activity] of this.activities.entries()) {
            if (activity.taskId === taskId) {
              this.activities.delete(activityId);
            }
          }
        }
      }
    }
    
    return deleted;
  }

  async getTasksByProject(projectId: string): Promise<TaskWithAssignee[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.projectId === projectId);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getAllTasks(): Promise<TaskWithAssignee[]> {
    const tasks = Array.from(this.tasks.values());
    const tasksWithAssignees: TaskWithAssignee[] = [];
    
    for (const task of tasks) {
      const assignee = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
      tasksWithAssignees.push({ ...task, assignee });
    }
    
    return tasksWithAssignees.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getTask(id: string): Promise<TaskWithAssignee | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const assignee = task.assigneeId ? await this.getUser(task.assigneeId) : undefined;
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
      for (const [activityId, activity] of this.activities.entries()) {
        if (activity.taskId === id) {
          this.activities.delete(activityId);
        }
      }
    }
    
    return deleted;
  }

  async getTasksByStatus(status: string): Promise<TaskWithAssignee[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.status === status);
  }

  async getAllActivities(): Promise<ActivityWithDetails[]> {
    const activities = Array.from(this.activities.values());
    const activitiesWithDetails: ActivityWithDetails[] = [];
    
    for (const activity of activities) {
      const user = activity.userId ? await this.getUser(activity.userId) : undefined;
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
}

export const storage = new MemStorage();
