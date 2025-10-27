import authMutations from './auth.js';
import workspaceMutations from './workspace.js';
import projectMutations from './project.js';
import taskMutations from './task.js';
import notificationMutations from './notification.js';
import deviceMutations from './device.js';
import adminMutations from './admin.js';

export const Mutation = {
  ...authMutations,
  ...workspaceMutations,
  ...projectMutations,
  ...taskMutations,
  ...notificationMutations,
  ...deviceMutations,
  ...adminMutations,
};

export default Mutation;
