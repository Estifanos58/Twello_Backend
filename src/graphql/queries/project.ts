import * as projectService from '../../services/projectService';
import * as authz from '../../services/authorizationService';

export const projectQueries = {
  async getProject(_: any, { id }: { id: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectAccess(user.id, id);
    return await projectService.getProjectById(id);
  },
  async getWorkspaceProjects(_: any, { workspaceId }: { workspaceId: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    const isMember = await authz.isWorkspaceMember(user.id, workspaceId);
    if (!isMember) throw new Error('Forbidden: Not a workspace member');
    return await projectService.getWorkspaceProjects(workspaceId);
  },
};
