import { GraphQLError } from 'graphql';
import * as workspaceService from '../../services/workspaceService.js';
import * as authz from '../../services/authorizationService.js';

interface Context {
  user?: { id: string; role: string };
}

export const workspaceQueries = {
  getWorkspace: async (_: any, { id }: { id: string }, context: Context) => {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const isMember = await authz.isWorkspaceMember(context.user.id, id);
    if (!isMember) {
      throw new GraphQLError('Forbidden: Not a workspace member', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    return await workspaceService.getWorkspaceById(id);
  },
  getUserWorkspaces: async (_: any, __: any, context: Context) => {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return await workspaceService.getUserWorkspaces(context.user.id);
  },
  getAllWorkspaces: async (_: any, __: any, context: Context) => {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    await authz.requireAdmin(context.user.id);
    return await workspaceService.getAllWorkspaces();
  },
};
