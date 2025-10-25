export const mutationsSchema = `#graphql
  type Mutation {
    # Authentication
    register(email: String!, password: String!, fullName: String): AuthResponse!
    login(email: String!, password: String!): AuthResponse!
    logout: Boolean!
    refreshToken: AuthResponse!

    # Workspace mutations
    createWorkspace(name: String!): Workspace!
    updateWorkspace(id: ID!, name: String!): Workspace!
    deleteWorkspace(id: ID!): Boolean!
    addWorkspaceMember(workspaceId: ID!, userId: ID!, role: WorkspaceRole!): Boolean!
    removeWorkspaceMember(workspaceId: ID!, userId: ID!): Boolean!
    updateWorkspaceMemberRole(workspaceId: ID!, userId: ID!, role: WorkspaceRole!): Boolean!

    # Project mutations
    createProject(workspaceId: ID!, name: String!, description: String): Project!
    updateProject(id: ID!, name: String, description: String): Project!
    deleteProject(id: ID!): Boolean!
    addProjectMember(projectId: ID!, userId: ID!, role: ProjectRole!): Boolean!
    removeProjectMember(projectId: ID!, userId: ID!): Boolean!
    updateProjectMemberRole(projectId: ID!, userId: ID!, role: ProjectRole!): Boolean!

    # Task mutations
    createTask(projectId: ID!, title: String!, description: String, status: TaskStatus): Task!
    updateTask(id: ID!, title: String, description: String, status: TaskStatus): Task!
    deleteTask(id: ID!): Boolean!
    assignTask(taskId: ID!, userId: ID!): Boolean!
    unassignTask(taskId: ID!, userId: ID!): Boolean!

    # Notification mutations
    markNotificationAsRead(id: ID!): Boolean!
    markAllNotificationsAsRead: Boolean!
    deleteNotification(id: ID!): Boolean!
  }
`;
