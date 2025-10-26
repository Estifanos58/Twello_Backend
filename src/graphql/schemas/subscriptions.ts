export const subscriptionsSchema = `#graphql
  type Subscription {
    taskStatusUpdated(workspaceId: ID!): Task!
    notificationAdded(userId: ID!): Notification!
  }
`;
