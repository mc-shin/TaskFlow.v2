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
  status: text("status").default("진행전"), // 진행전, 진행중, 완료
  labels: text("labels").array().default(sql`'{}'`), // Labels (최대 2개)
  ownerIds: text("owner_ids").array().default(sql`'{}'`), // Multiple owners
  createdBy: varchar("created_by").references(() => users.id),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  deadline: text("deadline"),
  status: text("status").default("진행전"), // 진행전, 진행중, 완료
  labels: text("labels").array().default(sql`'{}'`), // Labels (최대 2개)
  assigneeIds: text("assignee_ids").array().default(sql`'{}'`), // Multiple assignees
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("진행전"), // 진행전, 진행중, 완료
  priority: text("priority").default("중간"), // 높음, 중간, 낮음
  labels: text("labels").array().default(sql`'{}'`), // Labels (최대 2개)
  deadline: text("deadline"),
  duration: integer("duration").default(0),
  progress: integer("progress").default(0), // 진행도 (0-100)
  assigneeIds: text("assignee_ids").array().default(sql`'{}'`), // Multiple assignees
  goalId: varchar("goal_id").references(() => goals.id),
  projectId: varchar("project_id").references(() => projects.id), // Keep for backward compatibility
  createdBy: varchar("created_by").references(() => users.id),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
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

export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  entityType: text("entity_type").notNull(), // 'project' | 'goal' | 'task'
  entityId: varchar("entity_id").notNull(), // project/goal/task ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdBy: true,
  lastUpdatedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectWithValidationSchema = insertProjectSchema.refine((data) => {
  return !data.labels || data.labels.length <= 2;
}, {
  message: "프로젝트는 최대 2개의 라벨만 가질 수 있습니다.",
  path: ["labels"],
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdBy: true,
  lastUpdatedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoalWithValidationSchema = insertGoalSchema.refine((data) => {
  return !data.labels || data.labels.length <= 2;
}, {
  message: "목표는 최대 2개의 라벨만 가질 수 있습니다.",
  path: ["labels"],
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdBy: true,
  lastUpdatedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskWithValidationSchema = insertTaskSchema.refine((data) => {
  return !data.labels || data.labels.length <= 2;
}, {
  message: "작업은 최대 2개의 라벨만 가질 수 있습니다.",
  path: ["labels"],
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

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
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

export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

export type MeetingCommentWithAuthor = MeetingComment & {
  author: SafeUser;
};

export type MeetingWithDetails = Meeting & {
  attachments?: MeetingAttachment[];
  comments?: MeetingCommentWithAuthor[];
};

export type TaskWithAssignees = Task & {
  assignees?: User[];
};

export type SafeTaskWithAssignees = Task & {
  assignees?: SafeUser[];
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
  tasks?: SafeTaskWithAssignees[];
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  assignees?: SafeUser[];
};

export type ProjectWithDetails = Project & {
  owners?: SafeUser[];
  goals?: GoalWithTasks[];
  tasks?: SafeTaskWithAssignees[];
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  hasOverdueTasks?: boolean;
  overdueTaskCount?: number;
};

export type ProjectWithOwners = Project & {
  owners?: SafeUser[];
  tasks?: SafeTaskWithAssignees[];
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
