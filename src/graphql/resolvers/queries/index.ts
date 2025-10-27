import authQueries from './auth.js';
import workspaceQueries from './workspace.js';
import projectQueries from './project.js';
import taskQueries from './task.js';
import notificationQueries from './notification.js';

export const Query = {
  ...authQueries,
  ...workspaceQueries,
  ...projectQueries,
  ...taskQueries,
  ...notificationQueries,
};

export default Query;
