import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import { redis as redisConfig } from '../config/config';
import { REDIS_CHANNELS } from '../config/constants';
import { SERVER_ERRORS } from '../config/error-messages';
import { logger } from '../utils/logging.utils';

/**
 * Service class that manages Redis connections and provides pub/sub functionality
 * for WebSocket scaling. This service enables horizontal scaling of the
 * WebSocket server by facilitating communication between different server instances.
 */
class RedisService {
  private publisher: Redis;
  private subscriber: Redis;
  private isConnected: boolean;
  private subscriptions: Map<string, Function[]>;

  /**
   * Initializes the Redis service with default values
   */
  constructor() {
    this.isConnected = false;
    this.subscriptions = new Map<string, Function[]>();
  }

  /**
   * Establishes connections to Redis for publishing and subscribing
   * @returns Promise resolving to true if connection is successful, false otherwise
   */
  async connect(): Promise<boolean> {
    // If Redis is not enabled in configuration, do not connect
    if (!redisConfig.enabled) {
      logger.info('Redis is disabled in configuration. Skipping connection.');
      return false;
    }

    try {
      // Create the publisher client
      this.publisher = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        retryStrategy: (times) => {
          return Math.min(times * 100, 3000); // Exponential backoff with max 3s
        }
      });

      // Create the subscriber client
      this.subscriber = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        retryStrategy: (times) => {
          return Math.min(times * 100, 3000); // Exponential backoff with max 3s
        }
      });

      // Set up error handlers
      this.publisher.on('error', (err) => {
        logger.error(`Redis publisher error: ${err.message}`, { error: err });
      });

      this.subscriber.on('error', (err) => {
        logger.error(`Redis subscriber error: ${err.message}`, { error: err });
      });

      // Set up connection handlers
      this.publisher.on('connect', () => {
        logger.info('Redis publisher connected');
      });

      this.subscriber.on('connect', () => {
        logger.info('Redis subscriber connected');
      });

      // Wait for both clients to be ready
      await Promise.all([
        new Promise<void>((resolve) => this.publisher.once('ready', () => resolve())),
        new Promise<void>((resolve) => this.subscriber.once('ready', () => resolve()))
      ]);

      this.isConnected = true;
      logger.info('Redis service connected successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to connect to Redis: ${error.message}`, { error });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Gracefully closes Redis connections
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      // Unsubscribe from all channels
      const channels = Array.from(this.subscriptions.keys());
      if (channels.length > 0) {
        await this.subscriber.unsubscribe(...channels);
      }

      // Close the connections
      await this.subscriber.quit();
      await this.publisher.quit();
      
      this.isConnected = false;
      logger.info('Redis service disconnected');
    } catch (error) {
      logger.error(`Error disconnecting from Redis: ${error.message}`, { error });
      // Force disconnect in case of error
      this.subscriber.disconnect();
      this.publisher.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Creates a Redis adapter for Socket.IO to enable scaling
   * @param io Socket.IO server instance
   * @returns Redis adapter for Socket.IO
   * @throws Error if Redis is not connected
   */
  createSocketIOAdapter(io: Server): any {
    if (!this.isConnected) {
      logger.error('Cannot create Socket.IO adapter: Redis is not connected');
      throw new Error(SERVER_ERRORS.REDIS_ERROR);
    }

    logger.info('Creating Socket.IO Redis adapter for horizontal scaling');
    return createAdapter(this.publisher, this.subscriber);
  }

  /**
   * Publishes a message to a Redis channel
   * @param channel Channel name to publish to
   * @param message Message to publish (will be stringified if object)
   * @returns Promise resolving to number of clients that received the message
   * @throws Error if Redis is not connected
   */
  async publish(channel: string, message: any): Promise<number> {
    if (!this.isConnected) {
      logger.error(`Cannot publish to channel ${channel}: Redis is not connected`);
      throw new Error(SERVER_ERRORS.REDIS_ERROR);
    }

    try {
      // Convert object messages to strings
      const messageString = typeof message === 'object' 
        ? JSON.stringify(message) 
        : message;
      
      const receiverCount = await this.publisher.publish(channel, messageString);
      logger.debug(`Published message to channel ${channel}`, { 
        channel, 
        receiversCount: receiverCount 
      });
      
      return receiverCount;
    } catch (error) {
      logger.error(`Error publishing to Redis channel ${channel}: ${error.message}`, {
        channel,
        error
      });
      throw error;
    }
  }

  /**
   * Subscribes to a Redis channel with a callback for messages
   * @param channel Channel name to subscribe to
   * @param callback Function to call when messages are received
   * @returns Promise resolving to true if subscription successful
   * @throws Error if Redis is not connected
   */
  async subscribe(channel: string, callback: Function): Promise<boolean> {
    if (!this.isConnected) {
      logger.error(`Cannot subscribe to channel ${channel}: Redis is not connected`);
      throw new Error(SERVER_ERRORS.REDIS_ERROR);
    }

    try {
      // Subscribe to the channel
      await this.subscriber.subscribe(channel);
      
      // Add callback to subscriptions map
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, []);
      }
      this.subscriptions.get(channel).push(callback);
      
      // Set up message handler if not already set
      if (this.subscriptions.get(channel).length === 1) {
        this.subscriber.on('message', (receivedChannel, message) => {
          if (receivedChannel === channel) {
            this.handleMessage(receivedChannel, message);
          }
        });
      }
      
      logger.info(`Subscribed to Redis channel: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Error subscribing to Redis channel ${channel}: ${error.message}`, {
        channel,
        error
      });
      throw error;
    }
  }

  /**
   * Unsubscribes from a Redis channel or specific callback
   * @param channel Channel name to unsubscribe from
   * @param callback Optional specific callback to remove
   * @returns Promise resolving to true if unsubscription successful
   */
  async unsubscribe(channel: string, callback?: Function): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn(`Cannot unsubscribe from channel ${channel}: Redis is not connected`);
      return false;
    }

    try {
      if (callback && this.subscriptions.has(channel)) {
        // Remove specific callback
        const callbacks = this.subscriptions.get(channel);
        const index = callbacks.indexOf(callback);
        
        if (index !== -1) {
          callbacks.splice(index, 1);
          logger.debug(`Removed callback from channel ${channel}`);
          
          // If no more callbacks, unsubscribe from the channel
          if (callbacks.length === 0) {
            await this.subscriber.unsubscribe(channel);
            this.subscriptions.delete(channel);
            logger.info(`Unsubscribed from Redis channel: ${channel}`);
          }
        }
      } else if (this.subscriptions.has(channel)) {
        // Unsubscribe from the entire channel
        await this.subscriber.unsubscribe(channel);
        this.subscriptions.delete(channel);
        logger.info(`Unsubscribed from Redis channel: ${channel}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error unsubscribing from Redis channel ${channel}: ${error.message}`, {
        channel,
        error
      });
      return false;
    }
  }

  /**
   * Checks if Redis is currently connected
   * @returns Boolean indicating connection status
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Gets the number of subscriptions for a channel or total
   * @param channel Optional channel name to get subscription count for
   * @returns Number of subscriptions
   */
  getSubscriptionCount(channel?: string): number {
    if (channel) {
      return this.subscriptions.has(channel) ? this.subscriptions.get(channel).length : 0;
    } else {
      let total = 0;
      this.subscriptions.forEach(callbacks => {
        total += callbacks.length;
      });
      return total;
    }
  }

  /**
   * Handles incoming messages from Redis subscriptions
   * @param channel Channel the message was received on
   * @param message Message content
   */
  private handleMessage(channel: string, message: string): void {
    // Try to parse JSON messages
    let parsedMessage: any = message;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      // Not JSON, use the original string
    }

    const callbacks = this.subscriptions.get(channel);
    if (!callbacks || callbacks.length === 0) {
      return;
    }

    // Execute all callbacks for this channel
    callbacks.forEach(callback => {
      try {
        callback(parsedMessage, channel);
      } catch (error) {
        logger.error(`Error in Redis subscription callback: ${error.message}`, {
          channel,
          error
        });
      }
    });

    logger.debug(`Received message from Redis channel: ${channel}`, {
      channel,
      messageLength: message.length
    });
  }
}

// Create a singleton instance
const redisService = new RedisService();

export { RedisService, redisService };