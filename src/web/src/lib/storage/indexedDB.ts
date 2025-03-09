/**
 * IndexedDB Storage Adapter
 * 
 * This module implements a browser IndexedDB adapter for the AI Agent Network's local-first
 * architecture. It provides comprehensive functionality for storing, retrieving, and querying
 * structured data with encryption support, ensuring user data remains on the client device
 * for maximum privacy.
 */

import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import {
  IStorageSchema,
  IStoreSchema,
  IStoreIndex,
  IStorageOptions,
  IStorageQuery,
  IKeyRange,
  IStorageOperation,
  IStorageBackup,
  IStorageMetrics,
  IStoreMetrics,
  StorageType,
  StorageOperation,
  StorageErrorCode,
  StorageEncryptionLevel
} from '../types/storage.types';

import { 
  encryptObject, 
  decryptObject, 
  generateIV 
} from '../utils/encryption';

import { createStorageError } from '../utils/errorHandling';

// Default database name and version
export const DEFAULT_DB_NAME = 'ai_agent_network_db';
export const DEFAULT_DB_VERSION = 1;

/**
 * Checks if IndexedDB is supported in the current environment
 * @returns Promise resolving to true if IndexedDB is supported
 */
export async function checkIndexedDBSupport(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      // Check if indexedDB is available
      if (!window.indexedDB) {
        resolve(false);
        return;
      }

      // Try to open a test database to confirm it works
      const request = window.indexedDB.open('indexeddb_test');
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.close();
        // Delete the test database
        window.indexedDB.deleteDatabase('indexeddb_test');
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Opens an IndexedDB database with the specified name and version
 * @param dbName Database name
 * @param version Database version
 * @returns Promise resolving to an IDBDatabase instance
 */
async function openDatabase(dbName: string, version: number): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = window.indexedDB.open(dbName, version);
      
      request.onerror = (event) => {
        reject(handleIndexedDBError(
          new Error(`Failed to open database: ${(event.target as IDBOpenDBRequest).error?.message}`),
          'open'
        ));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };
      
      request.onblocked = () => {
        reject(handleIndexedDBError(
          new Error('Database opening blocked. Please close other tabs with this application open.'),
          'open'
        ));
      };
    } catch (error) {
      reject(handleIndexedDBError(error as Error, 'open'));
    }
  });
}

/**
 * Creates object stores in the database based on the provided schema
 * @param db The database instance
 * @param schema The database schema
 */
function createObjectStores(db: IDBDatabase, schema: IStorageSchema): void {
  try {
    // For each store in the schema
    for (const store of schema.stores) {
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(store.name)) {
        const objectStore = db.createObjectStore(store.name, {
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement
        });
        
        // Create indexes
        for (const index of store.indexes) {
          objectStore.createIndex(index.name, index.keyPath, {
            unique: index.unique,
            multiEntry: index.multiEntry
          });
        }
      }
    }
  } catch (error) {
    throw handleIndexedDBError(error as Error, 'createObjectStores');
  }
}

/**
 * Creates an IDBKeyRange from the provided range specification
 * @param range The key range specification
 * @returns An IDBKeyRange instance or null if invalid
 */
function createKeyRange(range?: IKeyRange): IDBKeyRange | null {
  if (!range) return null;
  
  try {
    if (range.lower !== undefined && range.upper !== undefined) {
      return IDBKeyRange.bound(
        range.lower,
        range.upper,
        range.lowerOpen || false,
        range.upperOpen || false
      );
    } else if (range.lower !== undefined) {
      return IDBKeyRange.lowerBound(range.lower, range.lowerOpen || false);
    } else if (range.upper !== undefined) {
      return IDBKeyRange.upperBound(range.upper, range.upperOpen || false);
    }
  } catch (error) {
    console.warn('Invalid key range:', error);
  }
  
  return null;
}

/**
 * Estimates the size of an object in bytes
 * @param obj The object to measure
 * @returns Estimated size in bytes
 */
function estimateObjectSize(obj: any): number {
  try {
    const json = JSON.stringify(obj);
    // Approximate size in bytes (2 bytes per character for UTF-16)
    return json.length * 2;
  } catch (error) {
    return 0;
  }
}

/**
 * Standardizes and transforms IndexedDB errors into application-specific errors
 * @param error The original error
 * @param operation The operation that triggered the error
 * @returns A standardized error object
 */
function handleIndexedDBError(error: Error, operation: string): Error {
  let code = StorageErrorCode.INVALID_OPERATION;
  const errorName = error.name;
  const errorMessage = error.message || 'Unknown IndexedDB error';
  
  // Map standard IndexedDB error names to our error codes
  if (errorName === 'ConstraintError') {
    code = StorageErrorCode.ALREADY_EXISTS;
  } else if (errorName === 'QuotaExceededError') {
    code = StorageErrorCode.QUOTA_EXCEEDED;
  } else if (errorName === 'NotFoundError') {
    code = StorageErrorCode.NOT_FOUND;
  } else if (errorName === 'VersionError' || errorName === 'InvalidStateError') {
    code = StorageErrorCode.SCHEMA_ERROR;
  }
  
  return createStorageError(
    `IndexedDB error during ${operation}: ${errorMessage}`,
    code,
    { originalError: error }
  );
}

/**
 * IndexedDB implementation of the storage interface for local-first data persistence
 */
export class IndexedDBStorage {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;
  private schema: IStorageSchema | null = null;
  private encryptionLevel: StorageEncryptionLevel = StorageEncryptionLevel.NONE;
  private encryptionKey: string | null = null;
  private initialized: boolean = false;

  /**
   * Creates a new IndexedDBStorage instance
   * @param options Configuration options
   */
  constructor(options?: IStorageOptions) {
    this.dbName = options?.storageType === StorageType.INDEXED_DB ? 
      options.version?.toString() || DEFAULT_DB_NAME : 
      DEFAULT_DB_NAME;
    
    this.dbVersion = options?.version || DEFAULT_DB_VERSION;
    this.encryptionLevel = options?.encryptionLevel || StorageEncryptionLevel.NONE;
  }

  /**
   * Initializes the database with the given schema and encryption key
   * @param schema The database schema
   * @param encryptionKey Optional encryption key for data encryption
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(schema: IStorageSchema, encryptionKey?: string): Promise<boolean> {
    try {
      // Check if IndexedDB is supported
      const isSupported = await checkIndexedDBSupport();
      if (!isSupported) {
        throw new Error('IndexedDB is not supported in this environment');
      }
      
      // Store the schema and encryption key
      this.schema = schema;
      if (encryptionKey) {
        this.setEncryptionKey(encryptionKey);
      }
      
      // Open the database
      return new Promise<boolean>((resolve, reject) => {
        const request = window.indexedDB.open(this.dbName, this.dbVersion);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          createObjectStores(db, schema);
        };
        
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.initialized = true;
          resolve(true);
        };
        
        request.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Failed to initialize database: ${(event.target as IDBOpenDBRequest).error?.message}`),
            'initialize'
          ));
        };
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'initialize');
    }
  }

  /**
   * Closes the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
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
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!storeName || !item) {
      throw createStorageError(
        'Store name and item are required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      // Generate an ID if none exists
      const newItem = { ...item };
      if (!newItem.id) {
        newItem.id = uuidv4();
      }
      
      // Encrypt the item if needed
      let dataToStore = newItem;
      if (this.encryptionLevel !== StorageEncryptionLevel.NONE && this.encryptionKey) {
        const iv = generateIV();
        dataToStore = {
          id: newItem.id,
          encryptedData: encryptObject(newItem, this.encryptionKey, iv),
          iv,
          __encrypted: true
        };
      }
      
      return new Promise<any>((resolve, reject) => {
        if (!this.db) {
          reject(createStorageError(
            'Database not initialized',
            StorageErrorCode.INVALID_OPERATION
          ));
          return;
        }
        
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.add(dataToStore);
        
        request.onsuccess = () => {
          resolve(newItem);
        };
        
        request.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Failed to create item: ${(event.target as IDBRequest).error?.message}`),
            'create'
          ));
        };
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'create');
    }
  }

  /**
   * Reads an item from the specified store by its key
   * @param storeName The store to read from
   * @param key The key of the item to read
   * @returns Promise resolving to the item or null if not found
   */
  async read(storeName: string, key: any): Promise<any> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!storeName || key === undefined) {
      throw createStorageError(
        'Store name and key are required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      return new Promise<any>((resolve, reject) => {
        if (!this.db) {
          reject(createStorageError(
            'Database not initialized',
            StorageErrorCode.INVALID_OPERATION
          ));
          return;
        }
        
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.get(key);
        
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest).result;
          
          if (!result) {
            resolve(null);
            return;
          }
          
          // Decrypt if necessary
          if (result.__encrypted && this.encryptionKey) {
            try {
              const decrypted = decryptObject(result.encryptedData, this.encryptionKey, result.iv);
              resolve(decrypted);
            } catch (error) {
              reject(handleIndexedDBError(
                new Error(`Failed to decrypt item: ${(error as Error).message}`),
                'read'
              ));
            }
          } else {
            resolve(result);
          }
        };
        
        request.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Failed to read item: ${(event.target as IDBRequest).error?.message}`),
            'read'
          ));
        };
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'read');
    }
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
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!storeName || key === undefined || !item) {
      throw createStorageError(
        'Store name, key, and item are required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      // Ensure the key is in the item
      const updateItem = { ...item };
      if (key !== undefined) {
        const keyPath = this.schema?.stores.find(s => s.name === storeName)?.keyPath || 'id';
        updateItem[keyPath] = key;
      }
      
      // Encrypt the item if needed
      let dataToStore = updateItem;
      if (this.encryptionLevel !== StorageEncryptionLevel.NONE && this.encryptionKey) {
        const iv = generateIV();
        dataToStore = {
          id: key,
          encryptedData: encryptObject(updateItem, this.encryptionKey, iv),
          iv,
          __encrypted: true
        };
      }
      
      return new Promise<any>((resolve, reject) => {
        if (!this.db) {
          reject(createStorageError(
            'Database not initialized',
            StorageErrorCode.INVALID_OPERATION
          ));
          return;
        }
        
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.put(dataToStore);
        
        request.onsuccess = () => {
          resolve(updateItem);
        };
        
        request.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Failed to update item: ${(event.target as IDBRequest).error?.message}`),
            'update'
          ));
        };
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'update');
    }
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
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!storeName || key === undefined) {
      throw createStorageError(
        'Store name and key are required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      return new Promise<boolean>((resolve, reject) => {
        if (!this.db) {
          reject(createStorageError(
            'Database not initialized',
            StorageErrorCode.INVALID_OPERATION
          ));
          return;
        }
        
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.delete(key);
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Failed to delete item: ${(event.target as IDBRequest).error?.message}`),
            'delete'
          ));
        };
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'delete');
    }
  }

  /**
   * Queries items from a store based on the provided query parameters
   * @param query The query parameters
   * @returns Promise resolving to an array of matching items
   */
  async query(query: IStorageQuery): Promise<any[]> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!query.storeName) {
      throw createStorageError(
        'Store name is required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      return new Promise<any[]>((resolve, reject) => {
        if (!this.db) {
          reject(createStorageError(
            'Database not initialized',
            StorageErrorCode.INVALID_OPERATION
          ));
          return;
        }
        
        const transaction = this.db.transaction([query.storeName], 'readonly');
        const store = transaction.objectStore(query.storeName);
        
        let source: IDBObjectStore | IDBIndex = store;
        if (query.indexName) {
          source = store.index(query.indexName);
        }
        
        const keyRange = createKeyRange(query.range);
        const direction = query.direction || 'next';
        
        // Use cursor for advanced filtering, sorting, and pagination
        const results: any[] = [];
        let skipCount = 0;
        let resultCount = 0;
        
        const request = source.openCursor(keyRange, direction);
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          
          if (cursor) {
            // Handle offset (skip records)
            if (query.offset && skipCount < query.offset) {
              skipCount++;
              cursor.continue();
              return;
            }
            
            // Handle limit
            if (query.limit && resultCount >= query.limit) {
              resolve(results);
              return;
            }
            
            const value = cursor.value;
            
            // Decrypt if necessary
            let item = value;
            if (value.__encrypted && this.encryptionKey) {
              try {
                item = decryptObject(value.encryptedData, this.encryptionKey, value.iv);
              } catch (error) {
                console.error('Failed to decrypt item during query:', error);
                // Skip this item but continue processing
                cursor.continue();
                return;
              }
            }
            
            // Apply custom filter if provided
            if (!query.filter || query.filter(item)) {
              results.push(item);
              resultCount++;
            }
            
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        
        request.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Failed to query items: ${(event.target as IDBRequest).error?.message}`),
            'query'
          ));
        };
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'query');
    }
  }

  /**
   * Executes multiple operations in a single transaction
   * @param operations Array of operations to execute
   * @returns Promise resolving to an array of operation results
   */
  async transaction(operations: IStorageOperation[]): Promise<any[]> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!operations || !operations.length) {
      throw createStorageError(
        'Operations are required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      // Get all stores involved in the transaction
      const storeNames = [...new Set(operations.map(op => op.storeName))];
      
      return new Promise<any[]>((resolve, reject) => {
        if (!this.db) {
          reject(createStorageError(
            'Database not initialized',
            StorageErrorCode.INVALID_OPERATION
          ));
          return;
        }
        
        const transaction = this.db.transaction(storeNames, 'readwrite');
        const results: any[] = [];
        
        // Set up error handling for the transaction
        transaction.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Transaction failed: ${(event.target as IDBTransaction).error?.message}`),
            'transaction'
          ));
        };
        
        transaction.onabort = (event) => {
          reject(handleIndexedDBError(
            new Error(`Transaction aborted: ${(event.target as IDBTransaction).error?.message}`),
            'transaction'
          ));
        };
        
        // Process each operation sequentially
        const processOperation = async (index: number) => {
          if (index >= operations.length) {
            resolve(results);
            return;
          }
          
          const operation = operations[index];
          let result: any;
          
          try {
            switch (operation.type) {
              case StorageOperation.CREATE:
                result = await this.create(operation.storeName, operation.value);
                break;
              case StorageOperation.READ:
                result = await this.read(operation.storeName, operation.key);
                break;
              case StorageOperation.UPDATE:
                result = await this.update(operation.storeName, operation.key, operation.value);
                break;
              case StorageOperation.DELETE:
                result = await this.delete(operation.storeName, operation.key);
                break;
              case StorageOperation.QUERY:
                if (!operation.query) {
                  throw new Error('Query parameters required for QUERY operation');
                }
                result = await this.query(operation.query);
                break;
              default:
                throw new Error(`Unknown operation type: ${operation.type}`);
            }
            
            results.push(result);
            processOperation(index + 1);
          } catch (error) {
            reject(error);
          }
        };
        
        processOperation(0);
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'transaction');
    }
  }

  /**
   * Clears all items from the specified store
   * @param storeName The store to clear
   * @returns Promise resolving to true if the store was cleared
   */
  async clearStore(storeName: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!storeName) {
      throw createStorageError(
        'Store name is required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      return new Promise<boolean>((resolve, reject) => {
        if (!this.db) {
          reject(createStorageError(
            'Database not initialized',
            StorageErrorCode.INVALID_OPERATION
          ));
          return;
        }
        
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = (event) => {
          reject(handleIndexedDBError(
            new Error(`Failed to clear store: ${(event.target as IDBRequest).error?.message}`),
            'clearStore'
          ));
        };
      });
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'clearStore');
    }
  }

  /**
   * Clears all data from all stores in the database
   * @returns Promise resolving to true if all stores were cleared
   */
  async clearAll(): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      const storeNames = await this.getStoreNames();
      
      // Clear each store
      for (const storeName of storeNames) {
        await this.clearStore(storeName);
      }
      
      return true;
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'clearAll');
    }
  }

  /**
   * Creates a backup of all data in the database
   * @param userId The user identifier for the backup
   * @returns Promise resolving to the backup object
   */
  async backup(userId: string): Promise<IStorageBackup> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!userId) {
      throw createStorageError(
        'User ID is required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      const storeNames = await this.getStoreNames();
      const data: Record<string, any[]> = {};
      
      // Retrieve all data from each store
      for (const storeName of storeNames) {
        const items = await this.query({
          storeName
        });
        
        // If using encryption, ensure we're storing the decrypted data in the backup
        data[storeName] = items.map(item => {
          if (item.__encrypted && this.encryptionKey) {
            // Items should already be decrypted by the query method
            delete item.__encrypted;
            delete item.encryptedData;
            delete item.iv;
          }
          return item;
        });
      }
      
      const backup: IStorageBackup = {
        id: uuidv4(),
        userId,
        timestamp: Date.now(),
        schemaVersion: this.schema?.version || this.dbVersion,
        data
      };
      
      return backup;
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'backup');
    }
  }

  /**
   * Restores the database from a backup
   * @param backup The backup to restore from
   * @returns Promise resolving to true if the restore was successful
   */
  async restore(backup: IStorageBackup): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    if (!backup || !backup.data || !backup.userId) {
      throw createStorageError(
        'Valid backup object is required',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      const storeNames = Object.keys(backup.data);
      
      // Clear and restore each store
      for (const storeName of storeNames) {
        // Skip stores that don't exist in the current schema
        if (!this.db?.objectStoreNames.contains(storeName)) {
          console.warn(`Store "${storeName}" from backup not found in current schema. Skipping.`);
          continue;
        }
        
        // Clear existing data
        await this.clearStore(storeName);
        
        // Insert backup data
        const items = backup.data[storeName];
        if (items && items.length) {
          for (const item of items) {
            await this.create(storeName, item);
          }
        }
      }
      
      return true;
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'restore');
    }
  }

  /**
   * Gets storage usage metrics for the database
   * @returns Promise resolving to the storage metrics
   */
  async getMetrics(): Promise<IStorageMetrics> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      const storeNames = await this.getStoreNames();
      const storeMetrics: Record<string, IStoreMetrics> = {};
      let totalSize = 0;
      
      // Calculate metrics for each store
      for (const storeName of storeNames) {
        const items = await this.query({
          storeName
        });
        
        // Calculate size by sampling items
        const samplingSize = Math.min(items.length, 50); // Sample up to 50 items
        let totalSampleSize = 0;
        
        if (samplingSize > 0) {
          // Take samples evenly distributed through the result set
          const samplingInterval = Math.max(1, Math.floor(items.length / samplingSize));
          const samples = [];
          
          for (let i = 0; i < items.length && samples.length < samplingSize; i += samplingInterval) {
            samples.push(items[i]);
          }
          
          // Calculate total size of samples
          for (const sample of samples) {
            totalSampleSize += estimateObjectSize(sample);
          }
          
          // Extrapolate to estimate total store size
          const avgItemSize = samples.length > 0 ? totalSampleSize / samples.length : 0;
          const estimatedStoreSize = avgItemSize * items.length;
          
          storeMetrics[storeName] = {
            count: items.length,
            size: estimatedStoreSize,
            avgItemSize
          };
          
          totalSize += estimatedStoreSize;
        } else {
          storeMetrics[storeName] = {
            count: 0,
            size: 0,
            avgItemSize: 0
          };
        }
      }
      
      return {
        totalSize,
        storeMetrics,
        lastUpdated: Date.now()
      };
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'getMetrics');
    }
  }

  /**
   * Checks if the database is initialized
   * @returns True if the database is initialized
   */
  isInitialized(): boolean {
    return this.initialized && !!this.db;
  }

  /**
   * Sets the encryption key for data encryption/decryption
   * @param key The encryption key
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
    
    // Update encryption level based on key
    if (key) {
      this.encryptionLevel = key.length >= 32 ? 
        StorageEncryptionLevel.HIGH : 
        StorageEncryptionLevel.STANDARD;
    } else {
      this.encryptionLevel = StorageEncryptionLevel.NONE;
    }
  }

  /**
   * Gets the names of all object stores in the database
   * @returns Promise resolving to an array of store names
   */
  async getStoreNames(): Promise<string[]> {
    if (!this.isInitialized()) {
      throw createStorageError(
        'Database not initialized',
        StorageErrorCode.INVALID_OPERATION
      );
    }
    
    try {
      if (!this.db) {
        throw createStorageError(
          'Database not initialized',
          StorageErrorCode.INVALID_OPERATION
        );
      }
      
      // Convert from DOMStringList to string array
      return Array.from(this.db.objectStoreNames);
    } catch (error) {
      throw handleIndexedDBError(error as Error, 'getStoreNames');
    }
  }
}