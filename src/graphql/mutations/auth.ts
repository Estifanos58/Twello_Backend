import { GraphQLError } from 'graphql';
import * as authService from '../../services/authService.js';

interface RegisterArgs {
  email: string;
  password: string;
  fullName?: string;
}

interface UpdatePasswordArgs {
  oldPassword: string;
  newPassword: string;
}

interface ForgotPasswordArgs {
  email: string;
}

interface ResetPasswordArgs {
  email: string;
  code: string;
  newPassword: string;
}

interface Context {
  user?: {
    id: string;
    role: string;
  };
  req: any;
}

/**
 * Require authentication
 */
function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

export const authMutations = {
  /**
   * Register a new user
   */
  async register(_: any, { email, password, fullName }: RegisterArgs) {
    return await authService.registerUser(email, password, fullName);
  },

  /**
   * Update user password
   */
  async updatePassword(_: any, { oldPassword, newPassword }: UpdatePasswordArgs, context: Context) {
    const user = requireAuth(context);
    await authService.updateUserPassword(user.id, oldPassword, newPassword);
    return true;
  },

  /**
   * Request password reset code
   */
  async forgotPassword(_: any, { email }: ForgotPasswordArgs, context: Context) {
    const code = await authService.generatePasswordResetCode(email);
    
    // In production, this would send an email
    // For development, return the code
    const isDev = process.env.NODE_ENV === 'development';
    
    return {
      message: 'Password reset code sent to email',
      resetCode: isDev ? code : null,
    };
  },

  /**
   * Reset password with code
   */
  async resetPassword(_: any, { email, code, newPassword }: ResetPasswordArgs, context: Context) {
    await authService.resetPasswordWithCode(email, code, newPassword);
    return true;
  },
};
