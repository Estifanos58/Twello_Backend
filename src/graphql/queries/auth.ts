import { GraphQLError } from 'graphql';
import * as authService from '../../services/authService.js';

interface Context {
  user?: { id: string; role: string };
}

export const authQueries = {
  me: async (_: any, __: any, context: Context) => {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    // You can expand this to fetch more user info if needed
    return context.user;
  },
  getUserDevices: async (_: any, __: any, context: Context) => {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return await authService.getUserDevices(context.user.id);
  },
};
