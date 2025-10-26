import * as notificationService from '../../services/notificationService';

export const notificationMutations = {
  async markNotificationSeen(_: any, { notificationId }: { notificationId: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    return await notificationService.markNotificationAsSeen(notificationId, user.id);
  },
  async markAllNotificationsSeen(_: any, __: any, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await notificationService.markAllNotificationsAsSeen(user.id);
    return true;
  },
  async deleteNotification(_: any, { notificationId }: { notificationId: string }, context: any) {
    const user = context.user;
    if (!user) throw new Error('Authentication required');
    await notificationService.deleteNotification(notificationId, user.id);
    return true;
  },
};
