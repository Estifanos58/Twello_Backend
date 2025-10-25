export const subscriptionsSchema = `#graphql
  type Subscription {
    # Task subscriptions
    taskCreated(projectId: ID!): Task!
    taskUpdated(projectId: ID!): Task!
    taskDeleted(projectId: ID!): ID!

    # Notification subscriptions
    notificationReceived: Notification!

    # Project subscriptions
    projectUpdated(workspaceId: ID!): Project!
  }
`;
