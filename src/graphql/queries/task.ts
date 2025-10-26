import * as taskService from '../../services/taskService';
import * as authz from '../../services/authorizationService';

export const taskQueries = {
  async getTask(_: any, { id }: { id: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    const task = await taskService.getTaskById(id);
    if (!task) throw new Error('Task not found');
    await authz.requireProjectAccess(user.id, task.project_id);
    return task;
  },
  async getProjectTasks(_: any, { projectId }: { projectId: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectAccess(user.id, projectId);
    return await taskService.getProjectTasks(projectId);
  },
  async getUserTasks(_: any, __: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    return await taskService.getUserTasks(user.id);
  },
};
