import { GraphQLError } from 'graphql';
import * as userService from '../services/userService.js';
import * as workspaceService from '../services/workspaceService.js';
import * as projectService from '../services/projectService.js';
import * as taskService from '../services/taskService.js';
import * as notificationService from '../services/notificationService.js';
import * as authService from '../services/authService.js';
import * as authz from '../services/authorizationService.js';
import { getClientIp } from '../middleware/authMiddleware.js';
import { query } from '../db/pool.js';

// grouped resolvers created under src/graphql/resolvers
import Query from './resolvers/queries/index.js';
import Mutation from './resolvers/mutations/index.js';
import Subscription from './resolvers/subscriptions/index.js';

// shared pubsub and event names so publishers and subscribers use same instance
import { pubsub, TASK_STATUS_UPDATED, NOTIFICATION_ADDED } from './pubsub.js';

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

  Query: Query,
  Mutation: Mutation,
  Subscription: Subscription,

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
