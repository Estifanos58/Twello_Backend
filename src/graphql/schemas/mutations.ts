export const mutationsSchema = `#graphql
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
    deleteNotification(notificationId: ID!): Boolean!

    # Device mutations
    revokeDevice(deviceId: ID!): Boolean!

    # Admin mutations
    adminBanUser(userId: ID!): Boolean!
    adminUnbanUser(userId: ID!): Boolean!
    adminResetPassword(userId: ID!, newPassword: String!): Boolean!
  }
`;
