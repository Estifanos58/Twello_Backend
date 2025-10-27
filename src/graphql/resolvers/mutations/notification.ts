import * as notificationService from '../../../services/notificationService.js';

export const notificationMutations = {
  async markNotificationSeen(_: any, { notificationId }: { notificationId: string }, context: any) {
    if (!context.user) throw new Error('Authentication required');
    return await notificationService.markNotificationAsSeen(notificationId, context.user.id);
  },

  async markAllNotificationsSeen(_: any, __: any, context: any) {
    if (!context.user) throw new Error('Authentication required');
    await notificationService.markAllNotificationsAsSeen(context.user.id);
    return true;
  },
};

export default notificationMutations;
