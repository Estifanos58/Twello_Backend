import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import * as userService from '../services/userService.js';
import * as workspaceService from '../services/workspaceService.js';
import * as projectService from '../services/projectService.js';
import * as taskService from '../services/taskService.js';
import * as notificationService from '../services/notificationService.js';
import * as authService from '../services/authService.js';
import * as authz from '../services/authorizationService.js';
import { getClientIp } from '../middleware/authMiddleware.js';
import { query } from '../db/pool.js';

export const pubsub = new PubSub();

// Subscription event names
export const TASK_STATUS_UPDATED = 'TASK_STATUS_UPDATED';
export const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';

interface Context {
  user?: {
    id: string;
    role: string;
  };
  req: any;
}

/**
 * Require authentication
 */
function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

export const resolvers = {
  DateTime: {
    __parseValue(value: any) {
      return new Date(value);
    },
    __serialize(value: any) {
      return value instanceof Date ? value.toISOString() : value;
    },
    __parseLiteral(ast: any) {
      if (ast.kind === 'StringValue') {
        return new Date(ast.value);
      }
      return null;
    },
  },

  Query: {
    // User queries
    async me(_: any, __: any, context: Context) {
      const user = requireAuth(context);
      return await userService.getUserById(user.id);
    },

    // Workspace queries
    async getWorkspace(_: any, { id }: { id: string }, context: Context) {
      const user = requireAuth(context);
      
      // Check if user is workspace member
      const isMember = await authz.isWorkspaceMember(user.id, id);
      if (!isMember) {
        throw new GraphQLError('Forbidden: Not a workspace member', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return await workspaceService.getWorkspaceById(id);
    },

    async getUserWorkspaces(_: any, __: any, context: Context) {
      const user = requireAuth(context);
      return await workspaceService.getUserWorkspaces(user.id);
    },

    async getAllWorkspaces(_: any, __: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireAdmin(user.id);
      return await workspaceService.getAllWorkspaces();
    },

    // Project queries
    async getProject(_: any, { id }: { id: string }, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectAccess(user.id, id);
      return await projectService.getProjectById(id);
    },

    async getWorkspaceProjects(_: any, { workspaceId }: { workspaceId: string }, context: Context) {
      const user = requireAuth(context);
      
      const isMember = await authz.isWorkspaceMember(user.id, workspaceId);
      if (!isMember) {
        throw new GraphQLError('Forbidden: Not a workspace member', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return await projectService.getWorkspaceProjects(workspaceId);
    },

    // Task queries
    async getTask(_: any, { id }: { id: string }, context: Context) {
      const user = requireAuth(context);
      
      const task = await taskService.getTaskById(id);
      if (!task) {
        throw new GraphQLError('Task not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await authz.requireProjectAccess(user.id, task.project_id);
      return task;
    },

    async getProjectTasks(_: any, { projectId }: { projectId: string }, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectAccess(user.id, projectId);
      return await taskService.getProjectTasks(projectId);
    },

    async getUserTasks(_: any, __: any, context: Context) {
      const user = requireAuth(context);
      return await taskService.getUserTasks(user.id);
    },

    // Notification queries
    async getUserNotifications(_: any, { limit, offset }: { limit?: number; offset?: number }, context: Context) {
      const user = requireAuth(context);
      return await notificationService.getUserNotifications(user.id, limit, offset);
    },

    async getUnreadNotificationCount(_: any, __: any, context: Context) {
      const user = requireAuth(context);
      return await notificationService.getUnreadNotificationCount(user.id);
    },

    // Device queries
    async getUserDevices(_: any, __: any, context: Context) {
      const user = requireAuth(context);
      return await authService.getUserDevices(user.id);
    },
  },

  Mutation: {
    // User mutations
    async register(_: any, { email, password, fullName }: any) {
      return await authService.registerUser(email, password, fullName);
    },

    async updatePassword(_: any, { oldPassword, newPassword }: any, context: Context) {
      const user = requireAuth(context);
      await userService.updateUserPassword(user.id, oldPassword, newPassword);
      return true;
    },

    async forgotPassword(_: any, { email }: { email: string }, context: Context) {
      const code = await authService.generatePasswordResetCode(email);
      
      // In production, this would send an email
      // For development, return the code
      const isDev = process.env.NODE_ENV === 'development';
      
      return {
        message: 'Password reset code sent to email',
        resetCode: isDev ? code : null,
      };
    },

    async resetPassword(_: any, { email, code, newPassword }: any, context: Context) {
      await authService.resetPasswordWithCode(email, code, newPassword);
      return true;
    },

    // Workspace mutations
    async createWorkspace(_: any, { name }: { name: string }, context: Context) {
      const user = requireAuth(context);
      return await workspaceService.createWorkspace(name, user.id);
    },

    async addWorkspaceMember(_: any, { workspaceId, userId, role }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireWorkspaceRole(user.id, workspaceId, ['OWNER']);
      await workspaceService.addWorkspaceMember(workspaceId, userId, role);
      return await workspaceService.getWorkspaceById(workspaceId);
    },

    async removeWorkspaceMember(_: any, { workspaceId, userId }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireWorkspaceRole(user.id, workspaceId, ['OWNER']);
      await workspaceService.removeWorkspaceMember(workspaceId, userId);
      return await workspaceService.getWorkspaceById(workspaceId);
    },

    async updateWorkspaceMemberRole(_: any, { workspaceId, userId, role }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireWorkspaceRole(user.id, workspaceId, ['OWNER']);
      await authz.validateWorkspaceOwnerChange(workspaceId, userId, role);
      await workspaceService.updateWorkspaceMemberRole(workspaceId, userId, role);
      return await workspaceService.getWorkspaceById(workspaceId);
    },

    async deleteWorkspace(_: any, { workspaceId }: { workspaceId: string }, context: Context) {
      const user = requireAuth(context);
      await authz.requireWorkspaceRole(user.id, workspaceId, ['OWNER']);
      await workspaceService.deleteWorkspace(workspaceId);
      return true;
    },

    // Project mutations
    async createProject(_: any, { workspaceId, name, description }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireWorkspaceRole(user.id, workspaceId, ['OWNER', 'MEMBER']);
      return await projectService.createProject(workspaceId, name, user.id, description);
    },

    async updateProject(_: any, { projectId, name, description }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectRole(user.id, projectId, ['LEAD']);
      return await projectService.updateProject(projectId, { name, description });
    },

    async deleteProject(_: any, { projectId }: { projectId: string }, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectRole(user.id, projectId, ['LEAD']);
      await projectService.deleteProject(projectId);
      return true;
    },

    async addProjectMember(_: any, { projectId, userId, role }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectRole(user.id, projectId, ['LEAD']);
      await projectService.addProjectMember(projectId, userId, role);
      return await projectService.getProjectById(projectId);
    },

    async removeProjectMember(_: any, { projectId, userId }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectRole(user.id, projectId, ['LEAD']);
      await projectService.removeProjectMember(projectId, userId);
      return await projectService.getProjectById(projectId);
    },

    async updateProjectMemberRole(_: any, { projectId, userId, role }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectRole(user.id, projectId, ['LEAD']);
      await projectService.updateProjectMemberRole(projectId, userId, role);
      return await projectService.getProjectById(projectId);
    },

    // Task mutations
    async createTask(_: any, { projectId, title, description, assigneeIds }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireProjectRole(user.id, projectId, ['LEAD', 'CONTRIBUTOR']);
      return await taskService.createTask(projectId, title, user.id, description, assigneeIds);
    },

    async updateTask(_: any, { taskId, title, description, status, assigneeIds }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireTaskModifyPermission(user.id, taskId);
      
      const updatedTask = await taskService.updateTask(taskId, user.id, {
        title,
        description,
        status,
        assigneeIds,
      });

      // Publish subscription event if status changed
      if (status) {
        const workspaceId = await authz.getWorkspaceIdFromTask(taskId);
        pubsub.publish(TASK_STATUS_UPDATED, {
          taskStatusUpdated: updatedTask,
          workspaceId,
        });
      }

      return updatedTask;
    },

    async deleteTask(_: any, { taskId }: { taskId: string }, context: Context) {
      const user = requireAuth(context);
      await authz.requireTaskModifyPermission(user.id, taskId);
      await taskService.deleteTask(taskId);
      return true;
    },

    // Notification mutations
    async markNotificationSeen(_: any, { notificationId }: { notificationId: string }, context: Context) {
      const user = requireAuth(context);
      return await notificationService.markNotificationAsSeen(notificationId, user.id);
    },

    async markAllNotificationsSeen(_: any, __: any, context: Context) {
      const user = requireAuth(context);
      await notificationService.markAllNotificationsAsSeen(user.id);
      return true;
    },

    // Device mutations
    async revokeDevice(_: any, { deviceId }: { deviceId: string }, context: Context) {
      const user = requireAuth(context);
      const ipAddress = getClientIp(context.req);
      await authService.revokeDevice(user.id, deviceId, ipAddress);
      return true;
    },

    // Admin mutations
    async adminBanUser(_: any, { userId }: { userId: string }, context: Context) {
      const user = requireAuth(context);
      await authz.requireAdmin(user.id);
      const ipAddress = getClientIp(context.req);
      await userService.banUser(user.id, userId, ipAddress);
      return true;
    },

    async adminUnbanUser(_: any, { userId }: { userId: string }, context: Context) {
      const user = requireAuth(context);
      await authz.requireAdmin(user.id);
      const ipAddress = getClientIp(context.req);
      await userService.unbanUser(user.id, userId, ipAddress);
      return true;
    },

    async adminResetPassword(_: any, { userId, newPassword }: any, context: Context) {
      const user = requireAuth(context);
      await authz.requireAdmin(user.id);
      const ipAddress = getClientIp(context.req);
      await userService.adminResetUserPassword(user.id, userId, newPassword, ipAddress);
      return true;
    },
  },

  Subscription: {
    taskStatusUpdated: {
      subscribe: async (_: any, { workspaceId }: { workspaceId: string }, context: Context) => {
        const user = requireAuth(context);
        
        // Verify user is workspace member
        const isMember = await authz.isWorkspaceMember(user.id, workspaceId);
        if (!isMember) {
          throw new GraphQLError('Forbidden: Not a workspace member', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        return pubsub.asyncIterator([TASK_STATUS_UPDATED]);
      },
    },

    notificationAdded: {
      subscribe: (_: any, { userId }: { userId: string }, context: Context) => {
        const user = requireAuth(context);
        
        // Users can only subscribe to their own notifications
        if (user.id !== userId) {
          throw new GraphQLError('Forbidden: Can only subscribe to own notifications', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        return pubsub.asyncIterator([NOTIFICATION_ADDED]);
      },
    },
  },

  // Field resolvers
  User: {
    fullName(parent: any) {
      return parent.full_name;
    },
    globalStatus(parent: any) {
      return parent.global_status;
    },
    createdAt(parent: any) {
      return parent.created_at;
    },
  },

  Workspace: {
    createdBy(parent: any) {
      return parent.created_by;
    },
    createdAt(parent: any) {
      return parent.created_at;
    },
    updatedAt(parent: any) {
      return parent.updated_at;
    },
    async members(parent: any) {
      // Get members for this workspace
      const membersResult = await query(
        `SELECT wm.*, u.email, u.full_name 
         FROM workspace_members wm
         JOIN users u ON u.id = wm.user_id
         WHERE wm.workspace_id = $1`,
        [parent.id]
      );

      return membersResult.rows.map((m: any) => ({
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role,
        added_at: m.added_at,
        user: {
          id: m.user_id,
          email: m.email,
          full_name: m.full_name,
        },
      }));
    },
    async projects(parent: any) {
      return await projectService.getWorkspaceProjects(parent.id);
    },
  },

  WorkspaceMember: {
    addedAt(parent: any) {
      return parent.added_at;
    },
  },

  Project: {
    workspaceId(parent: any) {
      return parent.workspace_id;
    },
    createdBy(parent: any) {
      return parent.created_by;
    },
    createdAt(parent: any) {
      return parent.created_at;
    },
    updatedAt(parent: any) {
      return parent.updated_at;
    },
    async members(parent: any) {
      // Get members for this project
      const membersResult = await query(
        `SELECT pm.*, u.email, u.full_name 
         FROM project_memberships pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1`,
        [parent.id]
      );

      return membersResult.rows.map((m: any) => ({
        project_id: m.project_id,
        user_id: m.user_id,
        role: m.role,
        added_at: m.added_at,
        user: {
          id: m.user_id,
          email: m.email,
          full_name: m.full_name,
        },
      }));
    },
    async workspace(parent: any) {
      return await workspaceService.getWorkspaceById(parent.workspace_id);
    },
    async tasks(parent: any) {
      return await taskService.getProjectTasks(parent.id);
    },
  },

  ProjectMembership: {
    addedAt(parent: any) {
      return parent.added_at;
    },
  },

  Task: {
    projectId(parent: any) {
      return parent.project_id;
    },
    createdBy(parent: any) {
      return parent.created_by;
    },
    createdAt(parent: any) {
      return parent.created_at;
    },
    updatedAt(parent: any) {
      return parent.updated_at;
    },
    async assignees(parent: any) {
      // Get assignees for this task
      const assigneesResult = await query(
        `SELECT u.id, u.email, u.full_name 
         FROM users u
         JOIN task_assignees ta ON ta.user_id = u.id
         WHERE ta.task_id = $1`,
        [parent.id]
      );

      return assigneesResult.rows;
    },
    async project(parent: any) {
      return await projectService.getProjectById(parent.project_id);
    },
  },

  Notification: {
    recipientId(parent: any) {
      return parent.recipient_id;
    },
    relatedEntityType(parent: any) {
      return parent.related_entity_type;
    },
    relatedEntityId(parent: any) {
      return parent.related_entity_id;
    },
    createdAt(parent: any) {
      return parent.created_at;
    },
    async recipient(parent: any) {
      return await userService.getUserById(parent.recipient_id);
    },
  },

  Device: {
    ipAddress(parent: any) {
      return parent.ip_address;
    },
    userAgent(parent: any) {
      return parent.user_agent;
    },
    loginTime(parent: any) {
      return parent.login_time;
    },
    lastUsed(parent: any) {
      return parent.last_used;
    },
    isRevoked(parent: any) {
      return parent.is_revoked;
    },
  },
};
