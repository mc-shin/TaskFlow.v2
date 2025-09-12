import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // RIIDO-41, RIIDO-27 등
  description: text("description"),
  deadline: text("deadline"),
  ownerId: varchar("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("실행대기"), // 실행대기, 이슈함, 사업팀, 인력팀
  priority: text("priority").default("중간"), // 높음, 중간, 낮음
  deadline: text("deadline"),
  duration: integer("duration").default(0),
  assigneeId: varchar("assignee_id").references(() => users.id),
  goalId: varchar("goal_id").references(() => goals.id),
  projectId: varchar("project_id").references(() => projects.id), // Keep for backward compatibility
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  taskId: varchar("task_id").references(() => tasks.id),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  startAt: text("start_at").notNull(), // ISO string
  endAt: text("end_at"), // ISO string - nullable for optional end time
  type: text("type").notNull().default("standup"), // 'standup' | 'other'
  location: text("location"),
  attendeeIds: text("attendee_ids").array().notNull().default(sql`'{}'`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetingAttachments = pgTable("meeting_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetingComments = pgTable("meeting_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingAttachmentSchema = createInsertSchema(meetingAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingCommentSchema = createInsertSchema(meetingComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertMeetingAttachment = z.infer<typeof insertMeetingAttachmentSchema>;
export type MeetingAttachment = typeof meetingAttachments.$inferSelect;

export type InsertMeetingComment = z.infer<typeof insertMeetingCommentSchema>;
export type MeetingComment = typeof meetingComments.$inferSelect;

export type MeetingCommentWithAuthor = MeetingComment & {
  author: SafeUser;
};

export type MeetingWithDetails = Meeting & {
  attachments?: MeetingAttachment[];
  comments?: MeetingCommentWithAuthor[];
};

export type TaskWithAssignee = Task & {
  assignee?: User;
};

export type SafeTaskWithAssignee = Task & {
  assignee?: SafeUser;
};


export type SafeUser = Omit<User, 'password'>;

export type SafeUserWithStats = Omit<User, 'password'> & {
  taskCount?: number;
  completedTaskCount?: number;
  overdueTaskCount?: number;
  progressPercentage?: number;
  hasOverdueTasks?: boolean;
};

export type UserWithStats = User & {
  taskCount?: number;
  completedTaskCount?: number;
  overdueTaskCount?: number;
  progressPercentage?: number;
  hasOverdueTasks?: boolean;
};

export type GoalWithTasks = Goal & {
  tasks?: SafeTaskWithAssignee[];
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
};

export type ProjectWithDetails = Project & {
  owner?: SafeUser;
  goals?: GoalWithTasks[];
  tasks?: SafeTaskWithAssignee[];
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  hasOverdueTasks?: boolean;
  overdueTaskCount?: number;
};

export type ProjectWithOwner = Project & {
  owner?: SafeUser;
  tasks?: SafeTaskWithAssignee[];
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  hasOverdueTasks?: boolean;
  overdueTaskCount?: number;
};

export type ActivityWithDetails = Activity & {
  user?: User;
  task?: Task;
};

export type SafeActivityWithDetails = Activity & {
  user?: SafeUser;
  task?: Task;
};
