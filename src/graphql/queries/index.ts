
import { authQueries } from './auth.js';
import { workspaceQueries } from './workspace.js';
import { taskQueries } from './task.js';
import { notificationQueries } from './notification.js';
import { projectQueries } from './project.js';

export const queryResolvers = {
  Query: {
    health: () => 'OK',
    ...authQueries,
    ...workspaceQueries,
    ...taskQueries,
    ...notificationQueries,
    ...projectQueries,
  },
};
