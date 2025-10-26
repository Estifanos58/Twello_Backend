import { authQueries } from './auth.js';
import { workspaceQueries } from './workspace.js';

export const queryResolvers = {
  Query: {
    health: () => 'OK',
    ...authQueries,
    ...workspaceQueries,
    // ...other queries (project, task, notification, etc.)
  },
};
