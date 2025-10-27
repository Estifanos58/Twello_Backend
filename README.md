# Twello Backend

A modern, scalable collaborative project management backend built with cutting-edge technologies for enterprise-grade applications.

<img width="832" height="613" alt="image" src="https://github.com/user-attachments/assets/c8a5a9a9-0d81-4ef1-a74d-51ac44524b7d" />


## 🚀 Overview

Twello is a comprehensive backend solution for collaborative project management, featuring real-time capabilities, robust authentication, and a flexible role-based access control system. Built with performance and security in mind, it provides a solid foundation for building modern project management applications.

## ✨ Key Features

- **GraphQL API** with Apollo Server for efficient data fetching
- **Real-time Subscriptions** via WebSocket for live updates
- **JWT-based Authentication** with secure token management
- **PostgreSQL Database** with Neon serverless support
- **Role-based Access Control** (RBAC) for workspaces and projects
- **Comprehensive Audit Logging** with Winston and database storage
- **Rate Limiting** and security middleware
- **TypeScript** for type safety and developer experience
- **Bun Runtime** for exceptional performance

## 🏗️ Architecture

### Core Components

- **Authentication System**: JWT tokens with refresh token rotation
- **Workspace Management**: Multi-tenant workspaces with member roles
- **Project Management**: Projects within workspaces with granular permissions
- **Task Management**: Assignable tasks with status tracking
- **Notification System**: Real-time notifications for user activities
- **Device Management**: Session tracking and device revocation
- **Audit System**: Comprehensive logging for compliance and debugging

### Technology Stack

- **Runtime**: Bun v1.0+
- **Framework**: Express.js with TypeScript
- **API**: GraphQL with Apollo Server
- **Database**: PostgreSQL (Neon recommended)
- **Authentication**: JWT with jose library
- **Logging**: Winston with file rotation and database storage
- **Validation**: Zod schemas
- **Security**: Helmet, CORS, bcrypt, rate limiting

## 📁 Project Structure

```
Twello/
├── src/
│   ├── config/              # Application configuration
│   │   └── index.ts
│   ├── db/                  # Database connection and utilities
│   │   ├── pool.ts          # Connection pooling with Neon support
│   │   └── migrate.ts       # Database migration utilities
│   ├── graphql/             # GraphQL layer
│   │   ├── schemas/         # GraphQL type definitions
│   │   │   ├── index.ts     # Core types and enums
│   │   │   ├── queries.ts   # Query definitions
│   │   │   ├── mutations.ts # Mutation definitions
│   │   │   └── subscriptions.ts # Subscription definitions
│   │   ├── queries/         # Query resolvers
│   │   ├── mutations/       # Mutation resolvers
│   │   ├── subscriptions/   # Subscription resolvers
│   │   ├── resolvers/       # Field resolvers
│   │   └── schema.ts        # Schema composition
│   ├── middleware/          # Express middleware
│   │   ├── authMiddleware.ts # JWT authentication
│   │   └── errorHandler.ts  # Error handling
│   │   ├── routes/          # REST API routes
│   │   │   └── auth.ts      # Authentication endpoints
│   ├── services/            # Business logic services
│   │   ├── authorizationService.ts # RBAC logic
│   │   ├── projectService.ts # Project operations
│   │   ├── taskService.ts    # Task management
│   │   ├── notificationService.ts # Notification handling
│   │   ├── authService.ts    # Authentication logic
│   │   ├── userService.ts    # User management
│   │   ├── workspaceService.ts # Workspace operations
│   │   └── logger/           # Logging service
│   ├── utils/                # Utility functions
│   │   ├── jwt.ts            # JWT utilities
│   │   ├── password.ts       # Password hashing
│   │   └── validation.ts     # Input validation
│   ├── sql/                  # Database schemas and queries
│   │   ├── schema.sql        # Complete database schema
│   │   └── drop.sql          # Schema cleanup
│   ├── server.ts             # Express server configuration
│   └── index.ts              # Application entry point
├── logs/                     # Application logs (auto-generated)
├── .env                      # Environment variables
├── .env.example              # Environment template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites

- **Bun** (v1.0.0 or higher) - [Installation Guide](https://bun.sh)
- **PostgreSQL** database (Neon recommended for production)

### 1. Clone and Install

```bash
git clone <repository-url>
cd twello
bun install
```

### 2. Environment Configuration

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Configure the following essential variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/twello?sslmode=require

# JWT Security (Generate secure keys for production)
JWT_ACCESS_TOKEN_PRIVATE_KEY=your-256-bit-secret-key-here
JWT_REFRESH_TOKEN_PRIVATE_KEY=your-256-bit-secret-key-here

# Server Configuration
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Security Note**: Never use default JWT secrets in production. Generate cryptographically secure keys:

```bash
# Generate 256-bit (64-character) hex keys
openssl rand -hex 64
```

### 3. Database Setup

Run the database migrations to create the schema:

```bash
bun run migrate
```

### 4. Development Server

Start the development server with hot reload:

```bash
bun run dev
```

The server will be available at `http://localhost:4000`

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run start` | Start production server |
| `bun run migrate` | Execute database migrations |
| `bun run test` | Run test suite |
| `bun run test:unit` | Run unit tests only |
| `bun run test:e2e` | Run end-to-end tests |
| `bun run lint` | Lint code with ESLint |
| `bun run format` | Format code with Prettier |
| `bun run type-check` | Run TypeScript type checking |

## 🌐 API Endpoints

### GraphQL

- **GraphQL Playground**: `http://localhost:4000/graphql`
- **WebSocket Endpoint**: `ws://localhost:4000/graphql`

### REST API

- **Health Check**: `GET /health`
- **API Info**: `GET /`
- **Authentication**: `/api/auth/*`

## 🔐 Authentication

The API uses JWT-based authentication:

1. **Register/Login** - Get access and refresh tokens
2. **Include token** in requests: `Authorization: Bearer <access_token>`
3. **Refresh token** when access token expires

## 📊 GraphQL Schema

### Core Types

```graphql
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
  members: [WorkspaceMember!]!
  projects: [Project!]!
  createdAt: DateTime!
}

type Project {
  id: ID!
  name: String!
  description: String
  workspaceId: ID!
  members: [ProjectMembership!]!
  tasks: [Task!]!
  createdAt: DateTime!
}

type Task {
  id: ID!
  title: String!
  description: String
  status: TaskStatus!
  assignees: [User!]!
  createdAt: DateTime!
}
```

### Authentication

The API uses JWT-based authentication with the following flow:

1. **Registration/Login** via GraphQL mutations
2. **Token Storage** in HTTP-only cookies or Authorization header
3. **Automatic Refresh** of access tokens using refresh tokens

### Example Queries

```graphql
# Get current user profile
query {
  me {
    id
    email
    fullName
  }
}

# Fetch workspace with projects
query {
  getWorkspace(id: "workspace-uuid") {
    name
    projects {
      id
      name
      tasks {
        id
        title
        status
      }
    }
  }
}
```

### Example Mutations

```graphql
# Create a new workspace
mutation {
  createWorkspace(name: "My Team Workspace") {
    id
    name
    createdAt
  }
}

# Create and assign a task
mutation {
  createTask(
    projectId: "project-uuid"
    title: "Implement user authentication"
    description: "Add JWT-based auth system"
    assigneeIds: ["user-uuid"]
  ) {
    id
    title
    assignees {
      id
      fullName
    }
  }
}
```

### Real-time Subscriptions

```graphql
# Subscribe to task status updates
subscription {
  taskStatusUpdated(workspaceId: "workspace-uuid") {
    id
    title
    status
    updatedAt
  }
}

# Subscribe to notifications
subscription {
  notificationAdded(userId: "user-uuid") {
    id
    title
    body
    createdAt
  }
}
```

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with the following key tables:

- **users**: User accounts with roles and status
- **workspaces**: Multi-tenant workspace containers
- **workspace_members**: User roles within workspaces
- **projects**: Projects within workspaces
- **project_memberships**: Project-level permissions
- **tasks**: Work items with assignees and status
- **task_assignees**: Many-to-many task assignments
- **notifications**: User notifications
- **user_devices**: Session and device tracking
- **audit_logs**: Comprehensive activity logging

### Database Features

- **UUID Primary Keys** for scalability
- **Foreign Key Constraints** with cascading deletes
- **Indexes** on frequently queried columns
- **Triggers** for automatic timestamp updates
- **Row Level Security** considerations
- **Extensions**: uuid-ossp, pgcrypto

## 📝 Logging & Monitoring

Twello implements multi-transport logging:

- **Console Logging** for development
- **File Rotation** (daily with 14-day retention)
- **Database Storage** in audit_logs table
- **Log Levels**: info, warn, error, security
- **Categories**: USER_LOG, SYSTEM_LOG, ACTIVITY_TRACKER

## � Security Features

- **Helmet.js** for security headers
- **CORS** configuration with origin validation
- **Rate Limiting** (global and auth-specific)
- **JWT Encryption** with secure key management
- **Password Hashing** with bcrypt
- **Input Validation** with Zod schemas
- **SQL Injection Prevention** via parameterized queries
- **Audit Logging** for compliance

## � Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure JWT secrets
- [ ] Set up PostgreSQL database (Neon recommended)
- [ ] Configure CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting thresholds
- [ ] Set up log aggregation
- [ ] Configure monitoring and alerts

### Environment Variables

See `.env.example` for all available configuration options.

## 🧪 Testing

```bash
# Run all tests
bun run test

# Run unit tests only
bun run test:unit

# Run E2E tests
bun run test:e2e
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the GraphQL schema for API details

---

**Built with ❤️ using modern web technologies**
