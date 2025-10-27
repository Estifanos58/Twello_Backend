import * as projectService from '../../../services/projectService.js';
import * as authz from '../../../services/authorizationService.js';
import { GraphQLError } from 'graphql';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

export const projectQueries = {
  async getProject(_: any, { id }: { id: string }, context: Context) {
    const user = requireAuth(context);
    await authz.requireProjectAccess(user.id, id);
    return await projectService.getProjectById(id);
  },

  async getWorkspaceProjects(_: any, { workspaceId }: { workspaceId: string }, context: Context) {
    const user = requireAuth(context);
    const isMember = await authz.isWorkspaceMember(user.id, workspaceId);
    if (!isMember) {
      throw new GraphQLError('Forbidden: Not a workspace member', { extensions: { code: 'FORBIDDEN' } });
    }
    return await projectService.getWorkspaceProjects(workspaceId);
  },
};

export default projectQueries;
