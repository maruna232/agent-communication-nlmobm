/**
 * @file storage.types.ts
 * 
 * This file defines TypeScript interfaces and types for the storage system
 * in the AI Agent Network. These types support the local-first architecture
 * by providing structures for IndexedDB, SQLite, and localStorage implementations,
 * ensuring user data remains on the client device with appropriate encryption
 * for privacy.
 */

/**
 * Defines the available storage mechanisms for the application
 */
export enum StorageType {
  INDEXED_DB = 'indexeddb',
  LOCAL_STORAGE = 'localstorage',
  SQLITE = 'sqlite'
}

/**
 * Defines the encryption levels for stored data
 */
export enum StorageEncryptionLevel {
  NONE = 'none',           // No encryption
  STANDARD = 'standard',   // AES-256-GCM with user-derived key
  HIGH = 'high'            // AES-256-GCM with hardware-backed key when available
}

/**
 * Defines the types of operations that can be performed on storage
 */
export enum StorageOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  QUERY = 'query'
}

/**
 * Defines error codes for storage operations
 */
export enum StorageErrorCode {
  NOT_FOUND = 'not_found',
  ALREADY_EXISTS = 'already_exists',
  QUOTA_EXCEEDED = 'quota_exceeded',
  INVALID_OPERATION = 'invalid_operation',
  SCHEMA_ERROR = 'schema_error'
}

/**
 * Defines configuration options for storage initialization
 */
export interface IStorageOptions {
  /** The type of storage to use */
  storageType: StorageType;
  
  /** The level of encryption to apply to stored data */
  encryptionLevel: StorageEncryptionLevel;
  
  /** The schema version */
  version: number;
}

/**
 * Defines the database schema structure
 */
export interface IStorageSchema {
  /** The name of the database */
  name: string;
  
  /** The version of the schema */
  version: number;
  
  /** The object stores/tables in the database */
  stores: IStoreSchema[];
}

/**
 * Defines the structure of object stores/tables in the database
 */
export interface IStoreSchema {
  /** The name of the store/table */
  name: string;
  
  /** The key path for the store (primary key) */
  keyPath: string;
  
  /** Whether the key should auto increment */
  autoIncrement: boolean;
  
  /** The indexes for efficient querying */
  indexes: IStoreIndex[];
}

/**
 * Defines indexes for efficient querying of object stores/tables
 */
export interface IStoreIndex {
  /** The name of the index */
  name: string;
  
  /** The key path for the index */
  keyPath: string | string[];
  
  /** Whether the index values must be unique */
  unique: boolean;
  
  /** For array-valued keys, whether to create an entry for each array element */
  multiEntry: boolean;
}

/**
 * Defines a key range for querying data
 */
export interface IKeyRange {
  /** Lower bound of the range */
  lower?: any;
  
  /** Upper bound of the range */
  upper?: any;
  
  /** Whether the lower bound should be excluded */
  lowerOpen?: boolean;
  
  /** Whether the upper bound should be excluded */
  upperOpen?: boolean;
}

/**
 * Defines query parameters for retrieving data
 */
export interface IStorageQuery {
  /** The name of the store to query */
  storeName: string;
  
  /** The name of the index to use (optional) */
  indexName?: string;
  
  /** The key range to query */
  range?: IKeyRange;
  
  /** The direction to traverse results */
  direction?: IDBCursorDirection;
  
  /** Maximum number of results to return */
  limit?: number;
  
  /** Number of results to skip */
  offset?: number;
  
  /** Function to filter results */
  filter?: (item: any) => boolean;
}

/**
 * Defines operations for transactions
 */
export interface IStorageOperation {
  /** The type of operation */
  type: StorageOperation;
  
  /** The store to operate on */
  storeName: string;
  
  /** The key to operate on (for read, update, delete) */
  key?: any;
  
  /** The value to store (for create, update) */
  value?: any;
  
  /** The query parameters (for query) */
  query?: IStorageQuery;
}

/**
 * Defines database migration structure
 */
export interface IStorageMigration {
  /** The version to migrate from */
  fromVersion: number;
  
  /** The version to migrate to */
  toVersion: number;
  
  /** The function to perform the migration */
  migrationFunction: (transaction: any) => Promise<boolean>;
}

/**
 * Defines backup data structure for export/import
 */
export interface IStorageBackup {
  /** Unique identifier for the backup */
  id: string;
  
  /** The user who owns the data */
  userId: string;
  
  /** When the backup was created */
  timestamp: number;
  
  /** The schema version of the backup */
  schemaVersion: number;
  
  /** The actual data, organized by store name */
  data: Record<string, any[]>;
}

/**
 * Defines metrics for a specific store
 */
export interface IStoreMetrics {
  /** Number of items in the store */
  count: number;
  
  /** Approximate size in bytes */
  size: number;
  
  /** Average item size in bytes */
  avgItemSize: number;
}

/**
 * Defines storage usage metrics
 */
export interface IStorageMetrics {
  /** Total size of all stores in bytes */
  totalSize: number;
  
  /** Metrics for each store */
  storeMetrics: Record<string, IStoreMetrics>;
  
  /** When the metrics were last updated */
  lastUpdated: number;
}

/**
 * Defines standardized storage error structure
 */
export interface IStorageError {
  /** Error code */
  code: StorageErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional error details */
  details?: any;
}

/**
 * Defines the actions available for storage operations
 */
export interface IStorageActions {
  /**
   * Initialize the storage with schema and optional encryption key
   * @param schema The database schema
   * @param encryptionKey Optional encryption key
   * @returns Promise resolving to success status
   */
  initialize: (schema: IStorageSchema, encryptionKey?: string) => Promise<boolean>;
  
  /**
   * Create a new item in a store
   * @param storeName The store name
   * @param item The item to create
   * @returns Promise resolving to the created item (with generated ID if applicable)
   */
  create: (storeName: string, item: any) => Promise<any>;
  
  /**
   * Read an item from a store by key
   * @param storeName The store name
   * @param key The key to look up
   * @returns Promise resolving to the item or undefined if not found
   */
  read: (storeName: string, key: any) => Promise<any>;
  
  /**
   * Update an existing item in a store
   * @param storeName The store name
   * @param key The key of the item to update
   * @param item The updated item
   * @returns Promise resolving to the updated item
   */
  update: (storeName: string, key: any, item: any) => Promise<any>;
  
  /**
   * Delete an item from a store by key
   * @param storeName The store name
   * @param key The key of the item to delete
   * @returns Promise resolving to success status
   */
  delete: (storeName: string, key: any) => Promise<boolean>;
  
  /**
   * Query items from a store with filtering
   * @param query The query parameters
   * @returns Promise resolving to an array of matching items
   */
  query: (query: IStorageQuery) => Promise<any[]>;
  
  /**
   * Execute multiple operations in a single transaction
   * @param operations The operations to perform
   * @returns Promise resolving to an array of results for each operation
   */
  transaction: (operations: IStorageOperation[]) => Promise<any[]>;
  
  /**
   * Create a backup of all stored data
   * @param userId The user identifier for the backup
   * @returns Promise resolving to the backup object
   */
  backup: (userId: string) => Promise<IStorageBackup>;
  
  /**
   * Restore data from a backup
   * @param backup The backup to restore from
   * @returns Promise resolving to success status
   */
  restore: (backup: IStorageBackup) => Promise<boolean>;
  
  /**
   * Get storage usage metrics
   * @returns Promise resolving to storage metrics
   */
  getMetrics: () => Promise<IStorageMetrics>;
  
  /**
   * Clear all stored data
   * @returns Promise resolving to success status
   */
  clearAll: () => Promise<boolean>;
}

/**
 * Defines the state of the storage service
 */
export interface IStorageState {
  /** Whether the storage has been initialized */
  initialized: boolean;
  
  /** The type of storage in use */
  storageType: StorageType;
  
  /** The encryption level in use */
  encryptionLevel: StorageEncryptionLevel;
  
  /** The current schema version */
  version: number;
  
  /** Current storage metrics */
  metrics: IStorageMetrics;
  
  /** Current error state, if any */
  error: IStorageError | null;
}

/**
 * Defines the application-specific database schema
 */
export interface IDBSchema {
  /** User profiles */
  users: IStoreSchema;
  
  /** Agent configurations */
  agents: IStoreSchema;
  
  /** Conversation records */
  conversations: IStoreSchema;
  
  /** Individual messages */
  messages: IStoreSchema;
  
  /** Calendar events */
  calendarEvents: IStoreSchema;
  
  /** Agent connections */
  connections: IStoreSchema;
  
  /** User preferences */
  preferences: IStoreSchema;
  
  /** Encryption keys */
  encryptionKeys: IStoreSchema;
}