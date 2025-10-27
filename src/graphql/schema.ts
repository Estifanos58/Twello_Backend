export const typeDefs = `#graphql
  scalar DateTime

  # Enums
  enum GlobalStatus {
    ACTIVE
    BANNED
  }

  enum WorkspaceRole {
    OWNER
    MEMBER
    VIEWER
  }

  enum ProjectRole {
    LEAD
    CONTRIBUTOR
    VIEWER
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
  }

  enum NotificationStatus {
    DELIVERED
    SEEN
  }

  # Types
  type User {
    id: ID!
    email: String!
    fullName: String
    role: String!
    globalStatus: GlobalStatus!
    createdAt: DateTime!
  }

  type Workspace {
    id: ID!
    name: String!
    createdBy: ID
    members: [WorkspaceMember!]!
    projects: [Project!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WorkspaceMember {
    user: User!
    role: WorkspaceRole!
    addedAt: DateTime!
  }

  type Project {
    id: ID!
    name: String!
    description: String
    workspaceId: ID!
    workspace: Workspace
    members: [ProjectMembership!]!
    tasks: [Task!]!
    createdBy: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectMembership {
    user: User!
    role: ProjectRole!
    addedAt: DateTime!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    projectId: ID!
    project: Project
    assignees: [User!]!
    createdBy: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Notification {
    id: ID!
    title: String!
    body: String
    status: NotificationStatus!
    recipientId: ID!
    recipient: User!
    relatedEntityId: ID
    relatedEntityType: String
    createdAt: DateTime!
  }

  type Device {
    id: ID!
    ipAddress: String
    userAgent: String
    loginTime: DateTime!
    lastUsed: DateTime!
    isRevoked: Boolean!
  }

  type ForgotPasswordResponse {
    message: String!
    resetCode: String
  }

  # Queries
  type Query {
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

  # Mutations
  type Mutation {
    # User mutations
    register(email: String!, password: String!, fullName: String): User!
    updatePassword(oldPassword: String!, newPassword: String!): Boolean!
    forgotPassword(email: String!): ForgotPasswordResponse!
    resetPassword(email: String!, code: String!, newPassword: String!): Boolean!

    # Workspace mutations
    createWorkspace(name: String!): Workspace!
    addWorkspaceMember(workspaceId: ID!, userId: ID!, role: WorkspaceRole!): Workspace!
    removeWorkspaceMember(workspaceId: ID!, userId: ID!): Workspace!
    updateWorkspaceMemberRole(workspaceId: ID!, userId: ID!, role: WorkspaceRole!): Workspace!
    deleteWorkspace(workspaceId: ID!): Boolean!

    # Project mutations
    createProject(workspaceId: ID!, name: String!, description: String): Project!
    updateProject(projectId: ID!, name: String, description: String): Project!
    deleteProject(projectId: ID!): Boolean!
    addProjectMember(projectId: ID!, userId: ID!, role: ProjectRole!): Project!
    removeProjectMember(projectId: ID!, userId: ID!): Project!
    updateProjectMemberRole(projectId: ID!, userId: ID!, role: ProjectRole!): Project!

    # Task mutations
    createTask(projectId: ID!, title: String!, description: String, assigneeIds: [ID!]): Task!
    updateTask(taskId: ID!, title: String, description: String, status: TaskStatus, assigneeIds: [ID!]): Task!
    deleteTask(taskId: ID!): Boolean!

    # Notification mutations
    markNotificationSeen(notificationId: ID!): Notification!
    markAllNotificationsSeen: Boolean!

    # Device mutations
    revokeDevice(deviceId: ID!): Boolean!

    # Admin mutations
    adminBanUser(userId: ID!): Boolean!
    adminUnbanUser(userId: ID!): Boolean!
    adminResetPassword(userId: ID!, newPassword: String!): Boolean!
  }

  # Subscriptions
  type Subscription {
    taskStatusUpdated(workspaceId: ID!): Task!
    notificationAdded(userId: ID!): Notification!
  }
`;
