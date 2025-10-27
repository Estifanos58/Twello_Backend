import * as taskService from '../../../services/taskService.js';
import * as authz from '../../../services/authorizationService.js';
import { GraphQLError } from 'graphql';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return context.user;
}

export const taskMutations = {
  async createTask(_: any, { projectId, title, description, assigneeIds }: any, context: Context) {
    const user = requireAuth(context);
    await authz.requireProjectRole(user.id, projectId, ['LEAD', 'CONTRIBUTOR']);
    return await taskService.createTask(projectId, title, user.id, description, assigneeIds);
  },

  async updateTask(_: any, { taskId, title, description, status, assigneeIds }: any, context: Context) {
    const user = requireAuth(context);
    await authz.requireTaskModifyPermission(user.id, taskId);
    return await taskService.updateTask(taskId, user.id, { title, description, status, assigneeIds });
  },

  async deleteTask(_: any, { taskId }: { taskId: string }, context: Context) {
    const user = requireAuth(context);
    await authz.requireTaskModifyPermission(user.id, taskId);
    await taskService.deleteTask(taskId);
    return true;
  },
};

export default taskMutations;
