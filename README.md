# Twello Backend

A modern, production-ready collaborative project management backend built with **Bun**, **Express**, **GraphQL**, and **PostgreSQL (Neon)**.

## 🚀 Features

- **GraphQL API** with Apollo Server
- **WebSocket Subscriptions** for real-time updates
- **JWT Authentication** with access and refresh tokens
- **PostgreSQL Database** with Neon serverless support
- **Custom Logger** with Winston (file rotation + database logging)
- **Rate Limiting** for API protection
- **TypeScript** for type safety
- **Bun Runtime** for blazing fast performance

## 📁 Project Structure

```
Twello/
├── src/
│   ├── config/           # Application configuration
│   │   └── index.ts
│   ├── db/              # Database connection and utilities
│   │   └── pool.ts
│   ├── graphql/         # GraphQL layer
│   │   ├── schemas/     # GraphQL schemas
│   │   │   ├── index.ts
│   │   │   ├── queries.ts
│   │   │   ├── mutations.ts
│   │   │   └── subscriptions.ts
│   │   ├── queries/     # Query resolvers
│   │   │   └── index.ts
│   │   ├── mutations/   # Mutation resolvers
│   │   │   └── index.ts
│   │   ├── subscriptions/ # Subscription resolvers
│   │   │   └── index.ts
│   │   ├── resolvers/   # Combined resolvers
│   │   │   └── index.ts
│   │   └── schema.ts    # Main schema export
│   ├── middleware/      # Express middleware
│   │   ├── authMiddleware.ts
│   │   └── errorHandler.ts
│   ├── services/        # Business logic services
│   │   └── logger/      # Custom logger
│   │       └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── validation.ts
│   ├── server.ts        # Express server setup
│   └── index.ts         # Application entry point
├── logs/                # Application logs (auto-generated)
├── .env                 # Environment variables (create from .env.example)
├── .env.example         # Environment variables template
├── .gitignore
├── .prettierrc
├── .eslintrc.json
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- **Bun** (v1.0.0 or higher) - [Install Bun](https://bun.sh)
- **PostgreSQL** (Neon recommended) - [Get Neon](https://neon.tech)

### 2. Install Dependencies

```bash
cd Twello
bun install
```

### 3. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database - Replace with your Neon connection string
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/twello?sslmode=require

# JWT Secrets - Generate secure keys for production
JWT_ACCESS_TOKEN_PRIVATE_KEY=your-super-secret-access-token-key
JWT_REFRESH_TOKEN_PRIVATE_KEY=your-super-secret-refresh-token-key

# Other settings (optional)
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Generate secure JWT secrets:**

```bash
# Linux/Mac
openssl rand -hex 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Run Database Migrations

```bash
bun run migrate
```

### 5. Start the Development Server

```bash
bun run dev
```

The server will start on `http://localhost:4000`

## 🔧 Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run migrate` - Run database migrations
- `bun run test` - Run all tests
- `bun run test:unit` - Run unit tests
- `bun run lint` - Lint code with ESLint
- `bun run format` - Format code with Prettier
- `bun run type-check` - Type check with TypeScript

## 🌐 API Endpoints

- **GraphQL Playground**: `http://localhost:4000/graphql`
- **WebSocket**: `ws://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/health`
- **API Info**: `http://localhost:4000/`

## 🔐 Authentication

The API uses JWT-based authentication:

1. **Register/Login** - Get access and refresh tokens
2. **Include token** in requests: `Authorization: Bearer <access_token>`
3. **Refresh token** when access token expires

## 📊 GraphQL Schema

The GraphQL schema is organized into separate files:

- **Types & Enums** (`schemas/index.ts`) - Core types
- **Queries** (`schemas/queries.ts`) - Read operations
- **Mutations** (`schemas/mutations.ts`) - Write operations
- **Subscriptions** (`schemas/subscriptions.ts`) - Real-time updates

### Example Query

```graphql
query {
  me {
    id
    email
    fullName
  }
  myWorkspaces {
    id
    name
    projects {
      id
      name
    }
  }
}
```

### Example Mutation

```graphql
mutation {
  createWorkspace(name: "My Workspace") {
    id
    name
    createdAt
  }
}
```

### Example Subscription

```graphql
subscription {
  taskCreated(projectId: "123") {
    id
    title
    status
  }
}
```

## 🗄️ Database

The application supports both:

- **Neon PostgreSQL** (serverless, recommended for production)
- **Standard PostgreSQL** (local development)

Connection is auto-detected based on the `DATABASE_URL`.

## 📝 Logging

Custom logger with multiple transports:

- **Console** (development only)
- **File** (daily rotation, 14 days retention)
- **Database** (audit_logs table)

Log levels: `info`, `warn`, `error`, `security`

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (global + auth-specific)
- JWT token encryption
- Password hashing with bcrypt
- Input validation with Zod

## 🚧 Next Steps

This is a boilerplate setup. You'll need to implement:

1. **Database schema** (create tables in Neon)
2. **Service layer** (business logic for workspaces, projects, tasks)
3. **Complete resolvers** (currently showing placeholder implementations)
4. **Tests** (unit and E2E tests)
5. **Authorization** (role-based access control)

## 📄 License

MIT
