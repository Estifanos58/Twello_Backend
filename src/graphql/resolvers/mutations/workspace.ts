import * as workspaceService from '../../../services/workspaceService.js';
import * as authz from '../../../services/authorizationService.js';
import { GraphQLError } from 'graphql';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

export const workspaceMutations = {
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
};

export default workspaceMutations;
