import * as projectService from '../../../services/projectService.js';
import * as authz from '../../../services/authorizationService.js';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) throw new Error('Authentication required');
  return context.user;
}

export const projectMutations = {
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
};

export default projectMutations;
