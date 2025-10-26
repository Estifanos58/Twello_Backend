
import { authMutations } from './auth.js';
import { workspaceMutations } from './workspace.js';
import { taskMutations } from './task.js';
import { notificationMutations } from './notification.js';

import { projectMutations } from './project.js';
import { GraphQLError } from 'graphql';


interface Context {
  user?: any;
  req?: any;
  res?: any;
}

export const mutationResolvers = {
  Mutation: {
    ...authMutations,
    ...workspaceMutations,
    ...taskMutations,
    ...notificationMutations,
    ...projectMutations,
    // ...other mutations (project, etc.)
  },
};

