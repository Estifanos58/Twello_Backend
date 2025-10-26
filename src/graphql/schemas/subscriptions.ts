export const subscriptionsSchema = `#graphql
  type Subscription {
    taskCreated(projectId: ID!): Task!
    taskUpdated(projectId: ID!): Task!
    taskDeleted(projectId: ID!): Task!
    notificationReceived: Notification!
    projectUpdated(workspaceId: ID!): Project!
  }
`;
