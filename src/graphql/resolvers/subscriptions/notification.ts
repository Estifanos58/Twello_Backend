import { GraphQLError } from 'graphql';
import { pubsub, NOTIFICATION_ADDED } from '../../pubsub.js';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

export const notificationSubscriptions = {
  notificationAdded: {
    subscribe: (_: any, { userId }: { userId: string }, context: Context) => {
      const user = requireAuth(context);
      if (user.id !== userId) {
        throw new GraphQLError('Forbidden: Can only subscribe to own notifications', { extensions: { code: 'FORBIDDEN' } });
      }
      return pubsub.asyncIterator([NOTIFICATION_ADDED]);
    },
  },
};

export default notificationSubscriptions;
