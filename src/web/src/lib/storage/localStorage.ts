/**
 * localStorage.ts
 * 
 * Implements a localStorage adapter for the AI Agent Network's storage system,
 * providing a simple key-value storage mechanism with encryption support.
 * This adapter serves as a fallback storage option when IndexedDB or SQLite are not available,
 * ensuring the application's local-first architecture can function across different browsers.
 */

import { 
  StorageEncryptionLevel, 
  IStorageMetrics 
} from '../types/storage.types';

import { 
  STORAGE_KEYS, 
  LOCAL_STORAGE_VERSION 
} from '../constants';

import { createStorageError } from '../utils/errorHandling';
import { 
  encryptWithPassword, 
  decryptWithPassword,
  encryptObject,
  decryptObject,
  validateEncryptionLevel
} from '../utils/encryption';

// Prefix for namespacing localStorage keys
export const STORAGE_PREFIX = 'ai_agent_network_';

/**
 * Checks if localStorage is available in the current browser environment
 * @returns True if localStorage is available, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = `${STORAGE_PREFIX}test`;
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Calculates the total size of data stored in localStorage
 * @returns Size in bytes
 */
function getStorageSize(): number {
  let size = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || '';
    const value = localStorage.getItem(key) || '';
    size += key.length + value.length;
  }
  return size;
}

/**
 * Gets all localStorage keys that start with a specific prefix
 * @param prefix Prefix to match keys against
 * @returns Array of matching keys
 */
function getKeysByPrefix(prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Adapter class that provides a consistent interface for using localStorage with encryption support
 */
export class LocalStorageAdapter {
  private initialized: boolean;
  private encryptionLevel: StorageEncryptionLevel;
  private encryptionKey: string | null;
  private version: string;

  /**
   * Creates a new LocalStorageAdapter instance
   */
  constructor() {
    this.initialized = false;
    this.encryptionLevel = StorageEncryptionLevel.NONE;
    this.encryptionKey = null;
    this.version = LOCAL_STORAGE_VERSION;
  }

  /**
   * Initializes the localStorage adapter with encryption settings
   * @param options Configuration options
   * @param encryptionKey Optional encryption key for securing stored data
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(
    options: { 
      encryptionLevel?: StorageEncryptionLevel, 
      version?: string 
    } = {},
    encryptionKey?: string
  ): Promise<boolean> {
    try {
      // Check if localStorage is available
      if (!isLocalStorageAvailable()) {
        throw new Error('localStorage is not available in this browser environment');
      }

      // Set encryption level and key
      this.encryptionLevel = options.encryptionLevel || StorageEncryptionLevel.NONE;
      if (encryptionKey) {
        this.encryptionKey = encryptionKey;
      }

      // Set version
      this.version = options.version || LOCAL_STORAGE_VERSION;

      // Mark as initialized
      this.initialized = true;
      
      return true;
    } catch (error) {
      throw createStorageError(
        `Failed to initialize localStorage adapter: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Stores a value in localStorage with optional encryption
   * @param key Storage key
   * @param value Value to store
   * @param encrypt Whether to encrypt the value (requires encryptionKey to be set)
   * @returns Promise that resolves when the operation is complete
   */
  async setItem(key: string, value: any, encrypt: boolean = false): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('LocalStorageAdapter must be initialized before use');
      }

      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      
      // Handle objects by converting to JSON
      let processedValue = value;
      if (typeof value === 'object') {
        processedValue = JSON.stringify(value);
      }

      // Encrypt if requested and encryption key is available
      if (encrypt && this.encryptionKey) {
        if (typeof value === 'object') {
          // Use specialized object encryption
          const iv = Math.random().toString(36).substring(2, 10);
          processedValue = encryptObject(value, this.encryptionKey, iv);
        } else {
          processedValue = encryptWithPassword(String(processedValue), this.encryptionKey);
        }
      }

      // Store in localStorage
      localStorage.setItem(prefixedKey, processedValue);
    } catch (error) {
      throw createStorageError(
        `Failed to store item in localStorage: ${(error as Error).message}`,
        { key, cause: error }
      );
    }
  }

  /**
   * Retrieves a value from localStorage with automatic decryption if needed
   * @param key Storage key
   * @param decrypt Whether to attempt decryption (requires encryptionKey to be set)
   * @param parseJson Whether to parse the value as JSON
   * @returns Promise resolving to the retrieved value
   */
  async getItem(key: string, decrypt: boolean = false, parseJson: boolean = false): Promise<any> {
    try {
      if (!this.initialized) {
        throw new Error('LocalStorageAdapter must be initialized before use');
      }

      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      const value = localStorage.getItem(prefixedKey);

      if (value === null) {
        return null;
      }

      let processedValue = value;

      // Decrypt if requested and encryption key is available
      if (decrypt && this.encryptionKey) {
        try {
          // Check if value is encrypted
          if (value.startsWith('{') && value.includes('"encryptedData"')) {
            // Try to decrypt with password
            processedValue = decryptWithPassword(value, this.encryptionKey);
          } else if (value.includes('{"iv":') || value.includes('{"ct":')) {
            // Handle object decryption
            const iv = Math.random().toString(36).substring(2, 10);
            processedValue = decryptObject(value, this.encryptionKey, iv);
          }
        } catch (decryptError) {
          // If decryption fails, return the original value
          processedValue = value;
        }
      }

      // Parse as JSON if requested
      if (parseJson) {
        try {
          return JSON.parse(processedValue);
        } catch (jsonError) {
          // If parsing fails, return the processed value as is
          return processedValue;
        }
      }

      return processedValue;
    } catch (error) {
      throw createStorageError(
        `Failed to get item from localStorage: ${(error as Error).message}`,
        { key, cause: error }
      );
    }
  }

  /**
   * Removes an item from localStorage
   * @param key Storage key
   * @returns Promise resolving to true if the item was removed
   */
  async removeItem(key: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        throw new Error('LocalStorageAdapter must be initialized before use');
      }

      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      localStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      throw createStorageError(
        `Failed to remove item from localStorage: ${(error as Error).message}`,
        { key, cause: error }
      );
    }
  }

  /**
   * Clears all items stored by this adapter (with the application prefix)
   * @returns Promise resolving to true if the operation was successful
   */
  async clear(): Promise<boolean> {
    try {
      if (!this.initialized) {
        throw new Error('LocalStorageAdapter must be initialized before use');
      }

      // Get all keys with the application prefix
      const keys = getKeysByPrefix(STORAGE_PREFIX);
      
      // Remove each key
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      
      return true;
    } catch (error) {
      throw createStorageError(
        `Failed to clear localStorage: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Gets all keys stored by this adapter (with the application prefix)
   * @returns Promise resolving to an array of keys (without the prefix)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      if (!this.initialized) {
        throw new Error('LocalStorageAdapter must be initialized before use');
      }

      // Get all keys with the application prefix
      const keys = getKeysByPrefix(STORAGE_PREFIX);
      
      // Remove the prefix from each key
      return keys.map(key => key.replace(STORAGE_PREFIX, ''));
    } catch (error) {
      throw createStorageError(
        `Failed to get all keys from localStorage: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Gets storage usage metrics for localStorage
   * @returns Promise resolving to storage metrics
   */
  async getMetrics(): Promise<IStorageMetrics> {
    try {
      if (!this.initialized) {
        throw new Error('LocalStorageAdapter must be initialized before use');
      }

      // Calculate total storage size
      const totalSize = getStorageSize();
      
      // Get all keys with the application prefix
      const keys = getKeysByPrefix(STORAGE_PREFIX);
      
      // Group keys by their store/category
      const storeMetrics: Record<string, { count: number, size: number }> = {};
      
      for (const key of keys) {
        // Extract the store from the key (e.g., user_profile, agent_config)
        const keyWithoutPrefix = key.replace(STORAGE_PREFIX, '');
        let store = 'other';
        
        // Try to match with known storage keys
        for (const storeKey in STORAGE_KEYS) {
          if (keyWithoutPrefix.startsWith(STORAGE_KEYS[storeKey as keyof typeof STORAGE_KEYS])) {
            store = STORAGE_KEYS[storeKey as keyof typeof STORAGE_KEYS];
            break;
          }
        }
        
        // Initialize store metrics if not already
        if (!storeMetrics[store]) {
          storeMetrics[store] = { count: 0, size: 0 };
        }
        
        // Increment count and add size
        storeMetrics[store].count += 1;
        
        const value = localStorage.getItem(key) || '';
        storeMetrics[store].size += key.length + value.length;
      }
      
      // Convert to the expected format
      const formattedMetrics: Record<string, { count: number, size: number, avgItemSize: number }> = {};
      
      for (const store in storeMetrics) {
        formattedMetrics[store] = {
          count: storeMetrics[store].count,
          size: storeMetrics[store].size,
          avgItemSize: storeMetrics[store].count > 0 
            ? Math.floor(storeMetrics[store].size / storeMetrics[store].count) 
            : 0
        };
      }
      
      return {
        totalSize,
        storeMetrics: formattedMetrics,
        lastUpdated: Date.now()
      };
    } catch (error) {
      throw createStorageError(
        `Failed to get storage metrics: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Sets the encryption key for data encryption/decryption
   * @param key Encryption key
   * @returns Promise that resolves when the key is set
   */
  async setEncryptionKey(key: string | null): Promise<void> {
    this.encryptionKey = key;
    this.encryptionLevel = key 
      ? StorageEncryptionLevel.STANDARD 
      : StorageEncryptionLevel.NONE;
  }

  /**
   * Checks if the adapter is initialized
   * @returns True if the adapter is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}