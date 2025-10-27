import { GraphQLError } from 'graphql';
import * as workspaceService from '../../../services/workspaceService.js';
import * as authz from '../../../services/authorizationService.js';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

export const workspaceQueries = {
  async getWorkspace(_: any, { id }: { id: string }, context: Context) {
    const user = requireAuth(context);
    const isMember = await authz.isWorkspaceMember(user.id, id);
    if (!isMember) {
      throw new GraphQLError('Forbidden: Not a workspace member', { extensions: { code: 'FORBIDDEN' } });
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
};

export default workspaceQueries;
