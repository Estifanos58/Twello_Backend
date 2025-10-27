import * as notificationService from '../../../services/notificationService.js';
import { GraphQLError } from 'graphql';

interface Context { user?: { id: string; role: string }; req: any }

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

export const notificationQueries = {
  async getUserNotifications(_: any, { limit, offset }: { limit?: number; offset?: number }, context: Context) {
    const user = requireAuth(context);
    return await notificationService.getUserNotifications(user.id, limit, offset);
  },

  async getUnreadNotificationCount(_: any, __: any, context: Context) {
    const user = requireAuth(context);
    return await notificationService.getUnreadNotificationCount(user.id);
  },
};

export default notificationQueries;
