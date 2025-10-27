import * as userService from '../../../services/userService.js';
import * as authz from '../../../services/authorizationService.js';
import { getClientIp } from '../../../middleware/authMiddleware.js';

export const adminMutations = {
  async adminBanUser(_: any, { userId }: { userId: string }, context: any) {
    if (!context.user) throw new Error('Authentication required');
    await authz.requireAdmin(context.user.id);
    const ipAddress = getClientIp(context.req);
    await userService.banUser(context.user.id, userId, ipAddress);
    return true;
  },

  async adminUnbanUser(_: any, { userId }: { userId: string }, context: any) {
    if (!context.user) throw new Error('Authentication required');
    await authz.requireAdmin(context.user.id);
    const ipAddress = getClientIp(context.req);
    await userService.unbanUser(context.user.id, userId, ipAddress);
    return true;
  },

  async adminResetPassword(_: any, { userId, newPassword }: any, context: any) {
    if (!context.user) throw new Error('Authentication required');
    await authz.requireAdmin(context.user.id);
    const ipAddress = getClientIp(context.req);
    await userService.adminResetUserPassword(context.user.id, userId, newPassword, ipAddress);
    return true;
  },
};

export default adminMutations;
