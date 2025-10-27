import { GraphQLError } from 'graphql';
import * as authService from '../../../services/authService.js';
import * as userService from '../../../services/userService.js';

interface Context {
  user?: {
    id: string;
    role: string;
  };
  req: any;
}

function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

export const authQueries = {
  async me(_: any, __: any, context: Context) {
    const user = requireAuth(context);
    return await userService.getUserById(user.id);
  },

  async getUserDevices(_: any, __: any, context: Context) {
    const user = requireAuth(context);
    return await authService.getUserDevices(user.id);
  },
};

export default authQueries;
