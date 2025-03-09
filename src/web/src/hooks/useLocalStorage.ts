/**
 * Custom React hook for interacting with browser localStorage with encryption support.
 * Provides a simple interface for storing, retrieving, and removing data with
 * optional encryption, JSON parsing, and comprehensive error handling.
 * 
 * This hook is part of the AI Agent Network's local-first architecture,
 * ensuring user data remains on the client device with appropriate security.
 */

import { useState, useEffect, useCallback } from 'react';
import { StorageEncryptionLevel } from '../lib/types/storage.types';
import { STORAGE_KEYS } from '../lib/constants';
import { createStorageError } from '../lib/utils/errorHandling';
import { encryptWithPassword, decryptWithPassword } from '../lib/utils/encryption';
import { isLocalStorageAvailable } from '../lib/storage/localStorage';

/**
 * Options for customizing localStorage behavior
 */
export interface UseLocalStorageOptions {
  /** Whether to encrypt stored data */
  encrypt?: boolean;
  /** Key used for encryption (required if encrypt is true) */
  encryptionKey?: string;
  /** Level of encryption to use */
  encryptionLevel?: StorageEncryptionLevel;
  /** Whether to parse/stringify JSON automatically */
  parseJson?: boolean;
}

/**
 * Hook for managing localStorage with encryption support
 * 
 * @param key - Storage key to use
 * @param initialValue - Default value if no item exists in storage
 * @param options - Configuration options for storage behavior
 * @returns Tuple containing [storedValue, setValue, removeValue, error]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
): [T, (value: T) => void, () => void, Error | null] {
  // Check if localStorage is available in this browser environment
  const storageAvailable = isLocalStorageAvailable();
  
  // State for stored value and any errors that occur
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [error, setError] = useState<Error | null>(null);
  
  // Parse options with defaults
  const {
    encrypt = false,
    encryptionKey = '',
    encryptionLevel = StorageEncryptionLevel.NONE,
    parseJson = true
  } = options;

  /**
   * Safely parses a value from localStorage with optional decryption
   */
  const safelyParseValue = useCallback((value: string | null): T => {
    if (value === null) {
      return initialValue;
    }

    try {
      // Handle encrypted values
      let processedValue = value;
      if (encrypt && encryptionKey) {
        try {
          processedValue = decryptWithPassword(value, encryptionKey);
        } catch (e) {
          console.error('Failed to decrypt localStorage value:', e);
          return initialValue;
        }
      }

      // Parse JSON if needed
      if (parseJson) {
        try {
          return JSON.parse(processedValue);
        } catch (e) {
          // If JSON parsing fails, return the raw value or initial value
          return (typeof initialValue === typeof processedValue) 
            ? (processedValue as unknown as T) 
            : initialValue;
        }
      }

      return processedValue as unknown as T;
    } catch (e) {
      // If any unexpected error occurs, return the initial value
      console.error('Error parsing localStorage value:', e);
      return initialValue;
    }
  }, [encrypt, encryptionKey, initialValue, parseJson]);

  /**
   * Safely stringifies a value for localStorage with optional encryption
   */
  const safelyStringifyValue = useCallback((value: T): string => {
    try {
      // Convert to string or JSON string as needed
      let processedValue: string;
      if (parseJson && typeof value === 'object') {
        processedValue = JSON.stringify(value);
      } else {
        processedValue = String(value);
      }

      // Encrypt if needed
      if (encrypt && encryptionKey) {
        if (encryptionLevel === StorageEncryptionLevel.NONE) {
          console.warn('Encryption requested but encryption level is NONE');
        }
        
        return encryptWithPassword(processedValue, encryptionKey);
      }

      return processedValue;
    } catch (e) {
      // If stringification fails, return a string representation
      console.error('Error stringifying localStorage value:', e);
      return String(value);
    }
  }, [encrypt, encryptionKey, encryptionLevel, parseJson]);

  /**
   * Gets the current value from localStorage
   */
  const getValue = useCallback((): T => {
    if (!storageAvailable) {
      setError(createStorageError('localStorage is not available', { feature: 'useLocalStorage' }));
      return initialValue;
    }

    try {
      const item = localStorage.getItem(key);
      return safelyParseValue(item);
    } catch (e) {
      const storageError = createStorageError(
        `Error retrieving localStorage item: ${(e as Error).message}`, 
        { key, cause: e }
      );
      setError(storageError);
      return initialValue;
    }
  }, [initialValue, key, safelyParseValue, storageAvailable]);

  /**
   * Sets a value in localStorage with optional encryption
   */
  const setValue = useCallback((value: T): void => {
    try {
      if (!storageAvailable) {
        throw new Error('localStorage is not available');
      }

      // Update localStorage
      const stringValue = safelyStringifyValue(value);
      localStorage.setItem(key, stringValue);

      // Update state
      setStoredValue(value);
      setError(null);
    } catch (e) {
      const storageError = createStorageError(
        `Error setting localStorage item: ${(e as Error).message}`, 
        { key, cause: e }
      );
      setError(storageError);
    }
  }, [key, safelyStringifyValue, storageAvailable]);

  /**
   * Removes a value from localStorage
   */
  const removeValue = useCallback((): void => {
    try {
      if (!storageAvailable) {
        throw new Error('localStorage is not available');
      }

      // Remove from localStorage
      localStorage.removeItem(key);

      // Reset to initial value
      setStoredValue(initialValue);
      setError(null);
    } catch (e) {
      const storageError = createStorageError(
        `Error removing localStorage item: ${(e as Error).message}`, 
        { key, cause: e }
      );
      setError(storageError);
    }
  }, [initialValue, key, storageAvailable]);

  // Initialize value from localStorage on mount or when key changes
  useEffect(() => {
    if (storageAvailable) {
      const value = getValue();
      setStoredValue(value);
    }
  }, [getValue, key, storageAvailable]);

  // Return the stored value, setter, remover, and any error
  return [storedValue, setValue, removeValue, error];
}