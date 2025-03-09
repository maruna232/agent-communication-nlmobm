/**
 * SQLite Storage Adapter for AI Agent Network
 * 
 * This module implements a SQLite storage adapter using sql.js, providing
 * a comprehensive interface for storing, retrieving, and querying structured data
 * with support for encryption. It serves as an alternative to IndexedDB with
 * more powerful query capabilities while maintaining the local-first architecture
 * for maximum user privacy.
 */

import initSqlJs from 'sql.js'; // ^1.8.0
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
import { encryptObject, decryptObject, generateIV } from '../utils/encryption';
import { createStorageError } from '../utils/errorHandling';

// Default configuration values
export const DEFAULT_DB_NAME = 'ai_agent_network_sqlite.db';
export const DEFAULT_DB_VERSION = 1;

/**
 * Checks if SQLite (via sql.js) is supported in the current environment
 * @returns Promise resolving to true if SQLite is supported
 */
export async function checkSQLiteSupport(): Promise<boolean> {
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.close();
    return true;
  } catch (error) {
    console.warn('SQLite is not supported in this environment', error);
    return false;
  }
}

/**
 * Converts the storage schema to SQL CREATE TABLE statements
 * @param schema The database schema
 * @returns Array of SQL statements for creating tables and indexes
 */
function convertSchemaToSQL(schema: IStorageSchema): string[] {
  const statements: string[] = [];
  
  // Process each store in the schema
  for (const store of schema.stores) {
    // Create the table
    let createTableSQL = `CREATE TABLE IF NOT EXISTS ${store.name} (`;
    
    // Add the primary key column using the keyPath
    createTableSQL += `${store.keyPath} TEXT PRIMARY KEY`;
    
    // Add a data column for JSON storage
    createTableSQL += `, data TEXT`;
    
    // Add timestamp columns
    createTableSQL += `, created INTEGER, updated INTEGER`;
    
    // Close the statement
    createTableSQL += `)`;
    
    statements.push(createTableSQL);
    
    // Create indexes for efficient querying
    for (const index of store.indexes) {
      const indexName = `idx_${store.name}_${index.name}`;
      
      // Handle different types of indexes (single field or compound)
      let indexFields;
      if (typeof index.keyPath === 'string') {
        indexFields = index.keyPath;
      } else if (Array.isArray(index.keyPath)) {
        // SQLite doesn't have great support for JSON paths, so we'll
        // just index the primary key for now
        indexFields = store.keyPath;
      } else {
        indexFields = store.keyPath;
      }
      
      const indexSQL = `CREATE ${index.unique ? 'UNIQUE' : ''} INDEX IF NOT EXISTS ${indexName} ON ${store.name} (${indexFields})`;
      statements.push(indexSQL);
    }
  }
  
  return statements;
}

/**
 * Builds a SQL WHERE clause from a key range specification
 * @param keyPath The key path to query
 * @param range The key range specification
 * @returns Object containing the WHERE clause and parameters
 */
function buildWhereClause(keyPath: string, range?: IKeyRange): { clause: string, params: any[] } {
  if (!range) {
    return { clause: '', params: [] };
  }
  
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (range.lower !== undefined) {
    conditions.push(`${keyPath} ${range.lowerOpen ? '>' : '>='} ?`);
    params.push(range.lower);
  }
  
  if (range.upper !== undefined) {
    conditions.push(`${keyPath} ${range.upperOpen ? '<' : '<='} ?`);
    params.push(range.upper);
  }
  
  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return { clause, params };
}

/**
 * Builds a SQL ORDER BY clause from a direction specification
 * @param keyPath The key path to order by
 * @param direction The direction (next or prev)
 * @returns ORDER BY clause
 */
function buildOrderClause(keyPath: string, direction?: string): string {
  const sqlDirection = direction === 'prev' ? 'DESC' : 'ASC';
  return `ORDER BY ${keyPath} ${sqlDirection}`;
}

/**
 * Estimates the size of an object in bytes
 * @param obj The object to measure
 * @returns Estimated size in bytes
 */
function estimateObjectSize(obj: any): number {
  const json = JSON.stringify(obj);
  return new Blob([json]).size;
}

/**
 * Handles and standardizes SQLite errors
 * @param error The original error
 * @param operation The operation that was being performed
 * @returns Standardized error object
 */
function handleSQLiteError(error: Error, operation: string): Error {
  let errorCode = StorageErrorCode.INVALID_OPERATION;
  let message = `SQLite error during ${operation}: ${error.message}`;
  
  // Classify error based on error message content
  if (error.message.includes('no such table')) {
    errorCode = StorageErrorCode.SCHEMA_ERROR;
    message = `Table not found during ${operation}: ${error.message}`;
  } else if (error.message.includes('UNIQUE constraint failed')) {
    errorCode = StorageErrorCode.ALREADY_EXISTS;
    message = `Unique constraint violated during ${operation}: ${error.message}`;
  } else if (error.message.includes('quota') || error.message.includes('storage') || error.message.includes('full')) {
    errorCode = StorageErrorCode.QUOTA_EXCEEDED;
    message = `Storage quota exceeded during ${operation}: ${error.message}`;
  } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
    errorCode = StorageErrorCode.NOT_FOUND;
    message = `Record not found during ${operation}: ${error.message}`;
  }
  
  return createStorageError(message, errorCode, { operation, originalError: error });
}

/**
 * Class that implements the SQLite storage adapter for the AI Agent Network
 * Provides a comprehensive interface for storing, retrieving, and querying data locally
 */
export class SQLiteStorage {
  private dbName: string;
  private dbVersion: number;
  private db: any = null;
  private SQL: any = null;
  private schema: IStorageSchema | null = null;
  private encryptionLevel: StorageEncryptionLevel;
  private encryptionKey: string | null = null;
  private initialized: boolean = false;
  
  /**
   * Creates a new SQLiteStorage instance
   * @param options Configuration options
   */
  constructor(options: IStorageOptions) {
    this.dbName = options?.storageType === StorageType.SQLITE ? 
      options.dbName || DEFAULT_DB_NAME : DEFAULT_DB_NAME;
    this.dbVersion = options?.version || DEFAULT_DB_VERSION;
    this.encryptionLevel = options?.encryptionLevel || StorageEncryptionLevel.NONE;
  }
  
  /**
   * Initializes the database connection and schema
   * @param schema The database schema
   * @param encryptionKey Optional encryption key for data encryption
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(schema: IStorageSchema, encryptionKey?: string): Promise<boolean> {
    try {
      // Check if SQLite is supported
      const isSupported = await checkSQLiteSupport();
      if (!isSupported) {
        throw new Error('SQLite is not supported in this environment');
      }
      
      this.schema = schema;
      
      // Store the encryption key if provided
      if (encryptionKey) {
        this.encryptionKey = encryptionKey;
        this.encryptionLevel = StorageEncryptionLevel.STANDARD;
      }
      
      // Initialize SQL.js
      this.SQL = await initSqlJs();
      
      // Create a new database
      this.db = new this.SQL.Database();
      
      // Convert schema to SQL statements
      const statements = convertSchemaToSQL(schema);
      
      // Execute each statement
      for (const statement of statements) {
        this.db.exec(statement);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'initialize');
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
   * @param storeName The name of the store
   * @param item The item to create
   * @returns Promise resolving to the created item
   */
  async create(storeName: string, item: any): Promise<any> {
    try {
      this.checkInitialized();
      
      // Validate store name
      if (!this.schema?.stores.some(store => store.name === storeName)) {
        throw new Error(`Store '${storeName}' does not exist in the schema`);
      }
      
      // Find the store schema
      const storeSchema = this.schema.stores.find(store => store.name === storeName);
      if (!storeSchema) {
        throw new Error(`Store '${storeName}' not found in schema`);
      }
      
      // Generate an ID if not provided
      const keyPath = storeSchema.keyPath;
      if (!item[keyPath]) {
        item[keyPath] = uuidv4();
      }
      
      // Get the key
      const key = item[keyPath];
      
      // Create a copy of the item to avoid modifying the original
      const itemCopy = { ...item };
      
      // Add timestamps
      const now = Date.now();
      itemCopy.created = now;
      itemCopy.updated = now;
      
      // Encrypt data if needed
      let dataToStore: string;
      if (this.encryptionLevel !== StorageEncryptionLevel.NONE && this.encryptionKey) {
        const iv = generateIV();
        const encryptedData = encryptObject(itemCopy, this.encryptionKey, iv);
        dataToStore = JSON.stringify({ encrypted: true, data: encryptedData, iv });
      } else {
        dataToStore = JSON.stringify(itemCopy);
      }
      
      // Prepare statement
      const stmt = this.db.prepare(
        `INSERT INTO ${storeName} (${keyPath}, data, created, updated) VALUES (?, ?, ?, ?)`
      );
      
      // Execute statement
      stmt.run([key, dataToStore, now, now]);
      stmt.free();
      
      return itemCopy;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'create');
    }
  }
  
  /**
   * Retrieves an item from the specified store by its key
   * @param storeName The name of the store
   * @param key The key of the item to retrieve
   * @returns Promise resolving to the retrieved item or null if not found
   */
  async read(storeName: string, key: any): Promise<any> {
    try {
      this.checkInitialized();
      
      // Validate store name
      if (!this.schema?.stores.some(store => store.name === storeName)) {
        throw new Error(`Store '${storeName}' does not exist in the schema`);
      }
      
      // Find the store schema
      const storeSchema = this.schema.stores.find(store => store.name === storeName);
      if (!storeSchema) {
        throw new Error(`Store '${storeName}' not found in schema`);
      }
      
      const keyPath = storeSchema.keyPath;
      
      // Prepare statement
      const stmt = this.db.prepare(
        `SELECT data FROM ${storeName} WHERE ${keyPath} = ?`
      );
      
      // Execute statement
      stmt.bind([key]);
      const result = stmt.step();
      
      if (!result) {
        stmt.free();
        return null;
      }
      
      // Get data
      const row = stmt.getAsObject() as { data: string };
      stmt.free();
      
      // Parse data
      try {
        const parsedData = JSON.parse(row.data);
        
        // Check if data is encrypted
        if (parsedData.encrypted && this.encryptionKey) {
          // Decrypt data
          const decryptedData = decryptObject(parsedData.data, this.encryptionKey, parsedData.iv);
          return decryptedData;
        }
        
        return parsedData;
      } catch (error) {
        console.error('Error parsing data:', error);
        return null;
      }
    } catch (error) {
      throw handleSQLiteError(error as Error, 'read');
    }
  }
  
  /**
   * Updates an existing item in the specified store
   * @param storeName The name of the store
   * @param key The key of the item to update
   * @param item The updated item
   * @returns Promise resolving to the updated item
   */
  async update(storeName: string, key: any, item: any): Promise<any> {
    try {
      this.checkInitialized();
      
      // Validate store name
      if (!this.schema?.stores.some(store => store.name === storeName)) {
        throw new Error(`Store '${storeName}' does not exist in the schema`);
      }
      
      // Find the store schema
      const storeSchema = this.schema.stores.find(store => store.name === storeName);
      if (!storeSchema) {
        throw new Error(`Store '${storeName}' not found in schema`);
      }
      
      const keyPath = storeSchema.keyPath;
      
      // Ensure key is included in the item
      if (item[keyPath] !== key) {
        item[keyPath] = key;
      }
      
      // Create a copy of the item to avoid modifying the original
      const itemCopy = { ...item };
      
      // Update timestamp
      const now = Date.now();
      itemCopy.updated = now;
      
      // Preserve created timestamp if not present
      if (!itemCopy.created) {
        const existing = await this.read(storeName, key);
        if (existing && existing.created) {
          itemCopy.created = existing.created;
        } else {
          itemCopy.created = now;
        }
      }
      
      // Encrypt data if needed
      let dataToStore: string;
      if (this.encryptionLevel !== StorageEncryptionLevel.NONE && this.encryptionKey) {
        const iv = generateIV();
        const encryptedData = encryptObject(itemCopy, this.encryptionKey, iv);
        dataToStore = JSON.stringify({ encrypted: true, data: encryptedData, iv });
      } else {
        dataToStore = JSON.stringify(itemCopy);
      }
      
      // Prepare statement
      const stmt = this.db.prepare(
        `UPDATE ${storeName} SET data = ?, updated = ? WHERE ${keyPath} = ?`
      );
      
      // Execute statement
      stmt.run([dataToStore, now, key]);
      const changes = this.db.getRowsModified();
      stmt.free();
      
      if (changes === 0) {
        throw createStorageError(`Item with key '${key}' not found in store '${storeName}'`, StorageErrorCode.NOT_FOUND);
      }
      
      return itemCopy;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'update');
    }
  }
  
  /**
   * Deletes an item from the specified store by its key
   * @param storeName The name of the store
   * @param key The key of the item to delete
   * @returns Promise resolving to true if the item was deleted
   */
  async delete(storeName: string, key: any): Promise<boolean> {
    try {
      this.checkInitialized();
      
      // Validate store name
      if (!this.schema?.stores.some(store => store.name === storeName)) {
        throw new Error(`Store '${storeName}' does not exist in the schema`);
      }
      
      // Find the store schema
      const storeSchema = this.schema.stores.find(store => store.name === storeName);
      if (!storeSchema) {
        throw new Error(`Store '${storeName}' not found in schema`);
      }
      
      const keyPath = storeSchema.keyPath;
      
      // Prepare statement
      const stmt = this.db.prepare(
        `DELETE FROM ${storeName} WHERE ${keyPath} = ?`
      );
      
      // Execute statement
      stmt.run([key]);
      const changes = this.db.getRowsModified();
      stmt.free();
      
      if (changes === 0) {
        throw createStorageError(`Item with key '${key}' not found in store '${storeName}'`, StorageErrorCode.NOT_FOUND);
      }
      
      return true;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'delete');
    }
  }
  
  /**
   * Queries items from a store based on the provided query parameters
   * @param query The query parameters
   * @returns Promise resolving to an array of matching items
   */
  async query(query: IStorageQuery): Promise<any[]> {
    try {
      this.checkInitialized();
      
      const { storeName, indexName, range, direction, limit, offset, filter } = query;
      
      // Validate store name
      if (!this.schema?.stores.some(store => store.name === storeName)) {
        throw new Error(`Store '${storeName}' does not exist in the schema`);
      }
      
      // Find the store schema
      const storeSchema = this.schema.stores.find(store => store.name === storeName);
      if (!storeSchema) {
        throw new Error(`Store '${storeName}' not found in schema`);
      }
      
      // Determine which column to query
      let keyPath: string;
      if (indexName) {
        const index = storeSchema.indexes.find(idx => idx.name === indexName);
        if (!index) {
          throw new Error(`Index '${indexName}' not found in store '${storeName}'`);
        }
        // For simplicity, we'll only support string index paths in SQLite
        keyPath = typeof index.keyPath === 'string' ? index.keyPath : storeSchema.keyPath;
      } else {
        keyPath = storeSchema.keyPath;
      }
      
      // Build where clause from range
      const { clause: whereClause, params: whereParams } = buildWhereClause(keyPath, range);
      
      // Build order clause from direction
      const orderClause = buildOrderClause(keyPath, direction);
      
      // Add limit and offset
      const limitClause = limit !== undefined ? `LIMIT ${limit}` : '';
      const offsetClause = offset !== undefined ? `OFFSET ${offset}` : '';
      
      // Construct the full query
      const sql = `
        SELECT data FROM ${storeName}
        ${whereClause}
        ${orderClause}
        ${limitClause}
        ${offsetClause}
      `;
      
      // Prepare statement
      const stmt = this.db.prepare(sql);
      
      // Execute statement
      if (whereParams.length > 0) {
        stmt.bind(whereParams);
      }
      
      // Collect results
      const results: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as { data: string };
        
        try {
          // Parse data
          let parsedData = JSON.parse(row.data);
          
          // Check if data is encrypted
          if (parsedData.encrypted && this.encryptionKey) {
            // Decrypt data
            parsedData = decryptObject(parsedData.data, this.encryptionKey, parsedData.iv);
          }
          
          // Apply filter if provided
          if (!filter || filter(parsedData)) {
            results.push(parsedData);
          }
        } catch (error) {
          console.error('Error parsing data:', error);
        }
      }
      
      stmt.free();
      return results;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'query');
    }
  }
  
  /**
   * Executes multiple operations in a single transaction
   * @param operations Array of operations to execute
   * @returns Promise resolving to an array of operation results
   */
  async transaction(operations: IStorageOperation[]): Promise<any[]> {
    try {
      this.checkInitialized();
      
      // Start transaction
      this.db.exec('BEGIN TRANSACTION');
      
      const results: any[] = [];
      
      try {
        // Process each operation
        for (const operation of operations) {
          let result;
          
          switch (operation.type) {
            case StorageOperation.CREATE:
              result = await this.create(operation.storeName, operation.value!);
              break;
              
            case StorageOperation.READ:
              result = await this.read(operation.storeName, operation.key);
              break;
              
            case StorageOperation.UPDATE:
              result = await this.update(operation.storeName, operation.key!, operation.value!);
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
              throw new Error(`Unsupported operation type: ${operation.type}`);
          }
          
          results.push(result);
        }
        
        // Commit transaction
        this.db.exec('COMMIT');
        
        return results;
      } catch (error) {
        // Rollback transaction on error
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw handleSQLiteError(error as Error, 'transaction');
    }
  }
  
  /**
   * Clears all items from the specified store
   * @param storeName The name of the store to clear
   * @returns Promise resolving to true if the operation was successful
   */
  async clearStore(storeName: string): Promise<boolean> {
    try {
      this.checkInitialized();
      
      // Validate store name
      if (!this.schema?.stores.some(store => store.name === storeName)) {
        throw new Error(`Store '${storeName}' does not exist in the schema`);
      }
      
      // Prepare statement
      const stmt = this.db.prepare(`DELETE FROM ${storeName}`);
      
      // Execute statement
      stmt.run();
      stmt.free();
      
      return true;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'clearStore');
    }
  }
  
  /**
   * Clears all data from all stores in the database
   * @returns Promise resolving to true if the operation was successful
   */
  async clearAll(): Promise<boolean> {
    try {
      this.checkInitialized();
      
      // Start transaction
      this.db.exec('BEGIN TRANSACTION');
      
      try {
        // Clear each store
        for (const store of this.schema!.stores) {
          await this.clearStore(store.name);
        }
        
        // Commit transaction
        this.db.exec('COMMIT');
        
        return true;
      } catch (error) {
        // Rollback transaction on error
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw handleSQLiteError(error as Error, 'clearAll');
    }
  }
  
  /**
   * Creates a backup of all data in the database
   * @param userId The user ID to associate with the backup
   * @returns Promise resolving to the backup object
   */
  async backup(userId: string): Promise<IStorageBackup> {
    try {
      this.checkInitialized();
      
      // Validate userId
      if (!userId) {
        throw new Error('User ID is required for backup');
      }
      
      // Create backup object
      const backup: IStorageBackup = {
        id: uuidv4(),
        userId,
        timestamp: Date.now(),
        schemaVersion: this.schema!.version,
        data: {}
      };
      
      // Extract data from each store
      for (const store of this.schema!.stores) {
        // Prepare statement
        const stmt = this.db.prepare(`SELECT ${store.keyPath}, data FROM ${store.name}`);
        
        // Execute statement
        const results: any[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject() as { [key: string]: string };
          
          try {
            // Parse data
            let parsedData = JSON.parse(row.data);
            
            // Check if data is encrypted
            if (parsedData.encrypted && this.encryptionKey) {
              // Decrypt data
              parsedData = decryptObject(parsedData.data, this.encryptionKey, parsedData.iv);
            }
            
            results.push(parsedData);
          } catch (error) {
            console.error('Error parsing data during backup:', error);
          }
        }
        
        stmt.free();
        
        // Add data to backup
        backup.data[store.name] = results;
      }
      
      return backup;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'backup');
    }
  }
  
  /**
   * Restores the database from a backup
   * @param backup The backup object to restore from
   * @returns Promise resolving to true if the restore was successful
   */
  async restore(backup: IStorageBackup): Promise<boolean> {
    try {
      this.checkInitialized();
      
      // Validate backup
      if (!backup || !backup.data || !backup.userId) {
        throw new Error('Invalid backup object');
      }
      
      // Start transaction
      this.db.exec('BEGIN TRANSACTION');
      
      try {
        // Process each store in the backup
        for (const [storeName, items] of Object.entries(backup.data)) {
          // Validate store exists in schema
          if (!this.schema?.stores.some(store => store.name === storeName)) {
            console.warn(`Store '${storeName}' in backup not found in current schema, skipping`);
            continue;
          }
          
          // Clear existing data
          await this.clearStore(storeName);
          
          // Insert items
          for (const item of items) {
            await this.create(storeName, item);
          }
        }
        
        // Commit transaction
        this.db.exec('COMMIT');
        
        return true;
      } catch (error) {
        // Rollback transaction on error
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw handleSQLiteError(error as Error, 'restore');
    }
  }
  
  /**
   * Gets storage usage metrics for the database
   * @returns Promise resolving to the storage metrics
   */
  async getMetrics(): Promise<IStorageMetrics> {
    try {
      this.checkInitialized();
      
      const metrics: IStorageMetrics = {
        totalSize: 0,
        storeMetrics: {},
        lastUpdated: Date.now()
      };
      
      // Process each store
      for (const store of this.schema!.stores) {
        // Get item count
        const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${store.name}`);
        countStmt.step();
        const { count } = countStmt.getAsObject() as { count: number };
        countStmt.free();
        
        // Sample items to estimate size
        const sampleSize = Math.min(count, 10);
        let totalItemSize = 0;
        
        if (count > 0) {
          // Get a sample of items to estimate average size
          const sampleStmt = this.db.prepare(`SELECT data FROM ${store.name} LIMIT ${sampleSize}`);
          
          let sampleCount = 0;
          // Calculate size of sampled items
          while (sampleStmt.step()) {
            const row = sampleStmt.getAsObject() as { data: string };
            totalItemSize += row.data.length;
            sampleCount++;
          }
          
          sampleStmt.free();
        }
        
        // Calculate average item size
        const avgItemSize = count > 0 ? totalItemSize / Math.min(count, sampleSize) : 0;
        
        // Estimate total store size
        const estimatedSize = count * avgItemSize;
        
        // Add store metrics
        metrics.storeMetrics[store.name] = {
          count,
          size: Math.round(estimatedSize),
          avgItemSize: Math.round(avgItemSize)
        };
        
        // Add to total size
        metrics.totalSize += estimatedSize;
      }
      
      // Round total size to nearest integer
      metrics.totalSize = Math.round(metrics.totalSize);
      
      return metrics;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'getMetrics');
    }
  }
  
  /**
   * Checks if the database is initialized
   * @returns True if the database is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Sets the encryption key for data encryption/decryption
   * @param key The encryption key
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
    if (key) {
      this.encryptionLevel = StorageEncryptionLevel.STANDARD;
    } else {
      this.encryptionLevel = StorageEncryptionLevel.NONE;
    }
  }
  
  /**
   * Executes a raw SQL query on the database
   * @param sql The SQL query to execute
   * @param params The parameters for the query
   * @returns Promise resolving to the query results
   */
  async rawQuery(sql: string, params: any = {}): Promise<any[]> {
    try {
      this.checkInitialized();
      
      // Validate SQL
      if (!sql) {
        throw new Error('SQL query is required');
      }
      
      // Prepare statement
      const stmt = this.db.prepare(sql);
      
      // Execute statement with parameters
      if (params && typeof params === 'object') {
        stmt.bind(params);
      }
      
      // Collect results for SELECT queries
      const results: any[] = [];
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
      } else {
        // For non-SELECT queries, just execute and return affected rows
        stmt.run();
        results.push({ 
          rowsAffected: this.db.getRowsModified(),
          lastInsertRowid: this.db.exec("SELECT last_insert_rowid()")[0]?.values?.[0]?.[0]
        });
      }
      
      stmt.free();
      return results;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'rawQuery');
    }
  }
  
  /**
   * Exports the entire database to a file
   * @returns Promise resolving to the database file as a binary array
   */
  async exportToFile(): Promise<Uint8Array> {
    try {
      this.checkInitialized();
      
      // Export database to binary array
      return this.db.export();
    } catch (error) {
      throw handleSQLiteError(error as Error, 'exportToFile');
    }
  }
  
  /**
   * Imports a database from a file
   * @param data The database file as a binary array
   * @returns Promise resolving to true if the import was successful
   */
  async importFromFile(data: Uint8Array): Promise<boolean> {
    try {
      // Check if SQLite is supported
      const isSupported = await checkSQLiteSupport();
      if (!isSupported) {
        throw new Error('SQLite is not supported in this environment');
      }
      
      // Close existing database if open
      this.close();
      
      // Initialize SQL.js
      this.SQL = await initSqlJs();
      
      // Create database from file
      this.db = new this.SQL.Database(data);
      
      // Verify database structure
      // TODO: Check schema compatibility when importing
      try {
        // Query sqlite_master to check if tables exist
        const tables = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        if (!tables || tables.length === 0) {
          throw new Error('Invalid database file: no tables found');
        }
      } catch (error) {
        throw new Error(`Failed to verify database structure: ${(error as Error).message}`);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      throw handleSQLiteError(error as Error, 'importFromFile');
    }
  }
  
  /**
   * Checks if the database is initialized and throws an error if not
   * @private
   */
  private checkInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}