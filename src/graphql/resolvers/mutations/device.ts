import * as authService from '../../../services/authService.js';
import { getClientIp } from '../../../middleware/authMiddleware.js';

export const deviceMutations = {
  async revokeDevice(_: any, { deviceId }: { deviceId: string }, context: any) {
    if (!context.user) throw new Error('Authentication required');
    const ipAddress = getClientIp(context.req);
    await authService.revokeDevice(context.user.id, deviceId, ipAddress);
    return true;
  },
};

export default deviceMutations;
