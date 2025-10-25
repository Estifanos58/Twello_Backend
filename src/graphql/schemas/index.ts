export const typeDefsSchema = `#graphql
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

  type AuthResponse {
    user: User!
    accessToken: String!
  }
`;
