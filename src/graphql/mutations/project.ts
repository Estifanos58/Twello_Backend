import * as projectService from '../../services/projectService';
import * as authz from '../../services/authorizationService';

export const projectMutations = {
  async createProject(_: any, { workspaceId, name, description }: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireWorkspaceRole(user.id, workspaceId, ['OWNER', 'MEMBER']);
    return await projectService.createProject(workspaceId, name, user.id, description);
  },
  async updateProject(_: any, { projectId, name, description }: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectRole(user.id, projectId, ['LEAD']);
    return await projectService.updateProject(projectId, { name, description });
  },
  async deleteProject(_: any, { projectId }: { projectId: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectRole(user.id, projectId, ['LEAD']);
    await projectService.deleteProject(projectId);
    return true;
  },
  async addProjectMember(_: any, { projectId, userId, role }: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectRole(user.id, projectId, ['LEAD']);
    await projectService.addProjectMember(projectId, userId, role);
    return await projectService.getProjectById(projectId);
  },
  async removeProjectMember(_: any, { projectId, userId }: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectRole(user.id, projectId, ['LEAD']);
    await projectService.removeProjectMember(projectId, userId);
    return await projectService.getProjectById(projectId);
  },
  async updateProjectMemberRole(_: any, { projectId, userId, role }: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await authz.requireProjectRole(user.id, projectId, ['LEAD']);
    await projectService.updateProjectMemberRole(projectId, userId, role);
    return await projectService.getProjectById(projectId);
  },
};
