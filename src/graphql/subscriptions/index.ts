import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

// Subscription event names
export const SUBSCRIPTION_EVENTS = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_DELETED: 'TASK_DELETED',
  NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
};

export const subscriptionResolvers = {
  Subscription: {
    taskCreated: {
      subscribe: (_: any, { projectId }: { projectId: string }) => {
        return pubsub.asyncIterator([`${SUBSCRIPTION_EVENTS.TASK_CREATED}_${projectId}`]);
      },
    },

    taskUpdated: {
      subscribe: (_: any, { projectId }: { projectId: string }) => {
        return pubsub.asyncIterator([`${SUBSCRIPTION_EVENTS.TASK_UPDATED}_${projectId}`]);
      },
    },

    taskDeleted: {
      subscribe: (_: any, { projectId }: { projectId: string }) => {
        return pubsub.asyncIterator([`${SUBSCRIPTION_EVENTS.TASK_DELETED}_${projectId}`]);
      },
    },

    notificationReceived: {
      subscribe: (_: any, __: any, context: any) => {
        if (!context.user) {
          throw new Error('Not authenticated');
        }
        return pubsub.asyncIterator([`${SUBSCRIPTION_EVENTS.NOTIFICATION_RECEIVED}_${context.user.id}`]);
      },
    },

    projectUpdated: {
      subscribe: (_: any, { workspaceId }: { workspaceId: string }) => {
        return pubsub.asyncIterator([`${SUBSCRIPTION_EVENTS.PROJECT_UPDATED}_${workspaceId}`]);
      },
    },
  },
};

// Export pubsub for publishing events
export { pubsub };
