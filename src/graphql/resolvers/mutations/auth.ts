import * as authService from '../../../services/authService.js';
import * as userService from '../../../services/userService.js';

export const authMutations = {
  async register(_: any, { email, password, fullName }: any) {
    return await authService.registerUser(email, password, fullName);
  },

  async updatePassword(_: any, { oldPassword, newPassword }: any, context: any) {
    // keep this lightweight here; original checks happen in resolvers
    // context.user is expected to be validated by requireAuth in the original file
    if (!context.user) throw new Error('Authentication required');
    await userService.updateUserPassword(context.user.id, oldPassword, newPassword);
    return true;
  },

  async forgotPassword(_: any, { email }: { email: string }) {
    const code = await authService.generatePasswordResetCode(email);
    const isDev = process.env.NODE_ENV === 'development';
    return {
      message: 'Password reset code sent to email',
      resetCode: isDev ? code : null,
    };
  },

  async resetPassword(_: any, { email, code, newPassword }: any) {
    await authService.resetPasswordWithCode(email, code, newPassword);
    return true;
  },
};

export default authMutations;
