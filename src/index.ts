import { createServer as createHttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createServer } from './server.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { verifyAccessToken } from './utils/jwt.js';
import { closePool } from './db/pool.js';
import config from './config/index.js';
import { log } from './services/loggingService.js';

/**
 * Main application entry point
 */
async function startServer() {
  // Create Express app
  const app = createServer();

  // Create HTTP server
  const httpServer = createHttpServer(app);

  // Create GraphQL schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Setup subscription handling with authentication
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // Authenticate WebSocket connection
        const authHeader = ctx.connectionParams?.authorization;
        const token =
          typeof authHeader === 'string'
            ? authHeader.replace('Bearer ', '')
            : undefined;
        
        if (!token) {
          return { user: null };
        }

        try {
          const payload = await verifyAccessToken(token);
          return {
            user: {
              id: payload.sub,
              role: payload.role,
            },
          };
        } catch (error) {
          console.error('WebSocket auth error:', error);
          return { user: null };
        }
      },
    },
    wsServer
  );

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      // Proper shutdown for the HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    formatError: (formattedError, error) => {
      // Don't leak internal errors in production
      if (config.env === 'production') {
        // Log the full error internally
        console.error('GraphQL Error:', error);

        // Return sanitized error to client
        return {
          message: formattedError.message,
          extensions: {
            code: formattedError.extensions?.code || 'INTERNAL_SERVER_ERROR',
          },
        };
      }

      return formattedError;
    },
  });

  await apolloServer.start();

  // Apply Apollo middleware to Express
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // Authenticate GraphQL request
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { user: null, req };
        }

        try {
          const token = authHeader.substring(7);
          const payload = await verifyAccessToken(token);

          return {
            user: {
              id: payload.sub,
              role: payload.role,
            },
            req,
          };
        } catch (error) {
          return { user: null, req };
        }
      },
    })
  );

  // Import error handlers after GraphQL middleware
  const { errorHandler, notFoundHandler } = await import('./middleware/errorHandler.js');

  // 404 handler - must come after all routes
  app.use(notFoundHandler);

  // Global error handler - must come last
  app.use(errorHandler);

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    log({
      level: 'info',
      action: 'SERVER_SHUTDOWN',
      details: { signal },
      category: 'SYSTEM_LOG',
    });

    // Close HTTP server
    httpServer.close(async () => {
      console.log('HTTP server closed');

      // Close database connections
      await closePool();
      console.log('Database connections closed');

      // Stop Apollo Server
      await apolloServer.stop();
      console.log('Apollo Server stopped');

      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start listening
  httpServer.listen(config.port, config.host, () => {
    console.log(`🚀 Server ready at http://${config.host}:${config.port}`);
    console.log(`📊 GraphQL endpoint: http://${config.host}:${config.port}/graphql`);
    console.log(`🔌 Subscriptions ready at ws://${config.host}:${config.port}/graphql`);
    console.log(`🏥 Health check: http://${config.host}:${config.port}/health`);
    console.log(`📝 Environment: ${config.env}`);

    log({
      level: 'info',
      action: 'SERVER_READY',
      details: {
        port: config.port,
        host: config.host,
        env: config.env,
      },
      category: 'SYSTEM_LOG',
    });
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
