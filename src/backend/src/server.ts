import http from 'http'; // Node.js built-in
import { createApp, initializeWebSocketServer } from './app';
import { config } from './config/config';
import { redisService } from './services/redis.service';
import { logger } from './utils/logging.utils';

/**
 * Initializes and starts the HTTP server with Express and WebSocket
 * @returns Promise resolving to the HTTP server instance
 */
async function startServer(): Promise<http.Server> {
  // LD1: Create Express application using createApp()
  const app = createApp();

  // LD1: Create HTTP server with the Express app
  const server = http.createServer(app);

  // LD1: Connect to Redis if configured
  if (config.redis.enabled) {
    try {
      await redisService.connect();
    } catch (error) {
      logger.error(`Failed to connect to Redis on startup: ${error.message}`, { error });
      // Consider whether to continue without Redis or exit
    }
  }

  // LD1: Initialize WebSocket server with the HTTP server
  try {
    await initializeWebSocketServer(server);
  } catch (error) {
    logger.error(`Failed to initialize WebSocket server: ${error.message}`, { error });
    // Consider whether to continue without WebSocket or exit
  }

  // LD1: Start listening on configured port and host
  return new Promise((resolve, reject) => {
    server.listen(config.server.port, config.server.host, () => {
      // LD1: Log server startup information
      logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
      resolve(server);
    });

    server.on('error', (err: Error) => {
      logger.error(`Server failed to start: ${err.message}`, { error: err });
      reject(err);
    });
  });
}

/**
 * Sets up event listeners for graceful server shutdown
 * @param server http.Server
 * 
 */
function setupGracefulShutdown(server: http.Server): void {
  // LD1: Register handler for process SIGTERM signal
  process.on('SIGTERM', () => {
    shutdownServer(server, 'SIGTERM signal received').catch(() => process.exit(1));
  });

  // LD1: Register handler for process SIGINT signal
  process.on('SIGINT', () => {
    shutdownServer(server, 'SIGINT signal received').catch(() => process.exit(1));
  });

  // LD1: Register handler for uncaught exceptions
  process.on('uncaughtException', (err: Error) => {
    logger.error(`Uncaught exception: ${err.message}`, { error: err });
    shutdownServer(server, `Uncaught exception: ${err.message}`).catch(() => process.exit(1));
  });

  // LD1: Register handler for unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error(`Unhandled promise rejection: ${reason}`, { promise });
    shutdownServer(server, `Unhandled promise rejection: ${reason}`).catch(() => process.exit(1));
  });
}

/**
 * Gracefully shuts down the server and all connections
 * @param server http.Server
 * @param reason string
 */
async function shutdownServer(server: http.Server, reason: string): Promise<void> {
  // LD1: Log shutdown initiation with reason
  logger.info(`Shutting down server: ${reason}`);

  // LD1: Disconnect from Redis if connected
  if (config.redis.enabled) {
    try {
      await redisService.disconnect();
    } catch (error) {
      logger.error(`Error disconnecting from Redis during shutdown: ${error.message}`, { error });
    }
  }

  // LD1: Close the HTTP server with a timeout
  return new Promise<void>((resolve, reject) => {
    const timeoutMs = 30000; // 30 seconds
    const timeout = setTimeout(() => {
      logger.error(`Server shutdown timeout after ${timeoutMs}ms`);
      reject(new Error('Server shutdown timeout'));
    }, timeoutMs);

    server.close((err?: Error) => {
      clearTimeout(timeout);
      if (err) {
        logger.error(`Error during server shutdown: ${err.message}`, { error: err });
        reject(err);
      } else {
        // LD1: Log successful shutdown
        logger.info('Server shutdown successfully');
        resolve();
      }
    });
  }).finally(() => {
    // LD1: Exit process with appropriate code
    process.exit(0);
  });
}

/**
 * Main function that starts the server and handles errors
 */
async function main(): Promise<void> {
  try {
    // LD1: Call startServer() to initialize and start the server
    const server = await startServer();

    // LD1: Set up graceful shutdown handlers
    setupGracefulShutdown(server);
  } catch (error) {
    // LD1: Catch and log any startup errors
    logger.error(`Server startup failed: ${error.message}`, { error });

    // LD1: Exit process with error code if startup fails
    process.exit(1);
  }
}

// Start the server
main();