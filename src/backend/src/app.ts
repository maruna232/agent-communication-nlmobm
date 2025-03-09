import express from 'express'; // version: ^4.18.0
import cors from 'cors'; // version: ^2.8.5
import helmet from 'helmet'; // version: ^7.0.0
import compression from 'compression'; // version: ^1.7.4
import http from 'http'; // Node.js built-in
import { config } from './config/config';
import createMainRouter from './routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { apiRateLimiter } from './middleware/rate-limiter.middleware';
import { websocketService } from './services/websocket.service';
import { logger } from './utils/logging.utils';

/**
 * Creates and configures the Express application with middleware and routes
 * @returns Configured Express application
 */
function createApp(): express.Application {
  // Create a new Express application instance
  const app = express();

  logger.info('Creating and configuring Express application');

  // Configure CORS middleware with settings from config
  const corsOptions = {
    origin: config.server.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Configure Helmet middleware for security headers
  app.use(helmet());

  // Configure compression middleware for response compression
  app.use(compression());

  // Configure JSON and URL-encoded body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply logging middleware for request/response logging
  app.use(loggingMiddleware);

  // Apply API rate limiting middleware for request throttling
  app.use(apiRateLimiter);

  // Mount the main router from createMainRouter()
  const mainRouter = createMainRouter();
  app.use('/', mainRouter);

  // Apply 404 not found middleware for undefined routes
  app.use(notFoundMiddleware);

  // Apply error handling middleware for centralized error handling
  app.use(errorMiddleware);

  logger.info('Express application configured successfully');

  // Return the configured Express application
  return app;
}

/**
 * Initializes the WebSocket server with the HTTP server
 * @param httpServer http.Server
 * @returns Promise resolving to true if initialization was successful
 */
async function initializeWebSocketServer(httpServer: http.Server): Promise<boolean> {
  logger.info('Initializing WebSocket server');

  // Call websocketService.initialize with the HTTP server and WebSocket config
  const result = await websocketService.initialize(httpServer);

  logger.info(`WebSocket server initialization ${result ? 'successful' : 'failed'}`);

  // Return the result of the initialization (boolean success indicator)
  return result;
}

export { createApp, initializeWebSocketServer };