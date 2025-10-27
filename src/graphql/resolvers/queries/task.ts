import * as taskService from '../../../services/taskService.js';
import * as authz from '../../../services/authorizationService.js';
import { GraphQLError } from 'graphql';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

export const taskQueries = {
  async getTask(_: any, { id }: { id: string }, context: Context) {
    const user = requireAuth(context);
    const task = await taskService.getTaskById(id);
    if (!task) {
      throw new GraphQLError('Task not found', { extensions: { code: 'NOT_FOUND' } });
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
};

export default taskQueries;
