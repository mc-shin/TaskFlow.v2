import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertTaskWithValidationSchema, insertActivitySchema, insertProjectSchema, insertProjectWithValidationSchema, insertGoalSchema, insertGoalWithValidationSchema, insertMeetingSchema, insertMeetingCommentSchema, insertMeetingAttachmentSchema, insertCommentSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskWithValidationSchema.parse(req.body);
      // Get first user as default creator if no session management
      const users = await storage.getAllUsers();
      const currentUser = users.length > 0 ? users[0].id : undefined;
      const task = await storage.createTask(taskData, currentUser);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      // For updates, use partial validation but check labels separately
      const taskData = insertTaskSchema.partial().parse(req.body);
      if (taskData.labels && taskData.labels.length > 2) {
        return res.status(400).json({ message: "작업은 최대 2개의 라벨만 가질 수 있습니다." });
      }
      // Get first user as default editor if no session management
      const users = await storage.getAllUsers();
      const currentUser = users.length > 0 ? users[0].id : undefined;
      const task = await storage.updateTask(req.params.id, taskData, currentUser);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.get("/api/tasks/status/:status", async (req, res) => {
    try {
      const tasks = await storage.getTasksByStatus(req.params.status);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks by status" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjectsWithDetails();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectWithValidationSchema.parse(req.body);
      // Get first user as default creator if no session management
      const users = await storage.getAllUsers();
      const currentUser = users.length > 0 ? users[0].id : undefined;
      const project = await storage.createProject(projectData, currentUser);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      // For updates, use partial validation but check labels separately
      const projectData = insertProjectSchema.partial().parse(req.body);
      if (projectData.labels && projectData.labels.length > 2) {
        return res.status(400).json({ message: "프로젝트는 최대 2개의 라벨만 가질 수 있습니다." });
      }
      // Get first user as default editor if no session management
      const users = await storage.getAllUsers();
      const currentUser = users.length > 0 ? users[0].id : undefined;
      const project = await storage.updateProject(req.params.id, projectData, currentUser);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByProject(req.params.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.get("/api/projects/:id/goals", async (req, res) => {
    try {
      const goals = await storage.getGoalsByProject(req.params.id);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project goals" });
    }
  });

  // Goal routes
  app.get("/api/goals", async (req, res) => {
    try {
      const goals = await storage.getAllGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.get("/api/goals/:id", async (req, res) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goal" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const goalData = insertGoalWithValidationSchema.parse(req.body);
      // Get first user as default creator if no session management
      const users = await storage.getAllUsers();
      const currentUser = users.length > 0 ? users[0].id : undefined;
      const goal = await storage.createGoal(goalData, currentUser);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      console.log(`[DEBUG] PUT /api/goals/${req.params.id} - Request body:`, JSON.stringify(req.body, null, 2));
      // For updates, use partial validation but check labels separately
      const goalData = insertGoalSchema.partial().parse(req.body);
      if (goalData.labels && goalData.labels.length > 2) {
        return res.status(400).json({ message: "목표는 최대 2개의 라벨만 가질 수 있습니다." });
      }
      // Get first user as default editor if no session management
      const users = await storage.getAllUsers();
      const currentUser = users.length > 0 ? users[0].id : undefined;
      const goal = await storage.updateGoal(req.params.id, goalData, currentUser);
      console.log(`[DEBUG] PUT /api/goals/${req.params.id} - Updated goal:`, JSON.stringify(goal, null, 2));
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      console.log(`[ERROR] PUT /api/goals/${req.params.id} - Error:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGoal(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("목표에 작업이 있어")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  app.get("/api/goals/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByGoal(req.params.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goal tasks" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllSafeUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/with-stats", async (req, res) => {
    try {
      const users = await storage.getAllUsersWithStats();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users with stats" });
    }
  });

  // username으로 사용자 조회 (초대 시스템용)
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // 비밀번호는 제외하고 반환
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user by username" });
    }
  });

  // email로 사용자 조회 (초대 시스템용)
  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // 비밀번호는 제외하고 반환
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user by email" });
    }
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    try {
      const activities = await storage.getAllActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Statistics routes
  app.get("/api/stats", async (req, res) => {
    try {
      const allTasks = await storage.getAllTasks();
      const stats = {
        total: allTasks.length,
        completed: allTasks.filter(t => t.status === "완료").length,
        진행전: allTasks.filter(t => t.status === "진행전").length,
        진행중: allTasks.filter(t => t.status === "진행중").length,
        완료: allTasks.filter(t => t.status === "완료").length,
        이슈: allTasks.filter(t => t.status === "이슈").length,
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Meeting routes
  app.get("/api/meetings", async (req, res) => {
    try {
      const { from, to } = req.query;
      const meetings = await storage.listMeetings({
        from: from as string | undefined,
        to: to as string | undefined
      });
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  app.get("/api/meetings/:id", async (req, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meeting" });
    }
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid meeting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create meeting" });
    }
  });

  app.patch("/api/meetings/:id", async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.partial().parse(req.body);
      const meeting = await storage.updateMeeting(req.params.id, meetingData);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid meeting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update meeting" });
    }
  });

  app.delete("/api/meetings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMeeting(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  app.post("/api/meetings/:id/attendees", async (req, res) => {
    try {
      const { userId } = z.object({ userId: z.string().min(1) }).parse(req.body);
      const meeting = await storage.addAttendee(req.params.id, userId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add attendee" });
    }
  });

  app.delete("/api/meetings/:id/attendees/:userId", async (req, res) => {
    try {
      const meeting = await storage.removeAttendee(req.params.id, req.params.userId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove attendee" });
    }
  });

  // Meeting Comments
  app.get("/api/meetings/:meetingId/comments", async (req, res) => {
    try {
      const comments = await storage.getMeetingComments(req.params.meetingId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/meetings/:meetingId/comments", async (req, res) => {
    try {
      // 입력 데이터 검증
      const commentInput = insertMeetingCommentSchema.omit({ meetingId: true }).parse(req.body);
      
      // 작성자 검증
      const author = await storage.getUser(commentInput.authorId);
      if (!author) {
        return res.status(400).json({ message: "Invalid author ID" });
      }
      
      // 미팅 존재 검증
      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const commentData = {
        ...commentInput,
        meetingId: req.params.meetingId
      };
      const comment = await storage.createMeetingComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/meetings/:meetingId/comments/:commentId", async (req, res) => {
    try {
      // 미팅 존재 검증
      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // 댓글 조회 및 소유권 검증
      const comments = await storage.getMeetingComments(req.params.meetingId);
      const comment = comments.find(c => c.id === req.params.commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // 미팅 ID 검증 (경로의 meetingId와 댓글의 meetingId가 일치하는지 확인)
      if (comment.meetingId !== req.params.meetingId) {
        return res.status(400).json({ message: "Comment does not belong to this meeting" });
      }
      
      // TODO: 실제 애플리케이션에서는 현재 로그인된 사용자 ID를 검증해야 함
      // 임시로 authorId를 요청 본문에서 받는다고 가정
      const requesterId = req.body?.requesterId;
      if (!requesterId || comment.authorId !== requesterId) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }
      
      const deleted = await storage.deleteMeetingComment(req.params.commentId);
      if (!deleted) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Meeting Attachments
  app.get("/api/meetings/:meetingId/attachments", async (req, res) => {
    try {
      const attachments = await storage.getMeetingAttachments(req.params.meetingId);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/meetings/:meetingId/attachments", async (req, res) => {
    try {
      const attachmentInput = insertMeetingAttachmentSchema.omit({ meetingId: true }).parse(req.body);
      
      // 업로드한 사용자 검증
      const uploader = await storage.getUser(attachmentInput.uploadedBy);
      if (!uploader) {
        return res.status(400).json({ message: "Invalid uploader ID" });
      }
      
      // 미팅 존재 검증
      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const attachmentData = {
        ...attachmentInput,
        meetingId: req.params.meetingId
      };
      const attachment = await storage.createMeetingAttachment(attachmentData);
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attachment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  app.delete("/api/meetings/:meetingId/attachments/:attachmentId", async (req, res) => {
    try {
      const deleted = await storage.deleteMeetingAttachment(req.params.attachmentId);
      if (!deleted) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // Object Storage 엔드포인트
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    
    // Extract object path from the upload URL for later downloads
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    
    res.json({ uploadURL, objectPath });
  });

  // Delete object
  app.delete("/api/objects/*", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path.replace('/api', ''));
      await objectFile.delete();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // General attachments API
  app.get("/api/attachments/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const attachments = await storage.getAttachments(entityType, entityId);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/attachments", async (req, res) => {
    try {
      if (!req.body.fileName || !req.body.filePath || !req.body.entityType || !req.body.entityId) {
        return res.status(400).json({ error: "fileName, filePath, entityType, and entityId are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.filePath);
      
      const attachment = await storage.createAttachment({
        fileName: req.body.fileName,
        filePath: objectPath,
        fileSize: req.body.fileSize || null,
        mimeType: req.body.mimeType || null,
        uploadedBy: "hyejin", // For now, using default user
        entityType: req.body.entityType,
        entityId: req.body.entityId
      });

      res.json(attachment);
    } catch (error) {
      console.error("Error creating attachment:", error);
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAttachment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  app.put("/api/meeting-attachments", async (req, res) => {
    if (!req.body.fileURL) {
      return res.status(400).json({ error: "fileURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.fileURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting file path:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Comment routes
  app.get("/api/comments", async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }
      const comments = await storage.getComments(entityType as string, entityId as string);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.put("/api/comments/:id", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Content is required and must be a string" });
      }
      const comment = await storage.updateComment(req.params.id, content);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteComment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
