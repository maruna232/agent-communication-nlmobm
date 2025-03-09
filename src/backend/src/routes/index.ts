import { Router } from 'express';
import healthRouter from './health.routes';
import { router as authRouter } from './auth.routes';
import { logger } from '../utils/logging.utils';
import { 
  getWebSocketStats, 
  getConnectionStatus, 
  getConnectionDetails, 
  disconnectAgent, 
  sendMessage, 
  broadcastMessage 
} from '../controllers/websocket.controller';
import { firebaseAuthMiddleware } from '../middleware/firebase-auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { baseMessageSchema } from '../validators/message.validator';

/**
 * Creates and configures the main Express router that combines all route modules
 * @returns Configured Express router with all application routes
 */
function createMainRouter(): Router {
  // Create a new Express router instance
  const router = Router();
  
  logger.info('Initializing main router');
  
  // Mount health check routes
  router.use('/health', healthRouter);
  
  // Mount authentication routes
  router.use('/auth', authRouter);
  
  // Create and configure WebSocket routes
  const websocketRouter = createWebSocketRouter();
  
  // Mount WebSocket routes
  router.use('/websocket', websocketRouter);
  
  logger.info('Routes registered successfully');
  
  return router;
}

/**
 * Creates and configures the Express router for WebSocket-related endpoints
 * @returns Configured Express router with WebSocket routes
 */
function createWebSocketRouter(): Router {
  const router = Router();
  
  // Configure GET /stats endpoint for WebSocket statistics
  router.get('/stats', getWebSocketStats);
  
  // Configure GET /connection/:agentId endpoint for connection status
  router.get('/connection/:agentId', getConnectionStatus);
  
  // Configure GET /connection/:agentId/details endpoint for connection details
  router.get('/connection/:agentId/details', getConnectionDetails);
  
  // Configure DELETE /connection/:agentId endpoint for disconnecting agents
  router.delete('/connection/:agentId', firebaseAuthMiddleware, disconnectAgent);
  
  // Configure POST /message endpoint for sending messages with validation
  router.post('/message', sendMessage);
  
  // Configure POST /broadcast endpoint for broadcasting messages with validation
  router.post('/broadcast', broadcastMessage);
  
  return router;
}

export default createMainRouter;