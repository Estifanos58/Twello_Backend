export const queriesSchema = `#graphql
  type Query {
    # Health check
    health: String!

    # User queries
    me: User
    user(id: ID!): User

    # Workspace queries
    workspace(id: ID!): Workspace
    myWorkspaces: [Workspace!]!

    # Project queries
    project(id: ID!): Project
    projectsByWorkspace(workspaceId: ID!): [Project!]!

    # Task queries
    task(id: ID!): Task
    tasksByProject(projectId: ID!): [Task!]!
    myTasks: [Task!]!

    # Notification queries
    myNotifications(limit: Int, offset: Int): [Notification!]!
    unreadNotificationsCount: Int!
  }
`;
