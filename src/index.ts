import { createServer as createHttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createServer } from './server.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers/index.js';
import { verifyAccessToken } from './utils/jwt.js';
import { closePool, checkHealth } from './db/pool.js';
import config from './config/index.js';
import { log, logInfo, logError } from './services/logger/index.js';

/**
 * Main application entry point
 */
async function startServer() {
  try {
    // Check database connection
    logInfo('Checking database connection...');
    const dbHealthy = await checkHealth();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    logInfo('Database connection established');

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
            typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : undefined;

          if (!token) {
            return { user: null };
          }

          try {
            const payload = await verifyAccessToken(token);
            if (!payload) {
              return { user: null };
            }

            return {
              user: {
                id: payload.userId,
                email: payload.email,
                role: payload.role,
              },
            };
          } catch (error) {
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
        // Log errors
        logError('GraphQL error', {
          message: formattedError.message,
          code: formattedError.extensions?.code,
          path: formattedError.path,
        });

        // Return formatted error
        return formattedError;
      },
    });

    // Start Apollo Server
    await apolloServer.start();
    logInfo('Apollo Server started');

    // Apply Apollo middleware to Express
    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req }) => {
          // Extract token from request
          const authHeader = req.headers.authorization;
          const token = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : undefined;

          if (!token) {
            return { user: null, req };
          }

          try {
            const payload = await verifyAccessToken(token);
            if (!payload) {
              return { user: null, req };
            }

            return {
              user: {
                id: payload.userId,
                email: payload.email,
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

    // Start HTTP server
    httpServer.listen(config.port, config.host, () => {
      logInfo(`🚀 Server running on http://${config.host}:${config.port}`);
      logInfo(`📊 GraphQL endpoint: http://${config.host}:${config.port}/graphql`);
      logInfo(`🔌 WebSocket endpoint: ws://${config.host}:${config.port}/graphql`);
      logInfo(`Environment: ${config.env}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logInfo(`${signal} signal received: closing HTTP server`);
      
      httpServer.close(async () => {
        logInfo('HTTP server closed');
        await apolloServer.stop();
        logInfo('Apollo Server stopped');
        await closePool();
        logInfo('Database pool closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logError('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server
startServer();
