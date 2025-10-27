import { GraphQLError } from 'graphql';
import * as authz from '../../../services/authorizationService.js';
import { pubsub, TASK_STATUS_UPDATED } from '../../pubsub.js';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

export const taskSubscriptions = {
  taskStatusUpdated: {
    subscribe: async (_: any, { workspaceId }: { workspaceId: string }, context: Context) => {
      const user = requireAuth(context);
      const isMember = await authz.isWorkspaceMember(user.id, workspaceId);
      if (!isMember) {
        throw new GraphQLError('Forbidden: Not a workspace member', { extensions: { code: 'FORBIDDEN' } });
      }
      return pubsub.asyncIterator([TASK_STATUS_UPDATED]);
    },
  },
};

export default taskSubscriptions;
