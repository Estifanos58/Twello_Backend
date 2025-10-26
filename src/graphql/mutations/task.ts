import * as taskService from '../../services/taskService';
import * as authz from '../../services/authorizationService';

export const taskMutations = {
  async createTask(_: any, { projectId, title, description, assigneeIds }: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectRole(user.id, projectId, ['LEAD', 'CONTRIBUTOR']);
    return await taskService.createTask(projectId, title, user.id, description, assigneeIds);
  },
  async updateTask(_: any, { taskId, title, description, status, assigneeIds }: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireTaskModifyPermission(user.id, taskId);
    return await taskService.updateTask(taskId, user.id, { title, description, status, assigneeIds });
  },
  async deleteTask(_: any, { taskId }: { taskId: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireTaskModifyPermission(user.id, taskId);
    await taskService.deleteTask(taskId);
    return true;
  },
};
