import * as notificationService from '../../services/notificationService';

export const notificationQueries = {
  async getUserNotifications(_: any, { limit, offset }: { limit?: number; offset?: number }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    return await notificationService.getUserNotifications(user.id, limit, offset);
  },
  async getUnreadNotificationCount(_: any, __: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    return await notificationService.getUnreadNotificationCount(user.id);
  },
};
