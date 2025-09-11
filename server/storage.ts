import { type User, type InsertUser, type Task, type InsertTask, type Activity, type InsertActivity, type TaskWithAssignee, type ActivityWithDetails } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Task methods
  getAllTasks(): Promise<TaskWithAssignee[]>;
  getTask(id: string): Promise<TaskWithAssignee | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getTasksByStatus(status: string): Promise<TaskWithAssignee[]>;

  // Activity methods
  getAllActivities(): Promise<ActivityWithDetails[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tasks: Map<string, Task>;
  private activities: Map<string, Activity>;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.activities = new Map();
    
    // Initialize with some default users
    this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers() {
    const defaultUsers = [
      { username: "hyejin", password: "password", name: "전혜진", initials: "전" },
      { username: "hyejung", password: "password", name: "전혜중", initials: "전" },
      { username: "chamin", password: "password", name: "차민", initials: "차" },
    ];

    for (const user of defaultUsers) {
      await this.createUser(user);
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
      createdAt: new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }
}

export const storage = new MemStorage();
