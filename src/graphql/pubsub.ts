import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

// Subscription event names
export const TASK_STATUS_UPDATED = 'TASK_STATUS_UPDATED';
export const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';

export default pubsub;
