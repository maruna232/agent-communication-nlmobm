import { Router } from 'express';
import {
  getBasicHealth,
  getDetailedHealth,
  getRedisHealth,
  getWebSocketHealth,
  getAuthHealth
} from '../controllers/health.controller';
import { logger } from '../utils/logging.utils';

/**
 * Creates and configures an Express router with health check endpoints
 * @returns Configured Express router with health check routes
 */
function createHealthRouter(): Router {
  // Create a new Express router instance
  const router = Router();
  
  logger.info('Initializing health check routes');
  
  // Basic health check endpoint
  router.get('/', getBasicHealth);
  
  // Detailed health check endpoint with system component status
  router.get('/detailed', getDetailedHealth);
  
  // Redis health check endpoint
  router.get('/redis', getRedisHealth);
  
  // WebSocket server health check endpoint
  router.get('/websocket', getWebSocketHealth);
  
  // Authentication service health check endpoint
  router.get('/auth', getAuthHealth);
  
  logger.debug('Health check routes registered successfully');
  
  return router;
}

// Export the configured router for use in the main application
export default createHealthRouter();