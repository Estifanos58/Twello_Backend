export const queriesSchema = `#graphql
  type Query {
    # Health check
    health: String!

    # User queries
    me: User

    # Workspace queries
    getWorkspace(id: ID!): Workspace
    getUserWorkspaces: [Workspace!]!
    getAllWorkspaces: [Workspace!]! # Admin only

    # Project queries
    getProject(id: ID!): Project
    getWorkspaceProjects(workspaceId: ID!): [Project!]!

    # Task queries
    getTask(id: ID!): Task
    getProjectTasks(projectId: ID!): [Task!]!
    getUserTasks: [Task!]!

    # Notification queries
    getUserNotifications(limit: Int, offset: Int): [Notification!]!
    getUnreadNotificationCount: Int!

    # Device queries
    getUserDevices: [Device!]!
  }
`;
