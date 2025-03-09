import { v4 as uuidv4 } from 'uuid';

import { 
  StorageType,
  StorageEncryptionLevel,
  IStorageSchema,
  IStorageOptions,
  IStorageQuery,
  IStorageOperation,
  IStorageBackup,
  IStorageMetrics,
  IStorageActions
} from '../lib/types/storage.types';

import { 
  IndexedDBStorage,
  checkIndexedDBSupport
} from '../lib/storage/indexedDB';

import {
  SQLiteStorage,
  checkSQLiteSupport
} from '../lib/storage/sqliteStorage';

import {
  LocalStorageAdapter,
  isLocalStorageAvailable
} from '../lib/storage/localStorage';

import { createStorageError } from '../lib/utils/errorHandling';

import { EncryptionService } from './encryption.service';

// Default values for storage configuration
export const DEFAULT_STORAGE_TYPE = StorageType.INDEXED_DB;
export const DEFAULT_ENCRYPTION_LEVEL = StorageEncryptionLevel.STANDARD;
export const DEFAULT_DB_VERSION = 1;

// Database schema definition
export const DB_SCHEMA: IDBSchema = {
  users: {
    name: 'users',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'email', keyPath: 'email', unique: true, multiEntry: false }
    ]
  },
  agents: {
    name: 'agents',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'userId', keyPath: 'userId', unique: false, multiEntry: false }
    ]
  },
  conversations: {
    name: 'conversations',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'initiatorAgentId', keyPath: 'initiatorAgentId', unique: false, multiEntry: false },
      { name: 'recipientAgentId', keyPath: 'recipientAgentId', unique: false, multiEntry: false },
      { name: 'status', keyPath: 'status', unique: false, multiEntry: false }
    ]
  },
  messages: {
    name: 'messages',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'conversationId', keyPath: 'conversationId', unique: false, multiEntry: false },
      { name: 'timestamp', keyPath: 'timestamp', unique: false, multiEntry: false }
    ]
  },
  calendarEvents: {
    name: 'calendarEvents',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'userId', keyPath: 'userId', unique: false, multiEntry: false },
      { name: 'startTime', keyPath: 'startTime', unique: false, multiEntry: false },
      { name: 'endTime', keyPath: 'endTime', unique: false, multiEntry: false }
    ]
  },
  connections: {
    name: 'connections',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'userId', keyPath: 'userId', unique: false, multiEntry: false },
      { name: 'connectedAgentId', keyPath: 'connectedAgentId', unique: false, multiEntry: false }
    ]
  },
  preferences: {
    name: 'preferences',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'userId', keyPath: 'userId', unique: false, multiEntry: false },
      { name: 'category', keyPath: 'category', unique: false, multiEntry: false }
    ]
  }
};

/**
 * Detects the best available storage method based on browser capabilities
 * @returns Promise resolving to the best available storage type
 */
export async function detectBestStorageMethod(): Promise<StorageType> {
  // Check if IndexedDB is supported
  if (await checkIndexedDBSupport()) {
    return StorageType.INDEXED_DB;
  }
  
  // Check if SQLite is supported
  if (await checkSQLiteSupport()) {
    return StorageType.SQLITE;
  }
  
  // Check if localStorage is available
  if (isLocalStorageAvailable()) {
    return StorageType.LOCAL_STORAGE;
  }
  
  // If no storage method is available, throw an error
  throw new Error('No supported storage method available in this browser');
}

/**
 * Creates a wrapper around LocalStorageAdapter that implements the IStorageActions interface
 * @param options Storage options
 * @param schema Storage schema
 * @param encryptionKey Optional encryption key
 * @returns Promise resolving to a storage actions implementation
 */
async function createLocalStorageAdapter(
  options: IStorageOptions,
  schema: IStorageSchema,
  encryptionKey?: string
): Promise<IStorageActions> {
  const adapter = new LocalStorageAdapter();
  await adapter.initialize({
    encryptionLevel: options.encryptionLevel,
    version: options.version?.toString()
  }, encryptionKey);
  
  // Create a wrapper that implements IStorageActions interface
  const wrapper: IStorageActions = {
    initialize: async (schema: IStorageSchema, encryptionKey?: string) => {
      // Already initialized
      return true;
    },
    
    create: async (storeName: string, item: any) => {
      const id = item.id || uuidv4();
      item.id = id;
      await adapter.setItem(`${storeName}_${id}`, item, 
          options.encryptionLevel !== StorageEncryptionLevel.NONE);
      return item;
    },
    
    read: async (storeName: string, key: any) => {
      const result = await adapter.getItem(`${storeName}_${key}`, 
          options.encryptionLevel !== StorageEncryptionLevel.NONE, true);
      return result;
    },
    
    update: async (storeName: string, key: any, item: any) => {
      if (item.id !== key) {
        item.id = key;
      }
      await adapter.setItem(`${storeName}_${key}`, item, 
          options.encryptionLevel !== StorageEncryptionLevel.NONE);
      return item;
    },
    
    delete: async (storeName: string, key: any) => {
      await adapter.removeItem(`${storeName}_${key}`);
      return true;
    },
    
    query: async (query: IStorageQuery) => {
      const keys = await adapter.getAllKeys();
      const storeKeys = keys.filter(k => k.startsWith(`${query.storeName}_`));
      
      const results = [];
      for (const key of storeKeys) {
        const item = await adapter.getItem(key, 
            options.encryptionLevel !== StorageEncryptionLevel.NONE, true);
        
        if (item) {
          // Apply filter if provided
          if (!query.filter || query.filter(item)) {
            results.push(item);
          }
        }
      }
      
      // Apply limit and offset if provided
      let filteredResults = results;
      if (query.offset) {
        filteredResults = filteredResults.slice(query.offset);
      }
      if (query.limit) {
        filteredResults = filteredResults.slice(0, query.limit);
      }
      
      return filteredResults;
    },
    
    transaction: async (operations: IStorageOperation[]) => {
      const results = [];
      
      for (const op of operations) {
        let result;
        
        switch (op.type) {
          case 'create':
            result = await wrapper.create(op.storeName, op.value!);
            break;
          case 'read':
            result = await wrapper.read(op.storeName, op.key!);
            break;
          case 'update':
            result = await wrapper.update(op.storeName, op.key!, op.value!);
            break;
          case 'delete':
            result = await wrapper.delete(op.storeName, op.key!);
            break;
          case 'query':
            result = await wrapper.query(op.query!);
            break;
        }
        
        results.push(result);
      }
      
      return results;
    },
    
    backup: async (userId: string) => {
      const keys = await adapter.getAllKeys();
      const data: Record<string, any[]> = {};
      
      // Group items by store name
      for (const key of keys) {
        const parts = key.split('_');
        if (parts.length < 2) continue;
        
        const storeName = parts[0];
        
        if (!data[storeName]) {
          data[storeName] = [];
        }
        
        const item = await adapter.getItem(key, 
            options.encryptionLevel !== StorageEncryptionLevel.NONE, true);
        
        if (item) {
          data[storeName].push(item);
        }
      }
      
      return {
        id: uuidv4(),
        userId,
        timestamp: Date.now(),
        schemaVersion: options.version || 1,
        data
      };
    },
    
    restore: async (backup: IStorageBackup) => {
      // Clear existing data
      await adapter.clear();
      
      // Restore from backup
      for (const [storeName, items] of Object.entries(backup.data)) {
        for (const item of items) {
          const id = item.id;
          if (!id) continue;
          
          await adapter.setItem(`${storeName}_${id}`, item, 
              options.encryptionLevel !== StorageEncryptionLevel.NONE);
        }
      }
      
      return true;
    },
    
    getMetrics: async () => {
      return adapter.getMetrics();
    },
    
    clearAll: async () => {
      await adapter.clear();
      return true;
    }
  };
  
  return wrapper;
}

/**
 * Service that provides a unified interface for local data storage with encryption support
 */
export class StorageService {
  private storageType: StorageType;
  private encryptionLevel: StorageEncryptionLevel;
  private storageAdapter: IStorageActions | null;
  private schema: IStorageSchema | null;
  private initialized: boolean;
  private encryptionService: EncryptionService;

  /**
   * Creates a new StorageService instance
   * @param encryptionService Service used for encrypting stored data
   */
  constructor(encryptionService: EncryptionService) {
    this.storageType = DEFAULT_STORAGE_TYPE;
    this.encryptionLevel = DEFAULT_ENCRYPTION_LEVEL;
    this.storageAdapter = null;
    this.schema = null;
    this.initialized = false;
    this.encryptionService = encryptionService;
  }

  /**
   * Initializes the storage service with the specified options
   * @param options Storage configuration options
   * @param schema Database schema
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(options?: IStorageOptions, schema?: IStorageSchema): Promise<boolean> {
    try {
      // Set options if provided
      if (options) {
        this.storageType = options.storageType || this.storageType;
        this.encryptionLevel = options.encryptionLevel || this.encryptionLevel;
      }
      
      // If no storageType is specified, detect the best available method
      if (!this.storageType) {
        this.storageType = await detectBestStorageMethod();
      }
      
      // Store the schema
      this.schema = schema || DB_SCHEMA;
      
      // Check if encryption service is initialized
      let encryptionKey: string | undefined;
      if (this.encryptionService && this.encryptionService.isInitialized() && 
          this.encryptionLevel !== StorageEncryptionLevel.NONE) {
        // We don't have direct access to a key for encryption, but the storage adapters
        // can use the encryption service for encrypt/decrypt operations
      }
      
      // Create and initialize the appropriate storage adapter
      switch (this.storageType) {
        case StorageType.INDEXED_DB:
          const indexedDBAdapter = new IndexedDBStorage();
          await indexedDBAdapter.initialize(this.schema, encryptionKey);
          this.storageAdapter = indexedDBAdapter;
          break;
          
        case StorageType.SQLITE:
          const sqliteAdapter = new SQLiteStorage({
            storageType: this.storageType,
            encryptionLevel: this.encryptionLevel,
            version: options?.version || DEFAULT_DB_VERSION
          });
          await sqliteAdapter.initialize(this.schema, encryptionKey);
          this.storageAdapter = sqliteAdapter;
          break;
          
        case StorageType.LOCAL_STORAGE:
          this.storageAdapter = await createLocalStorageAdapter({
            storageType: this.storageType,
            encryptionLevel: this.encryptionLevel,
            version: options?.version || DEFAULT_DB_VERSION
          }, this.schema as IStorageSchema, encryptionKey);
          break;
          
        default:
          throw new Error(`Unsupported storage type: ${this.storageType}`);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Checks if the storage service is initialized
   * @returns True if the storage service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the current storage type
   * @returns The current storage type
   */
  getStorageType(): StorageType {
    return this.storageType;
  }

  /**
   * Gets the current encryption level
   * @returns The current encryption level
   */
  getEncryptionLevel(): StorageEncryptionLevel {
    return this.encryptionLevel;
  }

  /**
   * Creates a new item in the specified store
   * @param storeName The store to create the item in
   * @param item The item to create
   * @returns Promise resolving to the created item
   */
  async create(storeName: string, item: any): Promise<any> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { storeName, item }
      );
    }
    
    if (!storeName || !item) {
      throw createStorageError(
        'Store name and item are required',
        { storeName, item }
      );
    }
    
    // Generate an ID if none exists
    if (!item.id) {
      item.id = uuidv4();
    }
    
    return this.storageAdapter!.create(storeName, item);
  }

  /**
   * Retrieves an item from the specified store by its key
   * @param storeName The store to retrieve from
   * @param key The key of the item to retrieve
   * @returns Promise resolving to the retrieved item or null if not found
   */
  async read(storeName: string, key: any): Promise<any> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { storeName, key }
      );
    }
    
    if (!storeName || key === undefined) {
      throw createStorageError(
        'Store name and key are required',
        { storeName, key }
      );
    }
    
    return this.storageAdapter!.read(storeName, key);
  }

  /**
   * Updates an existing item in the specified store
   * @param storeName The store containing the item
   * @param key The key of the item to update
   * @param item The updated item
   * @returns Promise resolving to the updated item
   */
  async update(storeName: string, key: any, item: any): Promise<any> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { storeName, key, item }
      );
    }
    
    if (!storeName || key === undefined || !item) {
      throw createStorageError(
        'Store name, key, and item are required',
        { storeName, key, item }
      );
    }
    
    // Ensure the key is included in the item
    const keyPath = this.schema?.stores.find(s => s.name === storeName)?.keyPath || 'id';
    if (item[keyPath] !== key) {
      item[keyPath] = key;
    }
    
    return this.storageAdapter!.update(storeName, key, item);
  }

  /**
   * Deletes an item from the specified store by its key
   * @param storeName The store containing the item
   * @param key The key of the item to delete
   * @returns Promise resolving to true if the item was deleted
   */
  async delete(storeName: string, key: any): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { storeName, key }
      );
    }
    
    if (!storeName || key === undefined) {
      throw createStorageError(
        'Store name and key are required',
        { storeName, key }
      );
    }
    
    return this.storageAdapter!.delete(storeName, key);
  }

  /**
   * Queries items from a store based on the provided query parameters
   * @param query The query parameters
   * @returns Promise resolving to an array of matching items
   */
  async query(query: IStorageQuery): Promise<any[]> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { query }
      );
    }
    
    if (!query || !query.storeName) {
      throw createStorageError(
        'Query with store name is required',
        { query }
      );
    }
    
    return this.storageAdapter!.query(query);
  }

  /**
   * Executes multiple operations in a single transaction
   * @param operations The operations to perform
   * @returns Promise resolving to an array of operation results
   */
  async transaction(operations: IStorageOperation[]): Promise<any[]> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { operations }
      );
    }
    
    if (!operations || !operations.length) {
      throw createStorageError(
        'Operations are required',
        { operations }
      );
    }
    
    return this.storageAdapter!.transaction(operations);
  }

  /**
   * Creates a backup of all data in the database
   * @param userId The user identifier for the backup
   * @returns Promise resolving to the backup object
   */
  async backup(userId: string): Promise<IStorageBackup> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { userId }
      );
    }
    
    if (!userId) {
      throw createStorageError(
        'User ID is required',
        { userId }
      );
    }
    
    return this.storageAdapter!.backup(userId);
  }

  /**
   * Restores the database from a backup
   * @param backup The backup to restore from
   * @returns Promise resolving to true if the restore was successful
   */
  async restore(backup: IStorageBackup): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { backup }
      );
    }
    
    if (!backup || !backup.data || !backup.userId) {
      throw createStorageError(
        'Valid backup object is required',
        { backup }
      );
    }
    
    return this.storageAdapter!.restore(backup);
  }

  /**
   * Gets storage usage metrics for the database
   * @returns Promise resolving to the storage metrics
   */
  async getMetrics(): Promise<IStorageMetrics> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized'
      );
    }
    
    return this.storageAdapter!.getMetrics();
  }

  /**
   * Clears all data from all stores in the database
   * @returns Promise resolving to true if all stores were cleared
   */
  async clearAll(): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized'
      );
    }
    
    return this.storageAdapter!.clearAll();
  }

  /**
   * Changes the storage type and migrates existing data
   * @param newStorageType The new storage type to use
   * @returns Promise resolving to true if the change was successful
   */
  async changeStorageType(newStorageType: StorageType): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { newStorageType }
      );
    }
    
    // If the storage type is the same, no need to change
    if (newStorageType === this.storageType) {
      return true;
    }
    
    // Check if the new storage type is supported
    try {
      switch (newStorageType) {
        case StorageType.INDEXED_DB:
          if (!await checkIndexedDBSupport()) {
            throw new Error('IndexedDB is not supported in this environment');
          }
          break;
        case StorageType.SQLITE:
          if (!await checkSQLiteSupport()) {
            throw new Error('SQLite is not supported in this environment');
          }
          break;
        case StorageType.LOCAL_STORAGE:
          if (!isLocalStorageAvailable()) {
            throw new Error('localStorage is not available in this environment');
          }
          break;
        default:
          throw new Error(`Unsupported storage type: ${newStorageType}`);
      }
      
      // Backup current data
      const userId = 'migration-user'; // Temporary user ID for migration
      const backup = await this.backup(userId);
      
      // Create options for new storage type
      const options: IStorageOptions = {
        storageType: newStorageType,
        encryptionLevel: this.encryptionLevel,
        version: this.schema?.version || DEFAULT_DB_VERSION
      };
      
      // Remember old storage adapter in case we need to revert
      const oldAdapter = this.storageAdapter;
      const oldType = this.storageType;
      
      // Reset adapter and set new type
      this.storageAdapter = null;
      this.storageType = newStorageType;
      this.initialized = false;
      
      try {
        // Initialize new storage
        await this.initialize(options, this.schema!);
        
        // Restore data to new storage type
        await this.restore(backup);
        
        return true;
      } catch (error) {
        // Revert to old storage type if migration fails
        this.storageAdapter = oldAdapter;
        this.storageType = oldType;
        this.initialized = true;
        throw createStorageError(
          `Failed to change storage type: ${(error as Error).message}`,
          { newStorageType, error }
        );
      }
    } catch (error) {
      console.error(`Failed to change storage type to ${newStorageType}:`, error);
      throw createStorageError(
        `Failed to change storage type: ${(error as Error).message}`,
        { newStorageType, error }
      );
    }
  }

  /**
   * Exports all data as a JSON string
   * @param userId The user identifier for the export
   * @returns Promise resolving to the exported data as JSON
   */
  async exportData(userId: string): Promise<string> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { userId }
      );
    }
    
    const backup = await this.backup(userId);
    return JSON.stringify(backup);
  }

  /**
   * Imports data from a JSON string
   * @param jsonData The JSON string containing data to import
   * @returns Promise resolving to true if the import was successful
   */
  async importData(jsonData: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Storage service not initialized',
        { jsonDataLength: jsonData?.length }
      );
    }
    
    try {
      const backup = JSON.parse(jsonData) as IStorageBackup;
      return await this.restore(backup);
    } catch (error) {
      console.error('Failed to import data:', error);
      throw createStorageError(
        `Failed to import data: ${(error as Error).message}`,
        { error }
      );
    }
  }
}